# Cloud Observability & Dashboards Guide
**BlueSystem Delivery Enterprise Platform**  
*Sprint 17.1 Infrastructure Foundation*

---

## 1. Integración de Observabilidad GCP

La plataforma integra 4 pilares de observabilidad de Google Cloud:
1. **Cloud Logging:** Captura centralizada de logs estructurados JSON.
2. **Cloud Monitoring:** Dashboards dinámicos y alertas métricas.
3. **Cloud Error Reporting:** Captura y clasificación automática de excepciones.
4. **Cloud Trace:** Trazabilidad de latencia de peticiones E2E.

---

## 2. Definición de Dashboards Enterprise

### 1. Dashboard: Cloud Functions & Schedulers
- **Métricas:** Invocaciones por segundo, Tiempos de respuesta (p50, p95, p99), Cold Starts, Errores 5xx, Re-intentos.

### 2. Dashboard: Firestore Operations (ADR-003 Governance)
- **Métricas:** Document Reads/Write/Delete por minuto, Latencia de consultas indexadas, Tamaño de colecciones vivas vs archivadas.

### 3. Dashboard: Cloud Storage & CDN
- **Métricas:** Volúmenes de Upload/Download (Bytes), Ancho de banda transferido, Estado de peticiones HTTP.

### 4. Dashboard: Google Maps Platform APIs
- **Métricas:** Solicitudes Geocoding/Places/Routes, Tasa de acierto de caché en cliente, Estimado de costo acumulado (USD).

### 5. Dashboard: Firebase Cloud Messaging (FCM)
- **Métricas:** Volumen de Push enviados/fallidos, Conteo de tokens invalidados limpiados, Latencia media de entrega multicast.
