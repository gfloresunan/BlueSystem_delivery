# Observability Platform & Distributed Tracing Guide

`ObservabilityPlatform` proporciona monitoreo, logs y trazabilidad End-to-End.

## Estructura de Trazabilidad (`TraceContext`)
- `traceId`: Identificador único de la transacción completa.
- `spanId`: Identificador de la sub-operación actual.
- `parentSpanId`: Identificador del span padre.

## Proveedor
- Implementación por defecto: `GcpObservabilityProvider` (Google Cloud Operations / Stackdriver).
