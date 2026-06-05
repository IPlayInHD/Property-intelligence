import { Router } from "express";
import { db } from "@workspace/db";
import { analysesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { checkAnalysisLimit } from "../middleware/tierAccess";
import { runAnalysis, type PropertyInput } from "../services/analysisEngine";
import PDFDocument from "pdfkit";

const router = Router();

// POST /analysis — create new analysis
router.post("/analysis", requireAuth, checkAnalysisLimit, async (req: AuthRequest, res) => {
  try {
    const property = req.body as PropertyInput;
    const userId = req.user!.id;

    if (!property.community || !property.emirate || !property.propertyType || !property.sizeSqft || property.listedPrice === undefined) {
      res.status(400).json({ error: "Missing required property fields" });
      return;
    }

    const [analysis] = await db.insert(analysesTable).values({
      userId,
      propertyData: property as unknown as Record<string, unknown>,
      status: "pending",
    }).returning();

    // Increment usage counter
    await db.update(usersTable)
      .set({ analysesUsedThisMonth: (req.user!.analysesUsedThisMonth) + 1 })
      .where(eq(usersTable.id, userId));

    // Run analysis asynchronously (don't await)
    setImmediate(() => {
      runAnalysis(analysis.id, property, req.user!.plan).catch((e) =>
        console.error("Background analysis failed:", e)
      );
    });

    res.status(201).json({
      id: analysis.id,
      userId: analysis.userId,
      propertyData: analysis.propertyData,
      results: analysis.results,
      status: analysis.status,
      overallScore: analysis.overallScore ? parseFloat(String(analysis.overallScore)) : null,
      createdAt: analysis.createdAt,
    });
  } catch (err) {
    console.error("Create analysis error:", err);
    res.status(500).json({ error: "Failed to create analysis" });
  }
});

// GET /analysis/history
router.get("/analysis/history", requireAuth, async (req: AuthRequest, res) => {

  try {
    const rows = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.userId, req.user!.id))
      .orderBy(desc(analysesTable.createdAt))
      .limit(50);

    const summaries = rows.map((r) => {
      const pd = r.propertyData as PropertyInput;
      return {
        id: r.id,
        community: pd.community,
        emirate: pd.emirate,
        propertyType: pd.propertyType,
        bedrooms: pd.bedrooms,
        listedPrice: pd.listedPrice,
        overallScore: r.overallScore ? parseFloat(String(r.overallScore)) : null,
        status: r.status,
        createdAt: r.createdAt,
      };
    });

    res.json(summaries);
  } catch (err) {
    console.error("Analysis history error:", err);
    res.status(500).json({ error: "Failed to fetch analysis history" });
  }
});

// GET /analysis/:id
router.get("/analysis/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, String(req.params.id)), eq(analysesTable.userId, req.user!.id)))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const r = rows[0];
    res.json({
      id: r.id,
      userId: r.userId,
      propertyData: r.propertyData,
      results: r.results,
      status: r.status,
      overallScore: r.overallScore ? parseFloat(String(r.overallScore)) : null,
      createdAt: r.createdAt,
    });
  } catch (err) {
    console.error("Get analysis error:", err);
    res.status(500).json({ error: "Failed to fetch analysis" });
  }
});

// DELETE /analysis/:id
router.delete("/analysis/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, String(req.params.id)), eq(analysesTable.userId, req.user!.id)))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    await db.delete(analysesTable).where(eq(analysesTable.id, String(req.params.id)));
    res.json({ success: true, message: "Analysis deleted" });
  } catch (err) {
    console.error("Delete analysis error:", err);
    res.status(500).json({ error: "Failed to delete analysis" });
  }
});

// GET /analysis/:id/report — PDF download
router.get("/analysis/:id/report", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, String(req.params.id)), eq(analysesTable.userId, req.user!.id)))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const analysis = rows[0];
    const pd = analysis.propertyData as PropertyInput;
    const results = analysis.results as Record<string, unknown>;
    const isPro = req.user!.plan === "pro";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="propiq-report-${analysis.id.slice(0, 8)}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor("#0A8A8A").text("PropIQ Intelligence Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#333").text(`Generated: ${new Date().toLocaleDateString("en-AE")}`, { align: "center" });
    doc.moveDown();

    // Property Summary
    doc.fontSize(16).fillColor("#0A1628").text("Property Summary");
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#C8960C");
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#333");
    doc.text(`Community: ${pd.community}, ${pd.emirate}`);
    doc.text(`Type: ${pd.propertyType} | Bedrooms: ${pd.bedrooms} | Size: ${pd.sizeSqft.toLocaleString()} sqft`);
    doc.text(`Listed Price: AED ${pd.listedPrice.toLocaleString()}`);
    doc.text(`Price per sqft: AED ${Math.round(pd.listedPrice / pd.sizeSqft).toLocaleString()}`);
    if (analysis.overallScore) {
      doc.text(`PropIQ Intelligence Score: ${analysis.overallScore}/100`);
    }
    doc.moveDown();

    // Module results
    if (results?.priceFairness) {
      const pf = results.priceFairness as Record<string, unknown>;
      doc.fontSize(14).fillColor("#0A8A8A").text("Module 1 — Price Fairness Index");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#C8960C").moveDown(0.3);
      doc.fontSize(11).fillColor("#333");
      doc.text(`Verdict: ${pf.verdict} (${(pf.fairnessScore as number) > 0 ? "+" : ""}${pf.fairnessScore}%)`);
      doc.text(`Listed: AED ${(pf.listedPsf as number).toLocaleString()}/sqft | Benchmark: AED ${(pf.adjustedBenchmarkPsf as number).toLocaleString()}/sqft`);
      doc.moveDown();
    }

    if (results?.qolScore) {
      const qol = results.qolScore as Record<string, unknown>;
      doc.fontSize(14).fillColor("#0A8A8A").text("Module 2 — Quality of Life Score");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#C8960C").moveDown(0.3);
      doc.fontSize(11).fillColor("#333");
      doc.text(`Overall QoL Score: ${qol.totalScore}/100`);
      doc.text(`Transport: ${qol.transportScore}/20 | Education: ${qol.educationScore}/20 | Healthcare: ${qol.healthcareScore}/20`);
      doc.text(`Retail: ${qol.retailScore}/20 | Recreation: ${qol.recreationScore}/20 | Noise: ${qol.noiseScore}/20`);
      doc.moveDown();
    }

    if (results?.rentalYield) {
      const ry = results.rentalYield as Record<string, unknown>;
      doc.fontSize(14).fillColor("#0A8A8A").text("Module 5 — True Rental Yield");
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#C8960C").moveDown(0.3);
      doc.fontSize(11).fillColor("#333");
      doc.text(`Gross Yield: ${ry.grossYield}% | Net Yield: ${ry.netYield}%`);
      doc.text(`Market Rent: AED ${(ry.marketRentAnnual as number).toLocaleString()}/yr`);
      doc.text(`Net Income: AED ${(ry.netIncome as number).toLocaleString()}/yr`);
      doc.moveDown();
    }

    // Footer / Disclaimer
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#666");
    if (!isPro) {
      doc.text("Generated by PropIQ — propiq.ae", { align: "center" });
    }
    doc.text(
      "DISCLAIMER: PropIQ analysis is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results.",
      { align: "center" }
    );
    doc.text(`Report ID: ${analysis.id} | Analysis Date: ${new Date(analysis.createdAt).toLocaleDateString("en-AE")}`, { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Report generation error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
