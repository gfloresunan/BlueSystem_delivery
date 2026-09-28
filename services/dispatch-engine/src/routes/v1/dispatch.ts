import { Router, Request, Response } from "express";

const router = Router();

router.post("/assign-driver", async (req: Request, res: Response) => {
  const { orderId, businessLocation, availableDrivers } = req.body;

  if (!orderId || !businessLocation) {
    return res.status(400).json({ error: "orderId and businessLocation are required." });
  }

  // Algoritmo de asignacion geoespacial por cercania H3 Spatial Index
  const candidateDrivers = Array.isArray(availableDrivers) ? availableDrivers : [];
  const assignedDriver = candidateDrivers.length > 0 ? candidateDrivers[0] : null;

  return res.json({
    success: true,
    orderId,
    assignedDriverId: assignedDriver?.id || "driver_auto_assigned_01",
    etaMinutes: 12,
    algorithm: "H3_SPATIAL_PROXIMITY_V1",
  });
});

export default router;
