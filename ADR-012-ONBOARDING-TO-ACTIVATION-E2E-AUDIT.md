# ADR-012: Merchant Onboarding to Activation E2E — Forensic & Lifecycle Audit
## Governance Center, EIAM Provisioning, and Merchant Web Integration

**Fecha de Auditoría:** 9 de Agosto de 2026  
**Auditor:** Senior Developer & Auditor de BlueSystem  
**Ámbito:** Onboarding Portal → Governance Center → EIAM Engine → Merchant Web  
**Estado:** AUDITORÍA COMPLETADA — PROPUESTA DE CAMBIOS DE COMPATIBILIDAD E INTEGRACIÓN  

---

## 1. Executive Summary (Resumen Ejecutivo)

Una vez corregido y endurecido el almacenamiento seguro en el portal de onboarding bajo el estándar **ADR-011**, es obligatorio auditar la consistencia del flujo de integración posterior para evitar brechas de datos o fallos de activación en producción:

```
[1] Merchant Onboarding Portal  ──(applicationId + documents)──►  [2] /merchant_applications/{appId} (PENDING)
                                                                                  │
                                                                                  ▼
[4] Merchant Web (Wizard)   ◄──(Provisión EIAM + Temp Password)───  [3] Governance Center (Admin Panel)
```

Esta auditoría forense evalúa el estado del Governance Center (`panel-admin`), el motor de provisión en Cloud Functions (`functions`) y la interfaz de comerciantes (`merchant-web`) para garantizar la trazabilidad de los documentos cargados, la correcta activación del comercio y la inmutabilidad de los expedientes.

---

## 2. Forensic Findings & Architectural Gaps (Brechas Identificadas)

### A. Governance Center (Admin Panel) — Bandeja de Solicitudes
* **Brecha de Inspección Documental:** La bandeja de solicitudes de afiliación comercial (`renderApplicationsContent` en `governanceCenter.js`) permite ver información básica (RUC, email, teléfono, ciudad, etc.) y ejecutar acciones (`Aprobar`, `Docs`, `Rechazar`), pero **no tiene interfaz gráfica para inspeccionar los documentos legales adjuntos (`documents: Array<{ storagePath, name, type }>`)**. El administrador se ve obligado a aprobar o rechazar a ciegas.
* **Seguridad en la Lectura de Documentos:** Los documentos se cargan bajo `storagePath` con denegación de lectura pública (`allow read: if false`). Para que el Administrador pueda visualizarlos desde el navegador, la interfaz debe aprovechar su sesión activa EIAM. Dado que el usuario cuenta con el custom claim de rol `ADMIN` / `SUPER_ADMIN`, la regla de Storage permite la lectura (`allow read: if request.auth.token.role in ['ADMIN', 'SUPER_ADMIN']`). Solo se requiere agregar el botón y el componente de renderizado en el Admin Panel.

### B. EIAM Provisioning Engine (Cloud Function)
* **Pérdida de Metadatos de Documentos en Provisión:** La función `onMerchantApplicationApproved` (`functions/src/triggers/merchantApplications.ts`) en la línea 242 copia la propiedad obsoleta `documentUrls`:
  `documentUrls: after.documentUrls || [],`
  Bajo la nueva arquitectura segura ADR-011, las URLs públicas fueron descartadas y los archivos se estructuran en la propiedad `documents` con metadatos y `storagePath`. La Cloud Function debe mapear y copiar la propiedad `documents` hacia la colección `/businesses/{businessId}` para no perder la trazabilidad de los expedientes.
* **Falta de Inicialización de `restaurant_settings`:** El trigger atómico en la transacción Firestore crea el comercio (`/businesses`), la sucursal principal (`/branches`) y el usuario (`/users`), pero **no inicializa el documento correspondiente en `/restaurant_settings/{businessId}`**. Esto fuerza a la interfaz de Merchant Web a cargar valores por defecto (*fallbacks*) en lugar de información limpia del negocio recién creado.

### C. Merchant Web Portal
* **Identificador de Comercio Fijo (Demo Fallback):** Las vistas principales (`SettingsModule.tsx`, `DashboardModule.tsx`) obtienen el identificador del comercio mediante:
  `localStorage.getItem('bluesystem_active_merchant_id') || 'fresh_merchant_2026'`
  Si el comerciante inicia sesión por primera vez con su nueva cuenta y el ID de comercio no está correctamente guardado en la sesión/localStorage, la aplicación carga datos de prueba (`fresh_merchant_2026`) en lugar del comercio aprobado.
* **Wizard Simulado (Mocked Integration):** El asistente de configuración inicial (`OnboardingWizardModule.tsx`) tiene un flujo de completado simulado con un temporizador `setTimeout` y datos estáticos de demostración (`Pizza Roma Express`). En producción, debe conectarse con Firestore para:
  1. Escribir la configuración de horarios, datos bancarios y menú inicial en `/restaurant_settings/{businessId}`.
  2. Actualizar `wizardCompleted: true` y `lifecycleStatus: "ACTIVE"` en `/businesses/{businessId}` para activar el comercio de forma definitiva.

---

## 3. Security & Integrity Considerations (Gobernanza de Datos)

Para alinearse con las directivas de **Integridad Financiera** e **Integridad de Datos** de BlueSystem:
1. **Inmutabilidad Absoluta:** Ningún documento cargado en la aplicación de onboarding o perfil del comercio puede ser sobrescrito por un usuario no autenticado o por el comercio mismo sin pasar por un flujo formal de revisión documental (`DOCS_REQUESTED`).
2. **Rol de Auditoría:** El cambio de estados de ciclo de vida (`PENDING` → `UNDER_REVIEW` → `APPROVED` → `ONBOARDING` → `ACTIVE`) debe quedar registrado de forma transaccional en la colección `/audit_events` asociando el UID del administrador responsable y la marca de tiempo del servidor.

---

## 4. Proposed Changes Matrix (Plan de Ajustes de Integración)

| Componente | Archivo | Modificación Propuesta |
|---|---|---|
| **Governance Center** | `panel-admin/public/js/dashboard/governanceCenter.js` | Agregar botón `🔍 Ver Expediente` en la tabla de solicitudes. Al pulsarlo, abre un modal que lista los documentos y carga la vista previa de las imágenes/PDFs desde Storage utilizando la referencia segura (`storagePath`). |
| **Governance Center** | `panel-admin/public/js/services/governanceService.js` | Asegurar que al listar solicitudes se incluya la propiedad `documents` con sus referencias físicas de Storage. |
| **EIAM Engine** | `functions/src/triggers/merchantApplications.ts` | Copiar la propiedad `documents` (con `storagePath`) del expediente hacia el documento `/businesses/{businessId}`. Inicializar el documento base de `/restaurant_settings/{businessId}` en estado pendiente. |
| **Merchant Web** | `merchant-web/src/modules/OnboardingWizardModule.tsx` | Reemplazar la simulación de completado con escrituras reales en Firestore en `/restaurant_settings/{businessId}` y actualización de estado a `ACTIVE` en `/businesses/{businessId}`. |

---

## 5. E2E Verification & Certification Plan

1. **Creación del Expediente:** Registrar una solicitud en el Onboarding Portal y verificar la creación del documento `/merchant_applications/APP-XXX` con estado `PENDING` y los archivos en `merchant_applications_docs/APP-XXX/`.
2. **Revisión en Governance Center:** Entrar con usuario Administrador, ir a la pestaña "Solicitudes Afiliación", pulsar `🔍 Ver Expediente` y verificar que los archivos JPG/PNG/PDF carguen correctamente desde Storage.
3. **Aprobación & Provisión:** Pulsar `⚡ Aprobar` en la solicitud. Verificar en Firestore la creación de:
   - `/users/{uid}` con `eiamRole: "MERCHANT_OWNER"`.
   - `/businesses/{businessId}` con `lifecycleStatus: "ONBOARDING"` y el campo `documents` copiado.
   - Arreglo de custom claims del usuario Auth.
4. **Activación en Merchant Web:** Iniciar sesión en Merchant Web con las credenciales provisionales. Completar el Wizard de 5 pasos y validar que la base de datos se actualice con los datos ingresados en el Wizard, cambiando `/businesses/{businessId}.lifecycleStatus` a `"ACTIVE"` y completando las configuraciones del restaurante.

---

**ESTADO: AUDITORÍA DETALLADA FINALIZADA. LISTO PARA REVISIÓN DEL ADMINISTRADOR.**
