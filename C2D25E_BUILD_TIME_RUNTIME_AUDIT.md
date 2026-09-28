# C2D25E — BUILD-TIME VS RUNTIME AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Frontera de Responsabilidad: Build-Time vs Runtime

```text
┌─────────────────────────────────────────────────────────────┐
│                         BUILD-TIME                          │
│               (Requiere Compilación Física)                 │
├─────────────────────────────────────────────────────────────┤
│ · Application ID (Package Name del SO)                      │
│ · Nombre de la App en el Launcher (OS Display Name)         │
│ · Versión de Compilación (versionName / versionCode)        │
│ · Icono de Launcher y Adaptive Icon XML                     │
│ · Icono de Splash Screen Nativo (Android 12+)               │
│ · Certificado y Firma Criptográfica                         │
│ · Configuración de Firebase Client (`google-services.json`) │
│ · Metadatos de Google Maps API Key                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          RUNTIME                            │
│           (Hidratación Dinámica - Cero Rebuilds)            │
├─────────────────────────────────────────────────────────────┤
│ · Colores Primarios, Secundarios y Acentos                  │
│ · Logos de Encabezado, Banners y Sliders                    │
│ · Catálogos de Productos, Precios y Descuentos              │
│ · Modos Operativos (Delivery, Pick-up, X→Y)                │
│ · Feature Flags y Módulos Activos (Gatekeeper)              │
│ · Textos y Términos de Servicio                             │
│ · Integraciones de Pasarelas de Pago Activas                │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Veredicto
🟢 **BUILD-TIME VS RUNTIME BOUNDARY: GREEN (Óptimo y Sin Redundancias).**
