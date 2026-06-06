import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { getIngestionStatus, runDldIngestion } from "../jobs/scheduler";

const router: IRouter = Router();

router.get("/admin/ingestion/status", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  res.json(getIngestionStatus());
});

router.post("/admin/ingestion/trigger", requireAuth, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const current = getIngestionStatus();
  if (current.isRunning) {
    res.status(409).json({ error: "Ingestion already running", status: current });
    return;
  }

  res.json({ message: "DLD ingestion started", startedAt: new Date().toISOString() });

  runDldIngestion().catch((err) => {
    console.error("Manual ingestion trigger failed:", err);
  });
});

export default router;
