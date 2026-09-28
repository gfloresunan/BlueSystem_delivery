import express from "express";
import cors from "cors";
import { SharedAuthMiddleware } from "../../shared/middleware/auth";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Probes Liveness / Readiness
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (req, res) => {
  res.status(200).send("READY");
});

// Middleware Trace Context
app.use((req, res, next) => {
  const context = SharedAuthMiddleware.extractRequestContext(req.headers as any);
  res.setHeader("traceparent", context.traceParent);
  next();
});

// CQRS Re-sintetizador Endpoint
app.post("/v1/aggregate", (req, res) => {
  const { targetAggregate } = req.body;
  return res.json({
    success: true,
    targetAggregate: targetAggregate || "dashboard_summary",
    aggregatedAt: new Date().toISOString(),
    compliance: "ADR-003",
  });
});

app.listen(PORT, () => {
  console.log(`[Analytics Aggregator Worker] Running on port ${PORT}`);
});
