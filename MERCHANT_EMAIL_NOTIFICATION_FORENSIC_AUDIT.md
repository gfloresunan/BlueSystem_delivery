# MERCHANT APPLICATION EMAIL NOTIFICATION — FORENSIC AUDIT

**Proyecto Target:** `bluesystem-7c9af`  
**Fecha Auditoría:** 2026-08-12  
**Modo:** READ-ONLY FORENSIC AUDIT  

---

## 🛑 AUDIT SUMMARY & VERDICT

```
======================================================
 BLUE SYSTEM DELIVERY ENTERPRISE
 MERCHANT EMAIL NOTIFICATION FORENSIC AUDIT
======================================================

1. Registro Enviado  → EMAIL: 🔴 FAIL (MISSING)
2. Comercio Aprobado → EMAIL: 🟡 FAIL (PARTIAL / DISCONNECTED)
3. Comercio Rechazado→ EMAIL: 🟡 FAIL (PARTIAL / DISCONNECTED)
4. Backend Confiable → EMAIL: 🟢 PASS (Firestore Triggers Deployed)
5. Notification Service      : 🟡 FAIL (MOCK ONLY)
6. SendGrid Integration     : 🔴 FAIL (INACTIVE / NO API KEY)
7. Producción Real          : 🔴 FAIL (NO EMAILS DELIVERED)

CONCLUSIÓN FINAL:
🔴 EMAIL WORKFLOW: MISSING / DISCONNECTED
======================================================
```

---

## FASE 1 — Inventario del Flujo de Merchant Application

| Componente | Archivo | Líneas Exactas | Función / Operación | Firestore Collection |
|---|---|---|---|---|
| **Portal de Registro** | `merchant-onboarding-portal/src/components/Step4Summary.tsx` | L79-L85 | Invocación de `submitMerchantApplication` | N/A (Callable API) |
| **Callable Submit** | [merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts) | L75–L157 | `submitMerchantApplication` | Writes to `/merchant_applications/{appId}` (`status: "PENDING"`) |
| **Boton Aprobar UI** | `panel-admin/public/js/dashboard/governanceCenter.js` | L2264 | Invocación `approveMerchantApplication` | N/A |
| **Service Aprobar** | `panel-admin/public/js/services/governanceService.js` | L275–L288 | `approveMerchantApplication` | Updates `/merchant_applications/{appId}` (`status: "APPROVED"`) |
| **Trigger Aprobación**| [merchantApplications.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts) | L147–L438 | `onMerchantApplicationApproved` | Creates EIAM entities + writes to `/mail` collection |
| **Boton Rechazar UI** | `panel-admin/public/js/dashboard/governanceCenter.js` | L2276 | Invocación `rejectMerchantApplication` | N/A |
| **Service Rechazar** | `panel-admin/public/js/services/governanceService.js` | L290–L304 | `rejectMerchantApplication` | Updates `/merchant_applications/{appId}` (`status: "REJECTED"`) |
| **Trigger Cambio Estado**| [merchantApplications.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts) | L446–L508 | `onMerchantApplicationStatusChanged` | Writes to `/mail` collection on `REJECTED` / `DOCS_REQUESTED` |

---

## FASE 2 — Auditoría del Evento de Registro (`submitMerchantApplication`)

**Flujo Ejecutado:**
$$\text{Merchant Portal} \longrightarrow \text{submitMerchantApplication} \longrightarrow \text{Document /merchant\_applications \{status: "PENDING"\}}$$

- **Auditoría de Envíos:**  
  La función `submitMerchantApplication` (`functions/src/callables/merchant.ts:75-157`) guarda la solicitud en Firestore pero **NO ejecuta ningún envío de correo, NO escribe en la colección `/mail`, y NO existe ningún trigger `.onCreate` en `merchant_applications`**.
- **Clasificación:** **D) EMAIL NO EXISTE (MISSING)**.

---

## FASE 3 — Auditoría del Botón Aprobar (`onMerchantApplicationApproved`)

**Flujo Ejecutado:**
$$\text{Admin (Aprobar)} \longrightarrow \text{status: "APPROVED"} \longrightarrow \text{onMerchantApplicationApproved} \longrightarrow \text{Document /mail \{template: "merchant\_invitation"\}}$$

- **Auditoría de Envíos:**  
  La Cloud Function `onMerchantApplicationApproved` (`functions/src/triggers/merchantApplications.ts:368-374`) invoca `sendMerchantInvitationEmail()`, la cual escribe un documento en la colección Firestore `/mail`:
  ```typescript
  await db.collection("mail").add({
    to: email,
    template: {
      name: "merchant_invitation",
      data: { contactName, businessName, businessId, tempPassword, loginUrl, supportEmail }
    },
    createdAt: FieldValue.serverTimestamp()
  });
  ```
- **Hallazgo Crítico de Desconexión:**  
  Aunque el backend escribe el registro en `/mail`, **NO existe ningún servicio activo (ni Firebase Extension `firestore-send-email`, ni worker de `notification-service`, ni cliente SendGrid)** escuchando o procesando la colección `/mail`. Los documentos permanecen estáticos e inactivos en Firestore.
- **Clasificación:** **B) IMPLEMENTADO PERO NO CONECTADO (DISCONNECTED / MOCK)**.

---

## FASE 4 — Auditoría del Botón Rechazar (`onMerchantApplicationStatusChanged`)

**Flujo Ejecutado:**
$$\text{Admin (Rechazar)} \longrightarrow \text{status: "REJECTED"} \longrightarrow \text{onMerchantApplicationStatusChanged} \longrightarrow \text{Document /mail \{template: "merchant\_application\_rejected"\}}$$

- **Auditoría de Envíos:**  
  La Cloud Function `onMerchantApplicationStatusChanged` (`functions/src/triggers/merchantApplications.ts:486-500`) escribe un documento en `/mail`:
  ```typescript
  await db.collection("mail").add({
    to: after.email,
    template: {
      name: "merchant_application_rejected",
      data: { contactName, businessName, status: after.status, rejectionReason: after.rejectionReason, ... }
    },
    createdAt: FieldValue.serverTimestamp()
  });
  ```
- **Hallazgo Crítico de Desconexión:**  
  Igual que en la aprobación, el documento en `/mail` nunca es procesado por un servicio de correo real.
- **Clasificación:** **B) IMPLEMENTADO PERO NO CONECTADO (DISCONNECTED / MOCK)**.

---

## FASE 5 — Auditoría de Notification-Service y Provider Engine

Inspección de `services/notification-service`:

1. **Endpoint REST:** `POST /v1/notifications/send` (`services/notification-service/src/routes/v1/notifications.ts:9-37`).
2. **Provider Email Engine (`services/notification-service/src/providers/email.ts:1-10`):**
   ```typescript
   export class EmailProvider {
     public static async sendTransactionalEmail(to: string, subject: string, templateHtml: string): Promise<{ success: boolean; messageId: string }> {
       // Transactual Email Provider Engine (SendGrid / SMTP API)
       return {
         success: true,
         messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
       };
     }
   }
   ```
   **Evidencia:** `EmailProvider` es un **MOCK FANTASMA** que simula responder `{ success: true, messageId: "msg_..." }` sin invocar la API de SendGrid ni ningún servidor SMTP.
3. **Dependencias NPM:** `@sendgrid/mail` **NO está instalado** en `services/notification-service/package.json`.

---

## FASE 6 — Auditoría de Plantillas de Email

| Plantilla | Existencia en Código | Datos de Plantilla (JSON Payload) | HTML / Render Engine | Estado |
|---|---|---|---|---|
| **Solicitud Recibida** | ❌ Inexistente | ❌ Ninguno | ❌ Ninguno | **MISSING** |
| **Comercio Aprobado (`merchant_invitation`)** | 🟡 Parcial | `{ contactName, businessName, businessId, tempPassword, loginUrl, supportEmail }` | ❌ Inexistente (Sin archivo HTML ni Handlebars) | **NO RENDERIZABLE** |
| **Comercio Rechazado (`merchant_application_rejected`)** | 🟡 Parcial | `{ contactName, businessName, status, docsNote, rejectionReason, applicationUrl }` | ❌ Inexistente (Sin archivo HTML ni Handlebars) | **NO RENDERIZABLE** |
| **Docs Requeridos (`merchant_application_docs_requested`)** | 🟡 Parcial | `{ contactName, businessName, status, docsNote, applicationUrl }` | ❌ Inexistente (Sin archivo HTML ni Handlebars) | **NO RENDERIZABLE** |

---

## FASE 7 — Verificación de Producción (`bluesystem-7c9af`)

- **Firebase Project:** `bluesystem-7c9af`
- **Cloud Functions:** `submitMerchantApplication`, `onMerchantApplicationApproved`, `onMerchantApplicationStatusChanged` están desplegadas pero escriben en la colección inerte `/mail`.
- **Firebase Extensions:** `firestore-send-email` **NO está instalada**.
- **SendGrid API Key / Secret Manager:** **NO configurado** en el entorno de producción.
- **Cloud Run `notification-service`:** Blueprint de contenedor presente en código pero no conectado a la base de datos Firestore ni a SendGrid.

---

## FASE 8 — Matriz Final de Auditoría

| Evento | Frontend | Backend | Evento / Trigger | Notification Service | SendGrid | Template | Producción | Estado Final |
|---|---|---|---|---|---|---|---|---|
| **1. Registro Enviado** | `Step4Summary.tsx:82` | `submitMerchantApplication` (`merchant.ts:75`) | ❌ NINGUNO | ❌ NINGUNO | ❌ INACTIVO | ❌ NO EXISTE | 🔴 MISSING | **MISSING** |
| **2. Comercio Aprobado** | `governanceCenter.js:2264` | `onMerchantApplicationApproved` (`merchantApplications.ts:147`) | `db.collection('mail').add(...)` | 🟡 MOCK (`EmailProvider.ts`) | ❌ INACTIVO | 🟡 DUMMY (`merchant_invitation`) | 🟡 DISCONNECTED | **PARTIAL / DISCONNECTED** |
| **3. Comercio Rechazado** | `governanceCenter.js:2276` | `onMerchantApplicationStatusChanged` (`merchantApplications.ts:446`) | `db.collection('mail').add(...)` | 🟡 MOCK (`EmailProvider.ts`) | ❌ INACTIVO | 🟡 DUMMY (`merchant_application_rejected`) | 🟡 DISCONNECTED | **PARTIAL / DISCONNECTED** |

---

## FASE 9 & 10 — Conclusión y Evidencia Definitiva

El sistema de notificaciones por correo para comercios **NO está operativo actualmente en producción**.

Aunque las Cloud Functions de aprobación y rechazo están desplegadas y escriben payloads JSON en la colección `/mail` de Firestore, los correos electrónicos **NUNCA llegan al destinatario** debido a que:
1. No existe un worker o extensión procesando la colección `/mail`.
2. El `notification-service` contiene únicamente un mock estático de correo.
3. No hay integración activa con la API de SendGrid ni plantillas HTML diseñadas para la marca BlueSystem.
