import { Router } from "express";
import { syncBayutListings } from "../lib/bayut-sync";

const router = Router();

// POST /admin/sync-bayut
// Triggers a sync of property listings from the Bayut/RapidAPI data source
router.post("/admin/sync-bayut", async (_req, res) => {
  try {
    const count = await syncBayutListings();
    res.json({ success: true, synced: count });
  } catch (err) {
    console.error("[admin/sync-bayut] Unexpected error:", err);
    res.status(500).json({ success: false, error: "Sync failed" });
  }
});

export default router;
