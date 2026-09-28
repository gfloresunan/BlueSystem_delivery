"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const notifications_1 = __importDefault(require("./routes/v1/notifications"));
const auth_1 = require("../../shared/middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Probes de Salud Cloud Run Blueprint
app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
});
app.get("/ready", (req, res) => {
    res.status(200).send("READY");
});
// Middleware de Trazabilidad OpenTelemetry & Auth Context
app.use((req, res, next) => {
    const context = auth_1.SharedAuthMiddleware.extractRequestContext(req.headers);
    res.setHeader("traceparent", context.traceParent);
    next();
});
// Rutas versionadas v1
app.use("/v1/notifications", notifications_1.default);
app.listen(PORT, () => {
    console.log(`[Notification Service] Running on port ${PORT}`);
});
