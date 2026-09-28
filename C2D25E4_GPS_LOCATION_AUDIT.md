# C2D25E.4 — GPS & LOCATION ARCHITECTURE AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Auditoría del Subsistema de Localización (ADR-015 & ADR-016)

La auditoría forense analizó la telemetría GPS para deslindar las reglas de negocio de la implementación en el hardware del cliente:

```mermaid
graph TD
    A[GPS Hardware / OS Sensor] -->|Native Location Adapter| B[Location State Normalizer]
    B -->|Offline Buffer / Room or SQLite| C[Sync Worker Engine]
    C -->|Throttled Upload 5s/60s| D[Firestore /ubicaciones_repartidores/{courierId}]
    D -->|Realtime Snapshot Listener| E[Control Tower & Client Tracking Map]
```

---

### 2. Separación entre Negocio e Implementación Específica

1. **Lógica de Negocio Canónica (Core):**
   - Estructura del documento `/ubicaciones_repartidores/{courierId}`: `{ motorizadoId, latitud, longitud, timestamp, pedidoActivoId, destinoLat, destinoLng }`.
   - Regla de frescura GPS: timestamp $\le 10\text{ minutos}$ para elegibilidad en despacho.
   - Cálculo de distancias Haversine (`GeoUtils`).
   - Restricción de coste 0 en mapas (`CartoDB Voyager` en Control Tower y consumo optimizado de listeners).
2. **Implementación Android Nativa (Adapter):**
   - `FusedLocationProviderClient`, `LocationSyncWorker.kt`, `OfflineLocationDao` (Room).
3. **Futura Implementación Flutter (Adapter):**
   - `geolocator` / `flutter_background_geolocation` + persistencia local ligera SQLite.

---

### 3. Veredicto

```text
══════════════════════════════════════════════════════════════
GPS LOCATION VERDICT:
🟢 ARCHITECTURALLY DECOUPLED (TELEMETRY IS PLATFORM-INDEPENDENT)
══════════════════════════════════════════════════════════════
```
