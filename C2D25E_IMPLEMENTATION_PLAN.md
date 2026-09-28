# C2D25E — IMPLEMENTATION PLAN
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

> [!NOTE]
> Este plan de implementación documenta la secuencia técnica requerida para el hardening de la fábrica. No se ejecutará ninguna acción automáticamente durante C2D.25E.

---

### 1. Resumen de Fases de Hardening

```text
┌─────────────────────────────────────────────────────────────┐
│  FASE 1: Sincronización Externa de Firebase (GAP-FB-01)     │
│  - Registro de 2do package en Firebase Console              │
│  - Actualización de app/google-services.json                │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FASE 2: Whitelist de Google Maps en GCP (GAP-FB-02)        │
│  - Autorización de nuevo package_name + SHA-1 en GCP        │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FASE 3: Pipeline de Inyección de Brand Assets (GAP-BA-01)  │
│  - Inyección temporal pre-build de mipmaps/splash por brand │
│  - Limpieza post-build sin tocar app/src/main/res/          │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FASE 4: Emisión de Autorización Humana Level 6 Scoped      │
│  - Nueva orden unívoca y token single-use para el 2do build │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Estrategia de Rollback y Seguridad
- **Rollback Inmediato:** Ante cualquier fallo en la verificación pre-vuelo de `google-services.json` o assets, se aborta la operación y se restablece el archivo de configuración al baseline certificado de C2D.25C.
- **Cero Regresiones:** Track A no se modifica en ninguna fase del plan.
