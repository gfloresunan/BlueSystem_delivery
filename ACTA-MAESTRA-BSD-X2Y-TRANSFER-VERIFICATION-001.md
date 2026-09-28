# ACTA MAESTRA DEFINITIVA DE CIERRE, GOBERNANZA EIAM Y CONGELAMIENTO ARQUITECTÓNICO

**Protocolo:** `BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001`  
**Gate Operativo:** `BSD-X2Y-TRANSFER-VERIFICATION-POST-IMPLEMENTATION-GATE-001`  
**Ecosistema:** BlueSystem Delivery Enterprise (`bluesystem-7c9af`)  
**Dominio:** Delivery Express X → Y (`/deliveryTrips/{tripId}` SSOT)  
**Baseline Arquitectónico:** Inmutable v2.3 Enterprise  
**Versión del Acta:** 1.0 Definitiva  
**Fecha de Cierre:** 24 de septiembre de 2026  
**Hora de Cierre:** 14:06 (UTC-06:00)  
**Estado:** 🔒 FINAL / FROZEN  

---

### 1. ALCANCE Y RESOLUCIÓN DEL CIERRE

Queda formal, definitiva y oficialmente cerrado el protocolo de ingeniería **BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001** y su compuerta **BSD-X2Y-TRANSFER-VERIFICATION-POST-IMPLEMENTATION-GATE-001**, habiéndose verificado y desplegado en producción el 100% de los entregables técnicos:

1. **Eliminación Definitiva de Referencias Locales Persistentes:**  
   `file://`, `content://` y rutas del sandbox privado de Android (`/data/user/0/...`) no pueden persistirse como referencia de comprobante en Firestore.  
   *(Se permite el uso interno y efímero de `content://` o archivos temporales en Android exclusivamente durante el proceso de selección y upload hacia Cloud Storage; queda estrictamente prohibida su persistencia en base de datos).*
2. **Carga y Referencia Remota:** Almacenamiento obligatorio y fail-closed en Firebase Cloud Storage bajo metadatos MIME certificados (`image/jpeg`) y UID autenticado.
3. **Admin Web Resiliente (`deliveryExpress.js?v=6.5.0`):**
   * Visualización remota de comprobantes con Miniatura, Lightbox de alta resolución y barra de metadatos (Referencia, Monto, Fecha).
   * Compatibilidad retroactiva estricta para registros antiguos: detección de esquemas locales y renderizado de la insignia `⚠️ Local` con warning controlado (0 errores de Chromium en consola).
4. **Bloqueo Canónico de Pre-Despacho:** Las encomiendas con pago por transferencia permanecen retenidas en `PENDING_VERIFICATION` / `PAYMENT_VERIFYING`. Cero motorizados alertados hasta su aprobación explícita.
5. **Aislamiento Transaccional Estricto (`db.runTransaction`):** Operaciones de aprobación y rechazo blindadas contra concurrencia de administradores (Admin A vs Admin B) con retorno idempotente `ALREADY_VERIFIED`.
6. **Pipeline de Notificaciones Unificado:** Idempotencia garantizada por identidad de documento Firestore (`x2y_transfer_${tripId}_VERIFY`): exactamente 1 alerta in-app, 1 push FCM y 1 email corporativo por evento.
7. **Despliegue Físico en Producción:**
   * Cloud Functions (`Node.js 22` en `us-central1`): **Deploy complete**
   * Admin Web Hosting (`https://bluesystem-7c9af.web.app`): **Deploy complete**
   * Firestore Security Rules (`firestore.rules`): **Deploy complete**
   * Storage Security Rules (`storage.rules`): **Deploy complete**

---

### 2. MATRIZ DE GOBERNANZA EIAM Y ALIAS DE ROL

En estricta concordancia con la auditoría de seguridad y el principio de menor privilegio, se establecen y formalizan las siguientes precisiones:

#### A. Matriz de Autorización para Verificación Financiera

| Rol EIAM | Autorización Técnica (Código Desplegado) | Política Operativa de Negocio | Alcance / Observación |
| :--- | :---: | :---: | :--- |
| **`SUPER_ADMIN`** | ✅ Autorizado | ✅ Autorizado | Acceso irrestricto de plataforma y control total de auditoría. |
| **`PLATFORM_ADMIN`** | ✅ Autorizado | ✅ Autorizado | Gestión operacional global y resolución de disputas de pago. |
| **`ADMIN`** | ✅ Autorizado | ✅ Autorizado | Operador administrativo estándar autorizado para conciliación. |
| **`SUPERVISOR`** | ✅ Autorizado | ✅ Autorizado *(Auditado)* | Verificación de mesa y arqueos operativos diarios. |
| **`OPERATOR`** | ✅ Autorizado *(En código)* | 🔒 Condicionado *(Roadmap EIAM)* | **Aclaración técnica:** El backend actual incluye técnicamente `OPERATOR` en `allowedRoles`. Sin embargo, a nivel de política de negocio, su ejercicio queda clasificado como *condicionado a asignación de tenant/sucursal*. Se registra como hardening futuro la introducción de restricciones granulares a nivel de Custom Claims sin reabrir el código en caliente. |

#### B. Normalización de Alias de Roles
* **Alias Legacy:** `SUPERADMIN`
* **Rol Canónico:** `SUPER_ADMIN`
* **Dictamen de Gobernanza:** Los aliases de rol actualmente soportados en la capa de autenticación y middlewares permanecen congelados y no se normalizan dentro de esta actividad para garantizar retrocompatibilidad total sin generar breaking changes.

#### C. Alcance del Almacenamiento (Storage Path)
* **Path Actual Certificado:** `x_to_y_transfer_receipts/{userId}/{timestamp}_{cleanFileName}`
* **Dictamen:** Se clasifica formalmente como **User-Scoped**. El aislamiento de acceso no depende del path físico sino de la capa de autorización en Backend Callables y Security Rules. Se difiere cualquier migración hacia un esquema `tenantId` para una futura actividad de hardening específica, quedando formalmente descartada su modificación dentro del Baseline v2.3.

#### D. Precisión Documental sobre Idempotencia y Consistencia Transaccional
> *"La idempotencia de negocio se garantiza mediante claves determinísticas, control de máquina de estados y mutaciones idempotentes en `EmailService` y `notificationQueueWorker`; las operaciones críticas de aprobación/rechazo utilizan `db.runTransaction()` para garantizar consistencia ante concurrencia. Las Firestore Security Rules operan como barrera de autorización y validación de tipos."*

---

### 3. COMPILACIÓN DE ARTEFACTO BINARIO (APK ANDROID)

* **Código Fuente Móvil:** Integrado y validado en `SolicitarEnvioScreen.kt` y `MainActivity.kt`.
* **Compilación:** **BUILD SUCCESSFUL**.
* **Artefacto:** **APK de validación/debug generado exitosamente**.
  * **Ruta Física:** `app/build/outputs/apk/core/debug/app-core-debug.apk`
  * **Tamaño:** `42.1 MB` (`42,108,345 bytes`)
  * **Timestamp:** `24/09/2026 10:45:08`
  * **Clasificación:** Artefacto para pruebas de laboratorio, auditoría y certificación técnica física (no constituye el release firmado de distribución a tiendas).

---

### 4. COMPONENTES INMUTABLES DEL BASELINE v2.3 ENTERPRISE

Quedan formalmente blindados contra modificaciones arbitrarias:
* `functions/src/callables/xToYAdmin.ts`
* `functions/src/triggers/xToYDispatch.ts`
* `functions/src/services/xToYDispatchEngine.ts` (Pre-dispatch gate)
* `functions/src/services/emailService.ts` (Template `x2y_transfer_verification`)
* `panel-admin/public/js/dashboard/deliveryExpress.js`
* `app/src/main/java/com/example/SolicitarEnvioScreen.kt`
* `app/src/main/java/com/example/MainActivity.kt`
* `firestore.rules` (Payment enums)

---

### 5. CLÁUSULA DE NO REGRESIÓN

> [!IMPORTANT]
> **CLÁUSULA OBLIGATORIA DE NO REGRESIÓN:**  
> Cualquier agente, desarrollador o actividad futura que requiera modificar componentes pertenecientes al **Baseline Inmutable v2.3 Enterprise** deberá demostrar previamente que el cambio es indispensable y deberá abrir una nueva actividad formal de ingeniería con su respectivo ADR. Ningún agente deberá realizar modificaciones ad-hoc sobre el protocolo congelado, aun cuando identifique oportunidades de refactorización, optimización o normalización.

---

### 6. DICTAMEN FINAL DE CIERRE Y CONGELAMIENTO

```text
========================================================================================
🔒 BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001
FORMALMENTE CERRADO Y CONGELADO
========================================================================================

COMMERCE_DELIVERY REGRESSION:       🟢 PASS
X_TO_Y_CASH REGRESSION:             🟢 PASS
X_TO_Y_TRANSFER_VERIFICATION:       🟢 CERTIFIED

ADMIN_NOTIFICATION_PIPELINE:        🟢 CERTIFIED
1 alerta in-app / 1 push FCM / 1 email por evento

FIREBASE_CLOUD_STORAGE:             🟢 CERTIFIED
Comprobante remoto + metadatos MIME válidos

REMOTE_RECEIPT_WEB_UI:              🟢 CERTIFIED
Miniatura + Lightbox + metadatos + compatibilidad legacy

TRANSACTIONAL_ISOLATION:            🟢 CERTIFIED
db.runTransaction + protección contra concurrencia

PRE_DISPATCH_PAYMENT_GATE:          🟢 CERTIFIED
Transferencias pendientes no ingresan al Fleet Pool

PRODUCTION_DEPLOYMENT:              🟢 SUCCESS
Functions + Hosting + Firestore Rules + Storage Rules

SYSTEM INTEGRITY:                   🟢 PRESERVED
Sin regresiones funcionales detectadas dentro del perímetro certificado.
No se realizaron modificaciones fuera del perímetro definido.

ARCHITECTURAL STATUS:               🔒 FROZEN
Baseline Inmutable v2.3 Enterprise

========================================================================================
```
