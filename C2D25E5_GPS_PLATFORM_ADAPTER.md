# C2D.25E.5 — GPS PLATFORM ADAPTER SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Arquitectura de Adaptador GPS

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GPS PLATFORM ADAPTER TOPOLOGY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ILocationService (Domain)                            │
│                                   │                                         │
│                       PlatformGpsAdapter (Data)                             │
│                                   │                                         │
│         ┌─────────────────────────┴─────────────────────────┐               │
│         │                                                   │               │
│         ▼                                                   ▼               │
│  Android Hardware                                    iOS Hardware           │
│  (FusedLocationProviderClient / GPS)                 (CLLocationManager)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Contratos y Cumplimiento con ADR-015 y ADR-016

1. **Gestión de Permisos Segura**:
   - Validación de `checkPermission()` y solicitud controlada con `requestPermission()`.
2. **Precisión y Filtros de Telemetría**:
   - `LocationAccuracy.high` con filtro de distancia de 10 metros para balance de batería y fidelidad de ruteo.
3. **Contrato de Frescura Telemetría**:
   - Cumple con el umbral $\le 10\text{ minutos}$ certificado en ADR-016 para elegibilidad de repartidores en `/ubicaciones_repartidores/{courierId}`.
