# C2D.25E.5 — MAPS PLATFORM ADAPTER SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Arquitectura de Cartografía y Mapas

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MAPS PLATFORM ADAPTER TOPOLOGY                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         IMapsService (Domain)                               │
│                                   │                                         │
│                       PlatformMapsAdapter (Data)                            │
│                                   │                                         │
│         ┌─────────────────────────┴─────────────────────────┐               │
│         │                                                   │               │
│         ▼                                                   ▼               │
│  Flutter Google Maps (Android)                      Flutter Google Maps/    │
│  (google_maps_flutter)                              Apple Maps (iOS)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Contratos de Cartografía

- **Resolución de API Key:** La API Key de Google Maps se provee de manera segura a través de `AppProviderConfig.mapsApiKey` contenido en `AppConfigEntity`.
- **Cálculo de Rutas y Polilíneas:** Para operaciones comerciales y tarifación, las distancias se obtienen a través de `calculateDeliveryRouteCallable` en el backend para evitar discrepancias tarifarias locales.
