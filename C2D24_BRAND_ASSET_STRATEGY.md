# C2D24 — BRAND ASSET STRATEGY
## Estrategia Híbrida de Assets de Marca (Build-Time + Runtime)
**Protocol ID:** `C2D.24`  

---

### 1. Modelo Híbrido Recomendado

```
                          BRAND ASSET ARCHITECTURE
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
   BUILD-TIME (STATIC)                                 RUNTIME (DYNAMIC)
           │                                                   │
  ├─ Launcher Icon (mipmap)                           ├─ Theme Colors (Primary, Accent)
  ├─ Launcher Name (resValue app_name)                ├─ Dynamic Logo (Coil URL)
  ├─ Splash Screen Background                         ├─ Dynamic Splash Banner
  └─ Notification Default Icon                        └─ Brand Design Tokens
```

1. **Launcher Icon & App Name (Build-Time):** Resueltos por el flavor o generados en `src/<flavor>/res/` para que el sistema operativo muestre el icono y nombre correctos en el escritorio del teléfono.
2. **Dynamic Theming (Runtime):** Preserva `BrandThemeProvider` y `BrandHydrationResolver` para que los cambios de color y logotipos se actualicen en tiempo real desde el Admin Web sin necesidad de recompilar el APK.
