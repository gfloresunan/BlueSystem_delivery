# C2D25E.4 — MULTI-PLATFORM TEST PLAN
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Matriz de Pruebas de Integración y Regresión

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-PLATFORM TEST MATRIX                            │
├────────────────────┬─────────────────────────────┬──────────────────────────┤
│ Tipo de Prueba     │ Alcance / Target            │ Criterio de Éxito        │
├────────────────────┼─────────────────────────────┼──────────────────────────┤
│ Static Analysis    │ Cloud Functions & Schemas   │ Cero errores TypeScript  │
│ Contract Tests     │ Callable Input/Output JSON  │ Esquemas 100% validados  │
│ Multi-Tenant EIAM  │ Auth Claims & Gatekeeper    │ Default Deny verificado  │
│ Regression Track A │ Native Android App          │ Cero regresiones         │
│ Telemetry & GPS    │ Ubicaciones Repartidores    │ Throttling y datos OK    │
│ Notifications      │ APNs & Android Multicast    │ Payloads construidos OK  │
└────────────────────┴─────────────────────────────┴──────────────────────────┘
```

---

### 2. Protocolo de Pruebas en Clientes Futuros (Tripartito)
Cuando se desarrollen las aplicaciones Flutter, cada flujo deberá validarse bajo el protocolo tripartito:
`APK/IPA Instalado → Firestore / Cloud Function → Merchant Web / Control Tower → Resultado visible en Cliente`.
