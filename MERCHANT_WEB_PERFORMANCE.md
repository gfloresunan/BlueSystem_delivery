# MERCHANT_WEB_PERFORMANCE.md
## Métricas y Metas de Rendimiento Web

| Métrica | Objetivo | Garantía de Arquitectura |
|---------|----------|--------------------------|
| **Carga Inicial (FCP)** | < 2.0 segundos | Code Splitting + Vite Bundle Chunking |
| **Transición de Módulo** | < 300 ms | React Router Lazy Suspense |
| **Listeners Firestore** | ≤ 2 simultáneos | Cumplimiento estricto ADR-003 |
| **Bundle Initial Size** | < 250 KB gzipped | Vendor Splitting con Vite |
