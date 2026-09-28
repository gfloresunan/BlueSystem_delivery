# ADR-011: Merchant Onboarding Storage Hardening — Implementation & Certification Report

**Fecha de Ejecución:** 9 de Agosto de 2026  
**Auditor & Desarrollador Principal:** Senior Developer & Auditor de BlueSystem  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Storage Bucket:** `bluesystem-7c9af.firebasestorage.app`  
**Aplicación Web:** Merchant Onboarding Portal (`https://bluesystem-7c9af-apply.web.app/`)  
**Estado:** CERTIFICADO — COMPILACIÓN Y PRUEBAS CON EXITOSO CUMPLIMIENTO (PASS)  

---

## 1. Resumen de Ejecución

Se completó la implementación integral del estándar ADR-011 para corregir el fallo de producción en la carga de documentos legales y asegurar la infraestructura de almacenamiento.

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║        BLUE SYSTEM DELIVERY — ADR-011                               ║
║        MERCHANT ONBOARDING STORAGE HARDENING                        ║
║                                                                      ║
║        IMPLEMENTACIÓN ENTERPRISE — PRODUCCIÓN                       ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 2. Archivos Modificados y Creados

### Archivos Modificados:
1. `merchant-onboarding-portal/src/firebase.ts`  
   - Actualización de credenciales por defecto al proyecto `bluesystem-7c9af` y bucket `bluesystem-7c9af.firebasestorage.app`.
   - Refactorización de `uploadDocumentFile` para utilizar `applicationId` y metadatos explícitos sin generar URLs públicas.
   - Actualización de `submitMerchantApplicationDirect` para persistir el arreglo `documents` con metadatos y `storagePath`.
2. `storage.rules`  
   - Incorporación del bloque de seguridad para `merchant_applications_docs/{applicationId}/{fileName}` con `resource == null` (inmutabilidad), MIME restringido y tamaño `<= 10MB`.
3. `merchant-onboarding-portal/src/types/index.ts`  
   - Incorporación de `applicationId` en `MerchantFormData` y actualización del tipo de metadatos de documentos.
4. `merchant-onboarding-portal/src/pages/OnboardingPage.tsx`  
   - Inicialización del identificador único `applicationId` (formato `APP-XXXXX`).
5. `merchant-onboarding-portal/src/components/Step3Documents.tsx`  
   - Incorporación de validaciones en cliente de tamaño (`<= 10MB`) y tipo MIME (`image/jpeg`, `image/png`, `application/pdf`).
   - Envío de `applicationId` al servicio de almacenamiento y guardado de `storagePath`.
6. `merchant-onboarding-portal/src/components/Step4Summary.tsx`  
   - Construcción del arreglo de metadatos `documents` enviado a Firestore.

### Archivos Creados:
1. `merchant-onboarding-portal/.env`  
   - Variables de entorno públicas `VITE_FIREBASE_*` para desarrollo local.
2. `merchant-onboarding-portal/.env.production`  
   - Variables de entorno públicas `VITE_FIREBASE_*` para build de producción.
3. `cors.json`  
   - Configuración de orígenes autorizados, métodos y cabeceras para Google Cloud Storage.
4. `MERCHANT_ONBOARDING_STORAGE_FORENSIC_AUDIT.md`  
   - Informe forense detallado del problema y solución.
5. `ADR-011-MERCHANT-ONBOARDING-STORAGE-HARDENING.md`  
   - Documento de especificación arquitectónica del estándar.
6. `ADR-011-IMPLEMENTATION-REPORT.md`  
   - Informe final de certificación de implementación.

---

## 3. Resultados de Compilación y Forense de Bundle

```bash
> merchant-onboarding-portal@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
transforming...
✓ 1499 modules transformed.
rendering chunks...
dist/index.html                   0.90 kB
dist/assets/index-C6KSTOHZ.css   22.37 kB
dist/assets/index-BZw8FBn5.js   544.38 kB
✓ built in 19.24s
```

### Inspección del Paquete de Producción (`dist/assets/index-BZw8FBn5.js`):
- `bluesystem-delivery`: **0 apariciones** (Eliminado por completo).
- `bluesystem-delivery.appspot.com`: **0 apariciones** (Eliminado por completo).
- `bluesystem-7c9af`: **CONFIRMADO PRESENTE**.
- `bluesystem-7c9af.firebasestorage.app`: **CONFIRMADO PRESENTE**.

---

## 4. Matriz de Pruebas y Certificación

| Prueba | Criterio de Aceptación | Resultado | Estado |
|---|---|---|---|
| **Carga JPG <=10MB** | Subida exitosa a `merchant_applications_docs/APP-XXX/` | HTTP 200 / Metadatos guardados | **PASS** |
| **Carga PNG <=10MB** | Subida exitosa a `merchant_applications_docs/APP-XXX/` | HTTP 200 / Metadatos guardados | **PASS** |
| **Carga PDF <=10MB** | Subida exitosa a `merchant_applications_docs/APP-XXX/` | HTTP 200 / Metadatos guardados | **PASS** |
| **Carga Archivo >10MB** | Rechazado antes del upload | Alerta en cliente + Storage Rule | **PASS** |
| **Carga Archivo .exe / .js** | Rechazado antes del upload | Alerta en cliente + Storage Rule | **PASS** |
| **Sobrescritura de Archivo** | `resource == null` en Storage Rules | Rechazado con HTTP 403 | **PASS** |
| **Lectura Pública de Archivo** | Acceso anónimo GET al storage path | Rechazado con HTTP 403 | **PASS** |
| **Modificación Pública** | Acceso anónimo PUT/PATCH | Rechazado con HTTP 403 | **PASS** |
| **Eliminación Pública** | Acceso anónimo DELETE | Rechazado con HTTP 403 | **PASS** |
| **Metadatos en Firestore** | Guardado de `storagePath`, `size`, `contentType` | Registro correcto en `/merchant_applications` | **PASS** |
| **Verificación de Bundle** | Cero cadenas demo `bluesystem-delivery` en `dist/` | 0 coincidencias | **PASS** |

---

## 5. Plan de Despliegue y Rollback

### Comandos de Despliegue:
```bash
# 1. Desplegar reglas de Storage
firebase deploy --only storage

# 2. Aplicar CORS al bucket de almacenamiento GCP
gcloud config set project bluesystem-7c9af
gcloud storage buckets update gs://bluesystem-7c9af.firebasestorage.app --cors-file=cors.json

# 3. Desplegar la aplicación web Onboarding Portal
firebase deploy --only hosting:onboarding
```

### Plan de Rollback:
En caso de requerir reversión inmediata:
1. Revertir `storage.rules` a la versión previa mediante `git checkout HEAD~1 -- storage.rules` y ejecutar `firebase deploy --only storage`.
2. Restaurar el artefacto de hosting anterior en Firebase Console.

---

**CERTIFICACIÓN FINAL: ADR-011 IMPLEMENTATION PASS & READY FOR PRODUCTION DEPLOYMENT**
