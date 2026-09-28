# C2D24 — TEST PLAN
## Plan de Pruebas de Certificación Arquitectónica (FLAVOR-01 a FLAVOR-18)
**Protocol ID:** `C2D.24`  

---

### 1. Batería de Pruebas

| Test ID | Área | Criterio de Verificación |
|---|---|---|
| FLAVOR-01 | Integridad Gradle | El proyecto Android actual permanece sintáctica y estructuralmente válido |
| FLAVOR-02 | Single Codebase | Cero duplicación de código fuente entre perfiles comerciales |
| FLAVOR-03 | Aislamiento | Configuraciones de marca no pueden contaminar otros tenants |
| FLAVOR-04 | Application ID | Los `applicationId` propuestos son únicos y respetan la convención |
| FLAVOR-05 | Firebase | Mapeo determinístico de `google-services.json` a cada `applicationId` |
| FLAVOR-06 | Entornos | Entorno de desarrollo no puede acceder accidentalmente a recursos de producción |
| FLAVOR-07 | Gatekeeper | Los feature flags del binario no pueden saltarse la autorización del servidor |
| FLAVOR-08 | Runtime Branding | `BrandThemeProvider` y `BrandHydrationResolver` permanecen 100% operativos |
| FLAVOR-09 | Tenant 01 | Configuración de Tenant 01 intacta y sin mutaciones |
| FLAVOR-10 | Tenant 02 | Configuración de Tenant 02 intacta y sin mutaciones |
| FLAVOR-11 | Tenant 03 | Configuración de Tenant 03 intacta y sin mutaciones |
| FLAVOR-12 | Tenant 04 | Tenant 04 permanece ausente y bloqueado |
| FLAVOR-13 | Zero Build | Cero APKs generados durante la auditoría |
| FLAVOR-14 | Zero Build | Cero AABs generados durante la auditoría |
| FLAVOR-15 | Zero Gradle | Cero ejecuciones de comandos `./gradlew` |
| FLAVOR-16 | Zero CI/CD | Cero disparadores o llamadas a pipelines de CI/CD |
| FLAVOR-17 | Zero Deploy | Cero despliegues a hosting, emuladores o producción |
| FLAVOR-18 | Zero Release | Cero publicaciones a Google Play Console |
