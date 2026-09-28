# C2D25E.4 — MAPS & GEO-RENDERING AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Desacoplamiento de Mapas: Negocio vs Renderizado

Se auditó la integración cartográfica en toda la plataforma:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MAPS ARCHITECTURE AUDIT                            │
├─────────────────────┬───────────────────────────────┬───────────────────────┤
│ Capa                │ Tecnología / Motor            │ Dependencia de Plataf.│
├─────────────────────┼───────────────────────────────┼───────────────────────┤
│ Web Control Tower   │ Leaflet + CartoDB Voyager     │ 🟢 Cero Google Maps   │
│ Backend Geo Engine  │ Haversine Math (functions/)   │ 🟢 Frontend Agnostic  │
│ Android Native Client│ Google Maps Android SDK      │ 🔴 Android Specific   │
│ Flutter Client (Fut)│ google_maps_flutter / MapLibre│ 🟢 Flutter Adapter    │
└─────────────────────┴───────────────────────────────┴───────────────────────┘
```

---

### 2. Gestión de Credenciales y Restricciones
- **Google Cloud Console API Keys:**
  - Android Nativo: Restricción por Package Name (`com.aistudio.delivery.djweq`) + SHA-1.
  - Flutter Android: Utilizará la misma API Key autorizando el respectivo Package Name.
  - Flutter iOS: Utilizará la API Key con restricción de Bundle Identifier de iOS.
- **Lógica de Marcadores y Rutas:**
  - Los marcadores (origen, destino, repartidor, tiendas) se calculan en el Core y se transmiten como pares `{ lat: number, lng: number }`.

---

### 3. Veredicto

```text
══════════════════════════════════════════════════════════════
MAPS VERDICT:
🟢 ZERO ARCHITECTURAL COUPLING (MAP DATA IS 100% CANONICAL)
══════════════════════════════════════════════════════════════
```
