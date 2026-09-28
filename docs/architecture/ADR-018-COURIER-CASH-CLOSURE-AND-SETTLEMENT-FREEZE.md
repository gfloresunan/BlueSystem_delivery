# ADR-018: Congelamiento Arquitectónico — Arqueo de Caja, Cierre Diario, Depósito Bancario y Exportación de Acta Oficial PDF (Courier & Admin Web)

## Estado
**APROBADO Y CONGELADO COMO BASELINE INMUTABLE v2.2 ENTERPRISE**

## Contexto y Alcance
Durante la operación del módulo de finanzas de motorizados y panel administrativo, se identificaron y resolvieron satisfactoriamente los siguientes desafíos críticos de integridad financiera y UX:
1. **Permisos y Carga de Voucher Bancario:** Resolución de permisos de almacenamiento/cámara y subida segura del comprobante de depósito en Firebase Storage (`/courier_deposits/{courierId}/{timestamp}.jpg`).
2. **Sincronización Canónica de Identidad:** Resolución e inclusión obligatoria del nombre real del motorizado (ej. *Henry Paz*) en lugar de UIDs o placeholders como *"Repartidor"* o *"Motorizado"*.
3. **Reinicio Atómico de Límite de Efectivo:** Al aprobar el cierre en el panel administrativo, el balance del motorizado en `/courier_balances/{courierId}` se resetea atómicamente (`cashOutstandingCents = 0`), eliminando el bloqueo en rojo y permitiéndole recibir pedidos de inmediato.
4. **Exportación Vectorial de Acta Oficial PDF:** 
   - **Admin Web:** Motor vectorial nativo con `jsPDF` y `AutoTable` en [courierCashControl.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/courierCashControl.js), reemplazando motores basados en `html2canvas` que renderizaban páginas en blanco al procesar contenedores ocultos.
   - **Android App:** Generador PDF nativo con `android.graphics.pdf.PdfDocument` en [CourierCashClosureScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierCashClosureScreen.kt) con FileProvider y guardado en descargas.

## Componentes Blindados Inmutables

| Componente | Archivo / Ubicación | Propósito y Garantía |
| :--- | :--- | :--- |
| **Android Cash Closure Engine** | [CourierCashClosureScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/courier/CourierCashClosureScreen.kt) | Captura de voucher, conciliación de arqueo, visualización de estado en tiempo real. |
| **Android Native PDF Generator** | `downloadOfficialActPdf` en `CourierCashClosureScreen.kt` | Renderizado nativo vectorial A4 con canvas, resolución de nombre real y guardado local. |
| **FileProvider & Permissions** | `file_paths.xml`, `AndroidManifest.xml` | Exposición segura de URIs de PDF y acceso a cámara/almacenamiento. |
| **Admin Web Vector PDF Engine** | `printOfficialAct` en [courierCashControl.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/courierCashControl.js) | Generación instantánea con `jsPDF` + `AutoTable` (0 fallas de canvas / 0 PDFs en blanco). |
| **Atomic Balance & Approval** | `adminApproveCourierDailyClosure` / `/courier_balances` | Liquidación contable atómica y reinicio de custodia de efectivo. |
| **Canonical Data Schema** | `/courier_daily_closures` | Conciliación de 4 Capas, código de validación, número de acta y firmas. |

## Reglas de Inmutabilidad
1. **Prohibición de `html2canvas` para Actas Oficiales:** Queda terminantemente prohibido reintroducir bibliotecas que dependan de capturar el DOM para generar el acta en la web.
2. **Prohibición de Placeholders Genéricos:** Ningún documento o PDF podrá persistirse o exportarse con `"Repartidor"` o `"Motorizado"` si existe un nombre real en Firestore.
3. **Aislamiento Multi-Tenant y Auditoría:** Toda acta emitida debe conservar de forma inmutable el número de acta (`ACTA-CASH-...`), el código de validación (`verificationCode`), la moneda (NIO) y las firmas autorizadas.
