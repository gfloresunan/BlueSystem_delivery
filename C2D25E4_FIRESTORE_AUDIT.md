# C2D25E.4 — FIRESTORE DATA & SECURITY RULES AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Resumen de Colecciones Canónicas y Soporte Multiplataforma

Se auditó el modelo de datos completo en Firestore para comprobar si puede operar como la fuente única de verdad para Android Nativo, Flutter Android, Flutter iOS y Web sin duplicar colecciones.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIRESTORE CANONICAL SCHEMAS AUDIT                        │
├───────────────────────────────┬─────────────────────────────┬───────────────┤
│ Colección Canónica            │ Propósito de Negocio        │ Multi-Platform│
├───────────────────────────────┼─────────────────────────────┼───────────────┤
│ /tenants/{tenantId}           │ Aislamiento Multi-Tenant    │ 🟢 Universal  │
│ /brands/{brandId}             │ Configuración Visual/Marca  │ 🟢 Universal  │
│ /subscriptions/{subId}        │ Cuotas y Entitlements       │ 🟢 Universal  │
│ /app_configs/{configId}       │ Configuración de Binario/App│ 🟢 Universal  │
│ /orders/{orderId}             │ Pedidos de Comercio (TrackA)│ 🟢 Universal  │
│ /deliveryTrips/{tripId}       │ Envíos X→Y Punto a Punto    │ 🟢 Universal  │
│ /users/{uid}                  │ Perfil y Preferencias       │ 🟢 Universal  │
│ /user_devices/{deviceId}      │ Tokens FCM y Plataforma     │ 🟢 Universal  │
│ /ubicaciones_repartidores/{id}│ Telemetría GPS en Vivo      │ 🟢 Universal  │
│ /campaign_deliveries/{key}    │ Historial de Notificaciones │ 🟢 Universal  │
│ /email_events/{eventId}       │ Auditoría de Correos        │ 🟢 Universal  │
│ /build_requests/{requestId}   │ Orquestación de Builds      │ 🟢 Universal  │
└───────────────────────────────┴─────────────────────────────┴───────────────┘
```

---

### 2. Auditoría de Reglas de Seguridad (Firestore Rules EIAM v2.2/v3)

1. **Aislamiento Multi-Tenant Garantizado:** Las reglas de seguridad evalúan `request.auth.token.tenantId == resource.data.tenantId` o `request.auth.token.role in ['admin', 'super_admin']`.
2. **Independencia de Plataforma:** Las reglas validan identidad y permisos de usuario (JWT claims), sin condicionar el acceso al `User-Agent` o al sistema operativo del cliente.
3. **Prohibición Estricta de Colecciones Duplicadas:** Queda certificado que **NO se crearán** colecciones paralelas como `flutter_orders` o `flutter_tenants`.

---

### 3. Veredicto de Firestore

```text
══════════════════════════════════════════════════════════════
FIRESTORE MULTI-PLATFORM VERDICT:
🟢 100% SINGLE SOURCE OF TRUTH (ONE DATABASE MODEL FOR ALL APPS)
══════════════════════════════════════════════════════════════
```
