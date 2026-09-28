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

// EIAM Invitation & Session Endpoint
app.post("/v1/invitations/create", (req, res) => {
  const { businessId, role, email } = req.body;
  const token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  return res.json({
    success: true,
    token,
    businessId,
    role,
    email,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[EIAM Identity Service] Running on port ${PORT}`);
});
