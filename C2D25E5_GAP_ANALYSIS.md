# C2D.25E.5 — GAP ANALYSIS & CLASSIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Clasificación Formal de Brechas (GAPs)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GAP CLASSIFICATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ P0 BLOCKER: 0                                                               │
│ P1 HIGH: 0                                                                  │
│ P2 MEDIUM (External Provisioning Required for Future Build): 2              │
│ P3 LOW (Future Visual Customization): 1                                     │
│ NON-BLOCKING FOR FOUNDATION: 3                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Matriz Detallada de GAPs

| ID | Descripción | Severidad | Estado Actual | Impacto | Acción Recomendada | Bloquea Fundación? | Bloquea Build Futuro? | Owner | Siguiente Fase |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Registro de Apps Flutter en Firebase Console (Android package e iOS bundleId) | `P2 MEDIUM` | Pendiente en Firebase Console | Necesario para generar `google-services.json` y `GoogleService-Info.plist` | Ejecutar registro en consola cuando se abra fase de aprovisionamiento | ❌ NO | ⚠️ SÍ (Requiere Prov) | Platform Admin | C2D.25F |
| **GAP-02** | Configuración de Certificados APNs para iOS en Firebase Messaging | `P2 MEDIUM` | Pendiente en Apple Developer Portal | Requerido para push notifications nativas en iOS real | Subir `.p8` key en Firebase Console | ❌ NO | ⚠️ SÍ (Requiere Prov) | Platform Admin | C2D.25F |
| **GAP-03** | Módulos de Pantallas Comerciales Específicas en Flutter (Catálogo, Carrito) | `P3 LOW` | Diseñado a nivel de contratos y servicios | Interfaz visual genérica lista; faltan pantallas avanzadas | Desarrollar módulos UI comerciales en fases subsiguientes | ❌ NO | ❌ NO | Frontend Dev | C2D.26 |
