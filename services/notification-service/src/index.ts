import express from "express";
import cors from "cors";
import notificationsRouter from "./routes/v1/notifications";
import { SharedAuthMiddleware } from "../../shared/middleware/auth";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Probes de Salud Cloud Run Blueprint
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

app.get("/ready", (req, res) => {
  res.status(200).send("READY");
});

// Middleware de Trazabilidad OpenTelemetry & Auth Context
app.use((req, res, next) => {
  const context = SharedAuthMiddleware.extractRequestContext(req.headers as any);
  res.setHeader("traceparent", context.traceParent);
  next();
});

// Rutas versionadas v1
app.use("/v1/notifications", notificationsRouter);

app.listen(PORT, () => {
  console.log(`[Notification Service] Running on port ${PORT}`);
});
