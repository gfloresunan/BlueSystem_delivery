# C2D25E — BRAND ASSET PIPELINE AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Auditoría del Flujo de Assets Comerciales

```text
┌─────────────────────────────────────────────────────────────┐
│                       BRAND ENTITY                          │
│        (Logos, Banners, Favicon, Theme Colors, Mipmaps)     │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│   BUILD-TIME     │                    │     RUNTIME      │
│  Launcher Icons  │                    │  Header Logos    │
│  Adaptive Icons  │                    │  Merchant Banners│
│  Splash Icon     │                    │  Palette Colors  │
│  Notification    │                    │  Typography      │
└──────────────────┘                    └──────────────────┘
```

---

### 2. Prevención de Contaminación Cruzada
- **Directorio de Entrada de Marca:** Cada marca posee sus assets en una ruta segregada en Cloud Storage (`gs://bluesystem-brand-assets/{tenantId}/{brandId}/`).
- **Inyección Transitoria:** Los recursos gráficos de launcher deben inyectarse exclusivamente en un directorio de compilación temporal (`build/generated/res/brandAssets/`) sin mutar `app/src/main/res/`.
- **Limpieza Post-Build:** Los archivos temporales se limpian tras la ejecución de Gradle, garantizando **cero contaminación residual** entre compilaciones de marcas distintas.
