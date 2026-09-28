# MERCHANT EMAIL IMPLEMENTATION PRECHECK & STOP CONDITION REPORT

**Proyecto Target:** `bluesystem-7c9af`  
**Fecha Auditoría:** 2026-08-12  
**Estado:** 🛑 STOP CONDITION TRIGGERED — FALTAN CREDENCIALES Y SERVICIOS GCP  

---

## 🛑 STOP CONDITION TRIGGERED

> [!CAUTION]
> **REQUISITOS PREVIOS DE PRODUCCIÓN FALTANTES**  
> De acuerdo con la **Regla de Stop Condition** del micro-sprint, la implementación de envíos reales a producción con SendGrid requiere la habilitación del servicio Secret Manager y la provisión de credenciales reales.  
>  
> 1. **Secret Manager API (`secretmanager.googleapis.com`):**  
>    Estado: `DISABLED` en GCP Project `bluesystem-7c9af`. Debe ser activada en GCP Console para almacenar secretos de producción sin exponerlos en código.
> 2. **SendGrid API Key (`SENDGRID_API_KEY`):**  
>    Estado: `MISSING` (No existe clave de API configurada en GCP/Firebase Secrets).
> 3. **Remitente / Dominio Autorizado (`EMAIL_FROM`):**  
>    Estado: `MISSING` (Ej: `notificaciones@bluesystem.app` o `no-reply@bluesystem.app`). Requiere verificación Single Sender Domain Authentication en SendGrid.

---

## 1. Inventario de Componentes Actuales

| Componente / Archivo | Estado Actual | Acción Requerida para Producción Real |
|---|---|---|
| **`functions/package.json`** | `@sendgrid/mail` no instalado | Instalar dependencia `@sendgrid/mail` |
| **[merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts)** | `submitMerchantApplication` no emite email | Conectar dispatch transaccional `merchant_application_received` |
| **[merchantApplications.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts)** | Escribe a `/mail` inerte | Reemplazar por dispatch directo SendGrid + Idempotencia en `/email_events` |
| **`services/notification-service`** | `EmailProvider` contiene mock simulado | Conectar SendGrid SDK oficial o delegar en Cloud Functions Triggers |
| **Plantillas HTML BlueSystem** | No existen plantillas compiladas | Crear plantillas HTML responsive para los 4 eventos |
| **Colección de Idempotencia** | No existe tracking de eventos por appId | Crear subcolección `/merchant_applications/{appId}/email_events/{eventType}` |

---

## 2. Matriz de Eventos y Plantillas Requeridas

| Evento | Trigger Backend | Plantilla HTML | Estado |
|---|---|---|---|
| **1. Solicitud Recibida** | `submitMerchantApplication` | `merchant_application_received.html` | 🔴 MISSING (Falta dispatch + HTML) |
| **2. Comercio Aprobado** | `onMerchantApplicationApproved` | `merchant_application_approved.html` | 🟡 PARTIAL (Payload listo, falta HTML + SendGrid) |
| **3. Comercio Rechazado** | `onMerchantApplicationStatusChanged` | `merchant_application_rejected.html` | 🟡 PARTIAL (Payload listo, falta HTML + SendGrid) |
| **4. Docs Requeridos** | `onMerchantApplicationStatusChanged` | `merchant_application_docs_requested.html` | 🟡 PARTIAL (Payload listo, falta HTML + SendGrid) |

---

## 3. Plan Arquitectónico Canónico (Backend Confiable)

```
[Merchant Portal / Governance Center]
                 ↓ (Solo acción de negocio)
[Firestore / Cloud Function (submit / approve / reject)]
                 ↓
[Validación de Idempotencia (/email_events)]
                 ↓
[SendGrid Mail SDK (SENDGRID_API_KEY via Secret Manager)]
                 ↓ (Respuesta Provider Message ID)
[Guarda Evento SENT/FAILED + Log seguro]
                 ↓
[Destinatario (Email Real)]
```

---

## 4. Requisitos Necesarios para Proceder con el Deploy Real

Para proceder con la ejecución del deploy en producción, se requiere proporcionar o configurar en GCP:

1. **Habilitación de Secret Manager API** en `bluesystem-7c9af`.
2. **SendGrid API Key real:** `SG.xxxxxxxxxxxxxxxxxxxxxx`
3. **Dirección de correo remitente verificada:** `notificaciones@bluesystem.app` (o similar).

---

## 5. Próximo Paso Requerido

Proporcionar la SendGrid API Key y el correo remitente autorizado, o autorizar la habilitación del servicio de secretos en GCP para proceder con la integración y pruebas de producción.
