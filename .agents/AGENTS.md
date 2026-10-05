# Reglas del Proyecto (Workspace Rules)

## Regla de Ingeniería: Cambios Mínimos y Aislados

### Principio Fundamental
Todo cambio debe realizarse con el menor alcance posible, limitándose exclusivamente al módulo donde se origina el problema.

### Reglas Obligatorias
1. **No modificar componentes globales** (MainActivity, Application, Navigation, App.kt, inicialización global, Gradle, etc.) para resolver errores que pertenecen a un módulo específico, salvo que exista evidencia objetiva (stack trace, logs o pruebas) de que la causa raíz está en dichos componentes.
2. **Antes de modificar código compartido**, demostrar mediante evidencia que el problema no puede resolverse dentro del módulo afectado.
3. **Toda corrección debe mantenerse aislada**, evitando afectar módulos que previamente funcionaban correctamente.
4. **Cada compilación debe introducir un único cambio lógico**. No combinar múltiples correcciones en la misma versión de prueba.
5. **Después de cada cambio, ejecutar una prueba de regresión** para verificar que las funcionalidades previamente operativas continúan funcionando.
6. **Si una corrección provoca que falle una funcionalidad que antes funcionaba**, se considera una regresión y debe revertirse inmediatamente antes de continuar con nuevas modificaciones.
7. **No acumular cambios sobre una versión inestable**. Si una compilación introduce una regresión, regresar al último estado funcional y aplicar únicamente la corrección mínima necesaria.

### 📋 Flujo obligatorio para resolución de errores
1. Identificar el error
2. Obtener evidencia (StackTrace / Logs)
3. Localizar el módulo responsable
4. Aplicar un cambio mínimo y aislado
5. Compilar
6. Probar únicamente ese cambio
7. Validar que no existan regresiones
8. Solo entonces continuar con el siguiente cambio

### 🚫 Cambios prohibidos
El agente no deberá:
* Modificar `MainActivity` para resolver un error de una pantalla específica.
* Cambiar la navegación global para corregir un bug local.
* Alterar la inicialización de toda la aplicación para solucionar un problema de un solo módulo.
* Introducir varias correcciones simultáneamente sin poder identificar cuál resolvió el problema.
* Dar por resuelto un error sin validación en dispositivo real.

### ✅ Criterios de aceptación
Una corrección solo se considerará finalizada cuando:
* La causa raíz haya sido confirmada mediante evidencia objetiva.
* El módulo afectado funcione correctamente.
* Los módulos que ya funcionaban continúen funcionando sin cambios.
* No existan regresiones funcionales.
* El cambio sea el mínimo necesario para resolver el problema.

## Regla de Diagnóstico Forense
Cuando un error no pueda identificarse mediante inspección del código, el agente deberá generar una compilación de diagnóstico antes de proponer nuevas correcciones.

La compilación de diagnóstico deberá:
* Registrar el flujo completo mediante `Log.d`.
* Capturar el `StackTrace` completo de cualquier excepción.
* Registrar el nombre del archivo y el número de línea.
* No modificar la lógica funcional de la aplicación.

El objetivo de la compilación de diagnóstico será obtener evidencia objetiva del error, no intentar corregir el problema de forma empírica.

## Protocolo de Diagnóstico Forense (v1.1)

### Objetivo
Determinar la causa raíz del cierre del módulo de motorizado utilizando únicamente evidencia objetiva.

### Evidencia Obligatoria
La causa raíz solo podrá declararse confirmada cuando exista evidencia de:
* ✅ Último evento `FLOTA_DEBUG` registrado antes del cierre.
* ✅ `FATAL EXCEPTION` completo emitido por `AndroidRuntime`.
* ✅ Archivo y número de línea exactos.
* ✅ StackTrace completo, incluyendo **todas las líneas `Caused by:`**.
* ✅ Explicación técnica que relacione el último evento `FLOTA_DEBUG` con la excepción.

### Lectura del StackTrace
El StackTrace completo debe incluir obligatoriamente:
* El bloque `FATAL EXCEPTION: main` con la excepción superficial.
* **Todas las líneas `Caused by:`** anidadas hasta la raíz del error.
* Las líneas `at com.example...` que identifican el archivo y número de línea del proyecto.

> [!IMPORTANT]
> Muchas veces la excepción superficial es `java.lang.RuntimeException` y la causa raíz real está en una línea `Caused by:` posterior, que puede ser `IllegalStateException`, `SecurityException`, `ClassCastException`, u otra. El agente DEBE leer hasta el último `Caused by:` antes de declarar una conclusión.

### Criterios de Aceptación del Diagnóstico
No se aceptarán conclusiones basadas en:
* Suposiciones, coincidencias o hipótesis sin evidencia.
* Lenguaje como "Probablemente...", "Puede ser...", "Creemos que...".

Toda conclusión deberá estar respaldada por el StackTrace completo.

### Protocolo de Corrección
Solo después de confirmar la causa raíz se podrá:
* Modificar el código fuente.
* Generar una nueva APK correctiva.
* Cambiar la arquitectura del módulo.
* Refactorizar componentes.

Hasta entonces, la compilación se considera exclusivamente una **APK de diagnóstico**.

### Validación Post-Corrección
Después de aplicar cualquier corrección se deberá verificar que:
1. Desaparezca el `FATAL EXCEPTION` en Logcat.
2. El flujo completo del motorizado funcione: Login → Dashboard → Mapa.
3. Los módulos de Cliente, Comercio y Administrador continúen operando sin regresiones.

## Regla de Gobernanza de Arquitectura y Rendimiento (ADR-003)

### Principio Obligatorio
Todo nuevo módulo, refactorización o cambio arquitectónico debe cumplir estrictamente con **ADR-003-PERFORMANCE-COST-SCALABILITY.md**:

1. **Sin Consultas $N+1$:** Prohibido ejecutar consultas Firestore dentro de bucles `for`/`forEach`.
2. **Sin Listeners Masivos:** El Dashboard, KDS y Analytics deben consumir únicamente documentos agregados sintetizados (`dashboard_summary`, `kds_summary`, `daily_analytics`). Los listeners individuales deben ser efímeros.
3. **Caché Inteligente de Menú:** La app cliente sólo descargará el menú completo si la versión `menuVersion` en servidor ha cambiado.
4. **Archivado Obligatorio de Datos:** Toda colección activa de crecimiento lineal (`orders`, `kds_history`, `audit_logs`) debe archivar automáticamente registros $>90$ días en colecciones `_archive`.
5. **Presupuesto por Pantalla:** Cada vista debe documentar y respetar su presupuesto máximo de lecturas y escrituras por sesión.

## Regla Definitiva de Certificación E2E y Cierre de Integración (Sprint 18.1)

### Principio Fundamental
**Ninguna funcionalidad podrá marcarse como "Implemented" únicamente por existir código, UI, ViewModel o tests.** Debe existir evidencia objetiva del flujo completo: `UI → lógica → persistencia → sincronización → resultado visible`.

### Protocolo de Certificación en Dos Niveles

#### Nivel A — Técnico
```
Código → ViewModel → Repository → Firebase / Cloud Function → Tests
```

#### Nivel B — Usuario Real (Tripartito)
```
APK instalada → Comercio real de prueba → Acción → Firebase → Merchant Web → AMI → App Cliente
```

### Estatus Oficial de Funcionalidades:
- 🟢 **CERTIFIED:** Funciona E2E (Evidencia Nivel A + Nivel B en todos los touchpoints).
- 🟡 **PARTIAL:** Funciona parcialmente (ej. persiste en Firestore pero falta exportación, reordenamiento o push background).
- 🔴 **MOCK:** No existe integración real (datos estáticos o UI placeholder sin persistencia).

## Regla de Congelamiento Arquitectónico — Merchant Control Tower Enterprise (ADR-013)

### Principio Obligatorio
El módulo **Merchant Web → Control Tower** (`DeliveryControlTowerModule.tsx`) queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise**:

1. **Prohibición de Refactors Masivos:** Queda terminantemente prohibido reescribir, rediseñar o reemplazar la estructura del Control Tower.
2. **Motor Cartográfico Web Inmutable:** El motor oficial es Leaflet con CartoDB Voyager (`0 Maps Cost`). No se permite la migración a Google Maps JS API.
3. **Aislamiento Multi-Tenant y Diffing GPS:** La telemetría de `/ubicaciones_repartidores` debe mantenerse bajo suscripciones individuales acotadas por courier relevante (`activeGpsListenersRef`). Prohibido listeners globales sobre toda la colección.
4. **Prioridad Canónica de Identidad:** Resolución estricta: `assignedCourierId` (canónico) > `courierId` > `motorizadoId` > `driverId`.
5. **Zero Mock Coordinates:** Prohibido reintroducir fallbacks hardcodeados o marcadores ficticios.
6. **Intervención Exclusivamente Quirúrgica:** Toda modificación futura debe ser aditiva, quirúrgica y sustentada en auditoría forense previa.

## Regla de Gobernanza de Despliegue — NO AUTO-ROLLOUT POLICY (ADR-014)

### Principio Fundamental e Inviolable
Ningún resultado técnico, estado de auditoría o veredicto de fase (incluyendo `GO`, `PROMOTABLE`, `READY`, `PROMOTION_AUTHORIZED` o `CERTIFIED`) puede por sí mismo ni de forma inferida/automática modificar:
- `CANARY_ENABLED`
- `CANARY_PERCENTAGE`
- `UID_ALLOWLIST`, `MEMBERSHIP_ALLOWLIST`, `APPLICATION_ALLOWLIST`
- Emisión o mutación de `Custom Claims` (`setCustomUserClaims`, `revokeRefreshTokens`)
- `Provisioning` productivo
- `Firestore Rules`
- Esquemas o migraciones de `Room` (Android)
- `Production Deployments` (Hosting, Functions, App)

### Requisito Exclusivo de Apertura
**Únicamente una orden humana posterior, explícita, separada, inequívoca y emitida con alcance específico para ejecución** puede autorizar la apertura de la puerta operativa y la modificación de cualquiera de los parámetros o artefactos mencionados.

## Regla de Congelamiento Arquitectónico — X→Y Location Architecture Freeze (ADR-015 / C27)

### Principio Fundamental e Inviolable
El subsistema de localización, geocodificación, selección en mapa y resolución de coordenadas del flujo **X→Y Delivery 2.0** (`SolicitarEnvioScreen.kt`, `Models.kt`, `GeoUtils.kt`) queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise**:

1. **Componentes Blindados (Prohibido modificar sin un nuevo ADR formal):**
   - `Android Native Geocoder` (resolución y reverse geocoding nativo con biasing geográfico).
   - `Map Picker Dialog` (`WindowInsets.safeDrawing` + `navigationBarsPadding()` en viewport seguro).
   - `Central Pin` (anclaje fijo en centro con debounce reactivo).
   - `FusedLocationProviderClient` (resolución GPS de alta precisión y evaluación de umbral de exactitud).
   - `Saved Addresses` (persistencia y carga atómica de coordenadas).
   - `Atomic X/Y Location State` (mutación indivisible de `(address, latitude, longitude, source)`).
   - `Haversine Distance Engine` (`GeoUtils.calculateDistance`).
   - `Pricing Calculation Engine` (tarifa base $35 + \text{km} \times \$15$ y validación de ofertas).

2. **Prohibición Expresa de Inclusión de Places SDK:**
   Queda terminantemente prohibido incorporar Google Places Autocomplete SDK o motores de geocodificación duplicados por razones puramente estéticas o empíricas ("porque se ve más profesional"), evitando la competencia de dos fuentes de verdad para `(lat, lng)`.

3. **Protocolo Obligatorio para Cualquier Modificación Futura (10 Criterios de Demostración):**
   Cualquier cambio futuro en este subsistema requerirá obligatoriamente un ADR previo que demuestre con evidencia objetiva:
   1. **Problema Real**: Demostración de falla técnica o limitación operativa insalvable con el motor actual.
   2. **Beneficio Medible**: KPI cuantificable en precisión, latencia o conversión.
   3. **Riesgo Operativo**: Matriz de riesgos y plan de contingencia / rollback.
   4. **Impacto Económico**: Análisis de costo en APIs (ej. facturación por cada 1,000 requests).
   5. **Impacto UX**: Demostración de no regresión en la ergonomía y visibilidad (Safe Area).
   6. **Regresión C23**: Certificación de no afectación al contrato físico E2E de Trip.
   7. **Regresión C24**: Certificación de no afectación a la resiliencia y máquina de estados.
   8. **Regresión C26**: Certificación de no afectación a la experiencia de mapa y selección.
   9. **Regresión C27**: Certificación de no afectación al benchmark y hardware de referencia.
   10. **Physical E2E**: Validación obligatoria en dispositivo físico real (Galaxy Z Fold 5 u homólogo).

## Regla de Congelamiento Arquitectónico — Courier Core & Control Tower Freeze (ADR-016)

### Principio Fundamental e Inviolable
Los componentes certificados del ecosistema **Courier & Control Tower** quedan formalmente **CONGELADOS como Baseline Inmutable v2.2 Enterprise**.

Queda **TERMINANTEMENTE PROHIBIDO MODIFICAR** los componentes certificados sin la apertura de una **NUEVA FASE FORMAL DE INGENIERÍA**:

1. **Componentes Blindados Inmutables:**
   - `FleetEligibilityEngine` (Elegibilidad, Aislamiento Multi-Tenant y de Ciudad, frescura GPS $\le 10\text{ min}$).
   - `FirebaseManager` (Lógica de autenticación, queries canónicas y sincronización de órdenes).
   - `FcmManager` (Gestión de tokens multidevice `/user_devices/{uid}_{deviceId}`).
   - `GPS / LocationCallback / LocationSyncWorker` (Frecuencia 5s/60s a `/ubicaciones_repartidores/{courierId}`).
   - `Assignment Transactions` (`runTransaction` atómico para Commerce y X→Y).
   - Colección Canónica `/orders` (Commerce Delivery).
   - Colección Canónica `/deliveryTrips` (X→Y Delivery).
   - `Firestore Rules` (EIAM v2.1/v3, Aislamiento Multi-Tenant y Courier).
   - `Control Tower` (`DeliveryControlTowerModule.tsx`, `liveMap.js`).

2. **Protocolo Obligatorio Ante Cualquier Incidente o Bug:**
   Si se reporta una anomalía o falla, está **PROHIBIDO realizar refactors improvisados** o modificaciones empíricas. Se debe ejecutar estrictamente el siguiente flujo forense:

   ```text
   1. REPRODUCIR      → Evidencia objetiva en logs / StackTrace / dispositivo físico.
          ↓
   2. DIAGNOSTICAR    → Análisis de causa raíz hasta la última causa subyacente.
          ↓
   3. LOCALIZAR       → Archivo y línea exacta del módulo afectado (sin tocar globales).
          ↓
   4. HOTFIX QUIRÚRGICO → Cambio mínimo, aislado y estrictamente necesario.
          ↓
   5. REGRESIÓN       → Ejecución de suite de tests y verificación en touchpoints.
          ↓
   6. CERTIFICAR      → Validación E2E en dispositivo real y reporte formal.
   ```

## Regla de Congelamiento Arquitectónico — Transactional Email Core Freeze (ADR-017)

### Principio Fundamental e Inviolable
El subsistema de correo transaccional corporativo y administración de plantillas de la **Actividad #20** queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar):**
   - `EmailService` (`functions/src/services/emailService.ts`) — Dispatcher Singleton, Idempotencia atómica y Retry Backoff.
   - `SmtpEmailTransport` — Transporte SMTP nativo SSL/TLS puerto 465 contra `mail.bluesystemdelivery.com`.
   - `EmailTemplateEngine` — Motor unificado de 10 plantillas de sistema, rendering HTML y sanitización.
   - `HtmlSanitizer` & `EmailErrorClassifier` — Filtro de seguridad anti-XSS y clasificador técnico de fallos.
   - `SecretService` — Gestión de secretos backend (`SMTP_PASSWORD`) vía Google Cloud Secret Manager.
   - Callables de Email: `adminGetEmailTemplates`, `adminSaveEmailTemplate`, `adminSendTestEmail`, `adminGetEmailEventsHistory`, `adminVerifySmtpConnection`.
   - Colección canónica `/email_events` y `/email_templates`.
   - Módulo Admin Web: `panel-admin/public/js/dashboard/emailTemplates.js`.

2. **Regla de No Modificación Arbitraria:**
   Queda terminantemente prohibido introducir refactors, proveedores externos (SendGrid, Mailgun, Resend, SES) o modificaciones empíricas sobre este módulo. Cualquier cambio futuro requerirá una **NUEVA ACTIVIDAD FORMAL** con alcance específico y auditoría previa.

## Regla de Congelamiento Arquitectónico — Courier Cash Closure, Settlement & Official Act PDF Export Freeze (ADR-018)

### Principio Fundamental e Inviolable
El subsistema de **Arqueo, Cierre Diario, Depósito Bancario, Liquidación y Emisión de Acta Oficial PDF** del ecosistema de Motorizados y Panel Administrativo queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Módulo de Arqueo y Cierre Android:** `CourierCashClosureScreen.kt`, `CourierFinancesScreen.kt`, `FileProvider` (`res/xml/file_paths.xml`), flujo de captura de comprobante bancario con Storage `/courier_deposits/{courierId}/{timestamp}.jpg`.
   - **Generador de PDF Móvil Nativo:** Función `downloadOfficialActPdf` basada en `android.graphics.pdf.PdfDocument`, con resolución canónica de nombres de Firestore (`/users/{uid}.name` / `.nombre`), validación estricta de exclusión de placeholders genéricos (`Repartidor`, `Motorizado`) y persistencia en almacenamiento público/compartido.
   - **Motor de Conciliación y Liquidación Atómica:** Cloud Function `adminApproveCourierDailyClosure` y mutación atómica en `/courier_balances/{courierId}` que restablece `cashOutstandingCents = 0`, liberando inmediatamente el límite de efectivo para asignación continua de órdenes.
   - **Generador Vectorial de Acta Oficial Web:** Motor `jsPDF` + `AutoTable` en `courierCashControl.js` (`printOfficialAct`) y CDNs en `dashboard.html`. Queda **TERMINANTEMENTE PROHIBIDO** reintroducir librerías basadas en captura de canvas del DOM (`html2canvas`/`html2pdf`) o elementos fuera de viewport (`left: -9999px`).
   - **Estructura Canónica de Datos e Integridad Financiera:**
     - Colección canónica `/courier_daily_closures` con conciliación de 4 Capas (Recaudación, Arqueo Mesa, Depósito Bancario, Auditoría).
     - Colección canónica `/courier_balances` con seguimiento en tiempo real de `cashOutstandingCents` y `effectiveCashLimitCents`.
     - Identificadores inmutables de auditoría: `actNumber` (`ACTA-CASH-YYYYMMDD-UID-HASH`), `verificationCode` y firma canónica de supervisor.

2. **Protocolo de Protección:**
   Cualquier modificación o extensión sobre el flujo financiero de motorizados queda bloqueada contra cambios empíricos o refactorizaciones no autorizadas. Toda intervención requerirá demostración forense y aprobación explícita de auditoría.

## Regla de Congelamiento Arquitectónico — Merchant Financial Settlement Lifecycle Freeze (ADR-019)

### Principio Fundamental e Inviolable
El subsistema integral de **Liquidaciones Financieras por Comercio (Merchant Settlement Lifecycle)** del ecosistema BlueSystem Delivery Enterprise queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Cloud Functions Backend (`functions/src/callables/merchantSettlement.ts`):**
     - `adminGeneratePreSettlement` (corte determinístico temporal, agregación en centavos enteros y comisiones contractuales).
     - `adminRecordSettlementPayment` (validación estricta de monto pagado vs liquidado, registro de referencia bancaria y comprobante Storage).
     - `merchantConfirmSettlement` (cierre definitivo e inmutabilidad contable con `isFrozen: true`).
     - `merchantDisputeSettlement` (bloqueo de cierre unilateral y apertura formal de disputa con evidencia).
     - `adminResolveSettlementDispute` (resolución administrativa con ajuste contable y estampado estricto de `businessId` real en `/audit_events`).
     - `adminConfigureMerchantSettlement` (configuración de comisiones y períodos).
   - **Pipeline de Notificaciones Post-Pago:**
     - Encolamiento idempotente en `/notification_campaigns` bajo clave determinística `settlement_{id}_PAYMENT_REGISTERED`.
     - Payload FCM de datos mínimos (cero exposición de montos o referencias bancarias sensibles).
     - Despacho no-bloqueante de correo corporativo vía `EmailService` con plantilla canónica `/email_templates/settlement_payment_registered`.
   - **Motor de Paginación Cursor Firestore:**
     - `useSettlements.ts` (Merchant Web): Paginación acotada (`PAGE_SIZE = 20`) mediante `getDocs` y `startAfter(cursor)` sin unbounded listeners.
     - `financeCenter.js` (Panel Admin): Paginación cursor Firestore sincronizada con filtros multi-tenant y KPIs agregados.
   - **Estructura Canónica de Datos e Integridad Financiera:**
     - Colección canónica `/merchant_settlements` con inmutabilidad estricta post-confirmación (`isFrozen === true` irreversible).
     - Historial de transiciones auditable en array `history` con actor UID, rol, timestamp y justificación.
     - Documento inmutable de referencia: `/merchant_settlements/IBlriitmnP97CMw2IGqI` (TECNOSTORE).

2. **Protocolo de Protección:**
## Regla de Congelamiento Arquitectónico — Merchant Image Optimization, Atomic Sync & Real-Time Card Rendering Freeze (ADR-020)

### Principio Fundamental e Inviolable
El subsistema de **Compresión Automática de Imágenes, Sincronización Atómica en Firestore y Renderizado en Tiempo Real de Tarjetas de Comercios** en el Panel Administrativo y Ecosistema de Comercios queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Motor de Compresión Automática en Navegador (Anti-Jank 60 FPS):**
     - Función `_compressImageFile` en `panel-admin/public/js/dashboard/liveRestaurants.js`:
       - Logo: Máximo 256×256 px, compresión JPEG 85%, tamaño target $\le 30\text{ KB}$.
       - Banner / Portada: Máximo 1200×400 px, compresión JPEG 80%, tamaño target $\le 100\text{ KB}$.
     - Pre-carga asíncrona de imágenes en memoria del navegador antes de mutar el DOM (`preloadUrl` con `new Image()`).
   - **Sincronización Atómica de Imágenes en Firestore:**
     - Función `saveStoreImagesAtomic` en `panel-admin/public/js/services/commerceSyncService.js`.
     - Escritura atómica vía `batch.set` con `{ merge: true }` sobre `/businesses/{storeId}` y sincronización en `/users/{storeId}` garantizando que se actualicen en una sola operación indivisible:
       - `logoUrl`, `photoUrl`, `optimizedLogoUrl`
       - `bannerUrl`, `portadaUrl`, `coverUrl`, `optimizedBannerUrl`
       - `updatedAt: serverTimestamp()`
   - **Regla Estricta de Precedencia Canónica de URLs:**
     - Queda **TERMINANTEMENTE PROHIBIDO** anteponer `optimizedLogoUrl` o `optimizedBannerUrl` sobre las URLs canónicas editables.
     - La jerarquía de resolución en `renderCardHtml` y `updateCardDom` es obligatoriamente:
       - Logo: `store.logoUrl || store.photoUrl || store.optimizedLogoUrl || store.logo || store.image`
       - Banner: `store.bannerUrl || store.portadaUrl || store.coverUrl || store.optimizedBannerUrl || store.banner`
   - **Re-render Quirúrgico en Tarjeta DOM e Integración `onSnapshot`:**
     - `saveImages` en `liveRestaurants.js`: Actualización sincrónica de `storesMap`, reemplazo atómico del elemento DOM (`card.parentNode.replaceChild(newCard, card)`) y forzado de carga `img.loading = 'eager'`.
     - Suscripción reactiva `onSnapshot` en `/businesses` que consume `updateCardDom` de forma quirúrgica respetando la precedencia canónica sin destruir el layout ni provocar Layout Shifts (CLS = 0).
   - **Cache-Busting Obligatorio:**
     - Mantener el versionado explícito en `dashboard.html` (`commerceSyncService.js?v=...`, `liveRestaurants.js?v=...`) ante cualquier despliegue operativo.

2. **Protocolo de Protección:**
   Queda terminantemente prohibido introducir refactors no planificados, alterar la jerarquía de resolución de imágenes, eliminar el compresor canvas o bypassar la sincronización atómica de Firestore. Cualquier cambio futuro requerirá una **NUEVA ACTIVIDAD FORMAL DE INGENIERÍA** con auditoría forense previa.

## Regla de Congelamiento Arquitectónico — Human Order Code Architecture & Cross-Platform Freeze (ADR-021 / BSD-HUMAN-ORDER-CODE-001)

### Principio Fundamental e Inviolable
El subsistema de **Identificación Humana y Operativa de Pedidos de Comercio (Human Order Code)** a través de todas las superficies del ecosistema BlueSystem Delivery Enterprise queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Backend & Cloud Functions:**
     - `orderCodeUtils.ts`: Lógica determinista de resolución de prefijos (`resolveBusinessPrefix`), formateo de 6 dígitos (`formatOrderCode`) y secuencia atómica transaccional (`getNextOrderCodeInTransaction`).
     - `coupons.ts` (`createAuthoritativeOrder`): Generación server-side atómica en `/counters/orders_{businessId}`.
     - `orders.ts` (`notifyNewOrder`, `notifyOrderStatusChange`, `onPaymentStatusUpdated`): Fallback idempotente de estampado y enriquecimiento de payloads FCM (`orderCode`, `orderShortCode`) para Customer y Courier.
     - `orderCodeBackfill.ts` (`adminBackfillOrderCodes`): Migración histórica idempotente y segura por lotes con soporte `dryRun`.
   - **Modelos y Superficies Android:**
     - `Models.kt`: `Pedido` y `PedidoOfrecido` con propiedades `displayOrderCode` y `displayShortCode`.
     - `PedidosEntrantesScreen.kt`, `MisPedidosCourierScreen.kt`, `CourierOrderDetailScreen.kt`, `OrderChatScreen.kt`.
   - **Merchant Web (React / TypeScript):**
     - `OrdersModule.tsx`: Tarjetas Kanban con `orderCode` + badge `orderShortCode` y motor de búsqueda multi-criterio.
     - `DeliveryControlTowerModule.tsx`: Monitor de órdenes en vivo y filtro de búsqueda por código humano.
   - **Admin Web (Enterprise SPA):**
     - `liveOrders.js`, `financeCenter.js`, `courierCashControl.js`, `liveMap.js`.
   - **Estructura Canónica de Datos e Integridad del `orderId`:**
     - El `orderId` técnico de Firestore (`bNajftH6RHdjM0eRwHS`) permanece inmutable y canónico para `/orders/{orderId}`, tracking, finanzas, deep links y subledgers.
     - El `orderCode` (`FRT000026`) y `orderShortCode` (`0026`) son identificadores puramente operativos humanos.
     - El dominio X→Y (`/deliveryTrips`) permanece 100% independiente con prefijo `TRIP-`.

2. **Protocolo de Protección:**
   Queda terminantemente prohibido modificar la generación de consecutivos, alterar prefijos, introducir conteos client-side o alterar el `orderId` técnico. Cualquier cambio futuro requerirá una **NUEVA ACTIVIDAD FORMAL DE INGENIERÍA** con auditoría forense previa.

## Regla de Congelamiento Arquitectónico — Merchant Dashboard Timezone & Operational KPI Contract Freeze (ADR-022 / BSD-MERCHANT-DASHBOARD-KPI-001)

### Principio Fundamental e Inviolable
El subsistema de **Cálculo de Métricas Temporales, Resolución de Zona Horaria Canónica (`America/Managua`) y Agregación de KPIs Operativos** en el Merchant Web Dashboard (`DashboardModule.tsx`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Motor de Resolución Temporal:** Función canónica `getManaguaDateStr` basada en `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua' })`. Queda **TERMINANTEMENTE PROHIBIDO** reintroducir `toISOString().split('T')[0]`, `Date.now()` o conversiones directas a UTC para evaluar pertenencia a días calendario.
   - **Contrato de Negocio "Ventas Hoy":** Métrica operacional de demanda bruta de turno que incluye todos los pedidos comerciales válidos creados o completados hoy (`PENDING`, `PREPARING`, `READY`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`), excluyendo estrictamente `CANCELLED`/`REJECTED`. El saldo exigible contable permanece desacoplado bajo **ADR-019** (`/merchant_settlements`).
   - **Zero Mocks:** Prohibido reintroducir métricas inventadas o placeholders numéricos (e.g. mock histórico `14.5 min`). Si no existen datos suficientes para promediar, debe mostrarse `N/A`.
   - **Acotamiento Temporal de Clientes:** La tarjeta "Clientes Hoy" computa únicamente clientes únicos de órdenes del día actual.
   - **Visibilidad Explícita de Errores:** Errores de Firestore en `onSnapshot` deben renderizarse visualmente en la tarjeta (`syncError`) y jamás convertirse silenciosamente a `C$ 0.00`.

2. **Regression Gate Obligatorio (Ventana Nocturna 18:00–23:59):**
   Toda validación de integración o despliegue debe certificar que en la franja horaria `18:00–23:59` hora Managua (cuando UTC pasa al día siguiente), ninguna orden creada o completada ese mismo día en Nicaragua desaparece de las métricas diarias por desplazamiento de fecha UTC.

## Regla de Congelamiento Arquitectónico — Dual Order Rating, Review Lifecycle & Multi-Touchpoint Feedback Freeze (ADR-023 / BSD-ORDER-RATING-REVIEW-001)

### Principio Fundamental e Inviolable
El subsistema de **Valoración y Comentarios de Pedidos (Dual Rating, Review Lifecycle & Multi-Touchpoint Feedback)** en el ecosistema BlueSystem Delivery Enterprise queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

**Estado Oficial:** 🟢 **CERTIFICADO / FROZEN**

1. **Invariantes Arquitectónicas Blindadas:**
   - **Habilitación Canónica:** Pedido en estado entregado (`DELIVERED` o `COMPLETED`) habilita de forma correcta, determinística y segura la interfaz de valoración.
   - **Independencia Dual:** La valoración del comercio (productos, empaque, sabor) es 100% independiente y desacoplada de la valoración del servicio de entrega / motorizado (tiempo, trato, traslado).
   - **Asociación Canónica de Comentarios:** Todo comentario queda atómicamente vinculado al pedido entregado y trazable con su autor, fecha y orden.
   - **Persistencia Multi-Nivel Atómica:** Persistencia garantizada en las subcolecciones canónicas `/businesses/{businessId}/reviews/{orderId}` y `/couriers/{courierId}/reviews/{orderId}`, con respaldo en `/orders/{orderId}`.
   - **Prevención de Valoración Duplicada (Idempotencia):** Bloqueo estricto de doble emisión (`hasRatedBusiness`, `hasRatedCourier`, `hasBeenRated`) impidiendo duplicados maliciosos o accidentales.
   - **Actualización de Reputación y Estadísticas:** Actualización atómica de agregados (`rating`, `reviewCount`, `totalReviews`, `totalRatings`) en perfiles de comercios (`/businesses`) y repartidores (`/users`).
   - **Conservación Histórica del Pedido:** La valoración no muta destructivamente la orden original ni sus subledgers financieros o contables.
   - **Disponibilidad de Información Multi-Touchpoint:**
     - **Customer (App Móvil):** Visualización en Detalle del Pedido (*Tu Valoración del Pedido*) y en el perfil público del comercio (*Leer opiniones*).
     - **Merchant (Web & App):** Visualización reactiva en vivo en el Dashboard (`Opiniones & Satisfacción de Clientes`) y en widgets operativos.
     - **Courier (App Móvil):** Visualización en perfil e historial de reputación.
     - **Admin (Web Portal):** Visualización en tiempo real en tarjetas y modales de Comercios (`liveRestaurants.js`), así como en tarjetas y pestaña `⭐ Reseñas` del expediente del motorizado (`liveCouriers.js`).
   - **Diferenciación Operativa:** Distinción estricta entre `DELIVERED` (entregado físicamente en destino) y `COMPLETED` (ciclo administrativo cerrado), permitiendo calificar en ambos estados sin bloqueos.
   - **Cero Regresión:** Preservación absoluta del flujo estándar de pedidos, finanzas y liquidaciones.

2. **Regla de Gobierno y Protección Inviolable:**
   El proceso de valoración y comentarios queda formalmente **CONGELADO**. Queda terminantemente prohibido alterar código fuente, esquemas de base de datos o realizar intervenciones directas sobre este flujo. Cualquier requerimiento futuro deberá tramitarse obligatoriamente mediante un nuevo protocolo de cambio, auditoría forense previa y ADR formal aprobado.

## Regla de Congelamiento Arquitectónico — Courier Individual Cash Limit Override & SSOT Enforcement Freeze (ADR-024 / BSD-COURIER-INDIVIDUAL-CASH-LIMIT-001)

### Principio Fundamental e Inviolable
El subsistema de **Límites Individuales de Efectivo en Custodia por Motorizado (Courier Individual Cash Limit Override & SSOT Enforcement)** en el Panel Administrativo Web, Cloud Functions Backend, Reglas Firestore y Aplicación Móvil del Motorizado queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**:

**Estado Oficial:** 🟢 **CERTIFICADO / FROZEN**  
**Validación:** Verificación física y operacional en producción en Admin Web y suite 26/26 de pruebas de políticas financieras.  
**Veredicto:** **PASS — FULLY CERTIFIED & ZERO REGRESSION**

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Superficie Admin Web (`panel-admin/public/js/dashboard/liveCouriers.js`):**
     - Módulo de Expediente del Motorizado → Pestaña `Operación & Caja`.
     - Visualización canónica de `Límite Efectivo Máx.` con badges diferenciados (`Personalizado` vs `General (Predeterminado)`).
     - Micro-editor inline (`openCashLimitEditor`, `saveCashLimit`, `resetCashLimit`) con actualización reactiva en memoria sin recargar la página ni cerrar el drawer (`syncDossierInPlace`).
     - Aislamiento estricto por UID ($X \to X$), impidiendo alteraciones accidentales a otros motorizados o a la configuración general del sistema.
   - **Backend & Cloud Functions (`functions/src/callables/courierAccessPolicy.ts`):**
     - Callable `adminSetCourierCashLimit` con RBAC estricto (`PLATFORM_ADMIN`, `SUPER_ADMIN`, `SUPERVISOR`).
     - Escritura atómica multidocumento (`couriers/{courierId}`, `users/{courierId}`, `courier_balances/{courierId}`).
     - Soporte nativo de `resetToGlobal: true` utilizando `FieldValue.delete()` en las claves de override.
     - Registro inmutable de auditoría en `/audit_events` bajo eventos `COURIER_CASH_LIMIT_UPDATED` y `COURIER_CASH_LIMIT_RESET_TO_GLOBAL`.
     - Inmunidad a fallos de índices: función `evaluateCourierFinancialAccessInternal` utiliza consulta de índice simple nativo (`where("courierId", "==", courierId).limit(25)`) y filtrado en memoria con tolerancia de fallos `try / catch`.
   - **Reglas de Seguridad Firestore (`firestore.rules`):**
     - Inclusión obligatoria de `cashLimit`, `cashLimitCents`, `customCashLimitCents` y `effectiveCashLimitCents` en la lista negra `hasAny(...)` de campos protegidos en `/couriers/{courierId}` y `/users/{uid}`, impidiendo que clientes o motorizados alteren sus límites mediante manipulación SDK directa.
   - **Índices Firestore (`firestore.indexes.json`):**
     - Definición e índice activo para `courier_daily_closures (courierId ASC, businessDate ASC)`.
   - **Integridad Financiera y Respeto al Ledger:**
     - El ajuste del límite de efectivo es una política puramente de acceso y custodia; **NO MUTARÁ NI ALTERARÁ** el saldo vivo en custodia (`cashOutstandingCents`).
     - No genera cierres diarios falsos (`courier_daily_closures`), ni depósitos bancarios, ni transacciones ficticias en el subledger contable.
     - Total compatibilidad retroactiva con motorizados legacy que carecen de override (fallback determinístico a $C\$ 2,000.00$).

2. **Protocolo de Protección Inviolable:**
   Queda terminantemente prohibido modificar, refactorizar, optimizar, renombrar o reorganizar este subsistema dentro de otras intervenciones. Cualquier cambio futuro deberá cumplir obligatoriamente el flujo:
   `AUDIT FIRST → IMPACT ANALYSIS → MINIMAL CHANGE → REGRESSION TEST → CERTIFICATION → NUEVO FREEZE`.

## Regla de Congelamiento Arquitectónico — Merchant Finance Mobile Integration Freeze (ADR-022 / BSD-MERCHANT-FINANCE-MOBILE-INTEGRATION-001)

### Principio Fundamental e Inviolable
El subsistema móvil de **Centro Financiero y Liquidaciones para Comercios (Merchant Finance Center Mobile)** de la App Android queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** tras su validación exitosa en dispositivo físico real.

### Componentes Blindados Inmutables (Prohibido Modificar):
1. **Superficie de Usuario Móvil Android:**
   - `MerchantFinanceCenterScreen.kt` (Header inteligente, selector de 3 subpestañas, diálogo interactivo *"¿De dónde salió este dinero?"*, modal de detalle de liquidaciones con comprobante Storage, confirmación y formulario de disputa).
   - KPIs Financieros del Dashboard (`FinancialKpiRow` en `MerchantOperationsDashboardScreen.kt`).
   - Alerta discreta operacional de liquidación pendiente de revisión (`AWAITING_CONFIRMATION`).
   - `MerchantDashboardViewModel.kt` (Suscripciones SSOT y actualización armónica de métricas).
   - `MerchantFinanceViewModel.kt` (Manejo de subpestañas, filtros de fecha, paginación cursorizada y transacciones).
   - `BusinessDashboardScreen.kt` (Ruteo contextual `BusinessTab.FINANCE`, preservando las 4 bottom tabs canónicas).
   - `RestaurantSettingsCenterScreen.kt` (Tile de acceso directo al Centro Financiero en *"Mi Negocio"*).
2. **Fuentes de Verdad Canónicas y Contratos SSOT:**
   - `/merchant_summaries/{businessId}` (Resumen en centavos enteros).
   - `/financial_events` (Libro mayor contable inmutable por pedido).
   - `/merchant_settlements` (Ciclo de liquidación con FSM de 10 estados canónicos).
   - `MerchantFinanceRepository.kt` (Consultas cursorizadas `limit(20) + startAfter(cursor)`, llamadas atómicas a Cloud Functions).
3. **Cloud Functions Backend:**
   - `merchantConfirmSettlement` (Cierre y congelamiento contable definitivo con `isFrozen: true`).
   - `merchantDisputeSettlement` (Apertura de disputa formal con bloqueo de cierre unilateral).
4. **Integridad de Datos y Seguridad:**
   - Modelo monetario en centavos enteros (`Long Cents`): Cero uso de `Double`/`Float` en persistencia y cómputo.
   - Seguridad EIAM / `businessId`: Aislamiento multi-tenant estricto derivado de claims del token autenticado.
   - Centro de Notificaciones & Deep Links: Enrutamiento canónico de `bluesystem://merchant/settlements/{id}` y categoría *"Finanzas"* en `NotificationRouter.kt`.
   - Protección de reglas de seguridad (`firestore.rules` y `storage.rules`).

### 🚫 Regla de Protección desde Ahora:
Queda **TERMINANTEMENTE PROHIBIDO** modificar, refactorizar, optimizar, renombrar ni "mejorar" este módulo o sus funciones por iniciativa propia.

Cualquier cambio futuro deberá ingresar obligatoriamente mediante el flujo:
```text
NUEVA SOLICITUD
      ↓
AUDITORÍA DE IMPACTO
      ↓
AUTORIZACIÓN EXPLÍCITA
      ↓
PROTOCOLO NUEVO
      ↓
IMPLEMENTACIÓN QUIRÚRGICA
      ↓
REGRESIÓN
      ↓
NUEVA CERTIFICACIÓN
```
Queda igualmente protegida la regla de no afectar Customer, Courier, Admin, Pedidos, Catálogo, GPS ni otros módulos certificados.

**Estado oficial de trabajo:**  
🟢 **FINANZAS COMERCIO MÓVIL — VALIDADO EN CELULAR — FROZEN / PROTECTED 🔒**

## Regla de Congelamiento Arquitectónico — Merchant Staff Identity, Invitation Delivery & Activation Lifecycle Freeze (ADR-023)

### Principio Fundamental e Inviolable
El subsistema integral de **Identidad de Personal, Invitaciones por Correo Electrónico, Aceptación y Activación de Cuentas para Personal de Comercios (Merchant Staff Lifecycle)** queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** tras certificar la trazabilidad completa E2E:

`Creación en Merchant Web → Email Transaccional SMTP → /accept-invite?token → getStaffInvitationDetails → acceptStaffInvitation (IAM Token Creator) → Firebase Auth → Firestore (/users, /employees, /membership) → Custom Claims EIAM → Login & Role Routing (POS, KDS, Supervisor, Manager)`

### Componentes Blindados Inmutables (Prohibido Modificar sin Nuevo Protocolo y Autorización):
1. **Frontend Merchant Web:**
   - `StaffModule.tsx`: Formulario de invitación, reenvío de invitaciones (`adminResendStaffInvitation`), feedback de entrega SMTP, tabla de personal y filtro multi-sucursal.
   - `AcceptInviteModule.tsx`: Vista de aceptación de invitación, resolución segura de detalles, formulario de contraseña y mecanismo de autenticación dual nativa (`signInWithCustomToken` prioritario + fallback transparente `signInWithEmailAndPassword`).
   - `LoginModule.tsx`: Pestaña dual (Contraseña EIAM y PIN POS/KDS con custom token).
   - `shared/services/firebase.ts`: Amarre determinístico a región `us-central1`.
2. **Backend & Cloud Functions (`functions/src/callables/staffAuth.ts`):**
   - `adminInviteStaffMember`: Creación atómica de identidad en Firebase Auth, documento `/employees`, asignación de membresía y encolamiento de correo.
   - `adminResendStaffInvitation`: Reenvío seguro con nuevo token sin duplicar identidades.
   - `getStaffInvitationDetails`: Lectura desacoplada de reglas de seguridad públicas de Firestore.
   - `acceptStaffInvitation`: Activación atómica con soporte de reintento idempotente, manejo defensivo `try/catch` para firma de token y vinculación a `/membership`, `/users`, `/employees`.
   - `authenticateWithStaffPin`: Rápido acceso por PIN para terminales operativas POS/KDS con rate-limiting en memoria.
3. **Infraestructura Cloud & IAM:**
   - Rol `roles/iam.serviceAccountTokenCreator` asignado a `bluesystem-7c9af@appspot.gserviceaccount.com` para firma de Custom Tokens RS256.
   - Integración con plantilla canónica `staff_invitation` en Firestore y motor `EmailService` (ADR-017).
4. **Seguridad y Aislamiento Multi-Tenant:**
   - Principio canónico: `UNA IDENTIDAD = UN UID = UN EMPLEADO = UNA MEMBRESÍA = UN ROL = UNA SUPERFICIE OPERATIVA`.
   - Cero fugas de información entre comercios o sucursales.
   - Restricción estricta de escalamiento de privilegios vía `Gatekeeper` (`useGatekeeper.ts`).

### 🚫 Regla de Protección Inviolable:
Queda **TERMINANTEMENTE PROHIBIDO** modificar, refactorizar, reorganizar o alterar este subsistema o sus Cloud Functions. Cualquier cambio futuro requerirá obligatoriamente:
`NUEVA SOLICITUD → AUDITORÍA DE IMPACTO → AUTORIZACIÓN HUMANA EXPLÍCITA → PROTOCOLO NUEVO → HOTFIX QUIRÚRGICO → SUITE DE REGRESIÓN → NUEVA CERTIFICACIÓN`.

**Estado oficial de trabajo:**  
🟢 **PERSONAL & STAFF MERCHANT WEB — CODE FREEZE / PROTECTED 🔒**

## Regla de Congelamiento Arquitectónico — Courier Real Road Routing, Road Distance & Navigation ETA Freeze (ADR-024 / BSD-COURIER-REAL-ROAD-ROUTING-ETA-FREEZE-001)

### Principio Fundamental e Inviolable
El subsistema integral de **Routing Vial Real por Calles, Distancia Operacional Vial y Estimación de Llegada (ETA) en App Courier** (`RutaActivaScreen.kt`, `CourierRouteModels.kt`, `CourierRoutingRepository.kt`, `CourierRouteViewModel.kt`, `RealRoutingEngine.kt`, `StreetRoutingEngine.kt`, `MapIntelligenceEngine.kt`, `MapCostOptimizationPolicy.kt`, `RouteQualityEngine.kt`) certificado bajo el protocolo **`BSD-COURIER-REAL-ROAD-ROUTING-ETA-001`** queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el modo **STRICT CODE FREEZE / ZERO UNAUTHORIZED MUTATION / ZERO REGRESSION**.

### Componentes Blindados Inmutables (Prohibido Modificar sin Nuevo Protocolo y Autorización):
1. **Motores de Routing y Resiliencia:**
   - `RealRoutingEngine.kt` (Google Routes API v2 REST con payload JSON estructurado, FieldMask estricto y decodificación de polylines viales).
   - `StreetRoutingEngine.kt` (Fallback vial de alta disponibilidad OSRM).
   - `MapIntelligenceEngine.kt` (Orquestador de routing, cálculo de desvío y fallback multinivel).
   - `RouteQualityEngine.kt` y `MapCostOptimizationPolicy.kt` (Calidad de trazado y optimización de cuota/costo).
2. **Modelos y Repositorios:**
   - `CourierRouteModels.kt` (`RoadRoute`, `RouteLocation`, `RouteStep`, `RouteStatus`, `RouteFailureReason`, `CoordinatesValidationResult`).
   - `CourierRoutingRepository.kt` (Caché en memoria, mitigación de fallos, orquestación determinista).
   - `CourierRouteViewModel.kt` (Gestión de estado reactivo y debouncing de recálculo).
3. **Superficie de Navegación Android Jetpack Compose:**
   - `RutaActivaScreen.kt`:
     - Header operacional con visualización de estado (`Fase 1: En Ruta al Comercio` / `Fase 2: En Ruta al Cliente`), `operationalRouteDistanceKm` y `routeEtaMinutes`.
     - Cartografía Google Maps: Polyline vial real, cámara adaptativa con padding y marcadores origen/destino.
     - Botón flotante de recentrado de cámara `[ ◎ ]`.
     - Tarjeta de recogida y entrega: Colapsadas durante tránsito (`[ ▴ Ver pedido ]` / `[ ▴ Ver entrega ]`) y auto-desplegadas por geocerca (< 50m).
     - Geocerca de arribo (< 50m): Despliega tarjeta, pero NUNCA auto-confirma; requiere acción física explícita del repartidor.
   - `PedidosEntrantesScreen.kt`: Renderizado de rutas viales reales en visualización previa.

### 🚫 Reglas de Prohibición Estricta:
1. **Prohibido Volver a la Línea Recta:** Queda permanentemente prohibido trazar una polyline directa entre origen y destino. La ruta debe seguir fielmente la red vial.
2. **Prohibido Coordenadas Ficticias:** Cero fallbacks a "Managua Centro" o coordenadas sintéticas. Si las coordenadas son nulas o `0.0/0.0`, el estado obligatorio es `NO_VALID_COORDINATES`.
3. **Pipeline de Fallback Obligatorio:** Nivel 1 (Google Routes API v2) → Nivel 2 (OSRM StreetRoutingEngine) → Nivel 3 (Última ruta válida en caché) → Nivel 4 (`NO_ROUTE_AVAILABLE`). Cero líneas rectas en fallback.
4. **Prohibido Haversine en Navegación Courier:** `operationalRouteDistanceKm` es la única distancia operacional autorizada para la navegación. Haversine queda restringido a filtros técnicos de proximidad.
5. **Prohibido Hardcoding de ETA:** `routeEtaMinutes` debe provenir exclusivamente de los motores de routing; prohibido hardcodear minutos o usar fórmulas fijas de velocidad.
6. **Control Estricto de Costos de API:** Desacoplamiento total: Telemetría GPS (5s) ≠ Recálculo de Routing. El routing solo se recalcula ante desvío > 200m (`MAX_ALLOWED_DEVIATION_METERS`), debounce de 30s (`RECALC_DEBOUNCE`), cambio de fase o recálculo manual.
7. **Semántica Cromática Inmutable:** Fase 1 (Comercio) = 🟣 Violeta; Fase 2 (Cliente) = 🟢 Verde.
8. **Aislamiento e Inmutabilidad Financiera:** La distancia vial jamás impacta `deliveryFee`, comisiones ni ganancias del motorizado (`operationalRouteDistanceKm` ⇏ `deliveryFee`). El ledger contable es inmutable y reside en Cloud Functions.
9. **Cobro en Efectivo Intacto:** Validación estricta `cashReceived >= total`, bloqueo de confirmación ante insuficiencia y conciliación atómica.
10. **Máquina de Estados Limpia:** Prohibido agregar pseudo-estados (`ROUTING`, `NAVIGATING`, etc.) al campo `order.status`.
11. **Fleet Core, FCM y X→Y Blindados:** `/orders` transaccional, tokens FCM y dominio X→Y (`/deliveryTrips`, `SolicitarEnvioScreen.kt`) permanecen 100% aislados e intocados.
12. **Cero Mutaciones de Infraestructura:** Prohibido modificar Gradle o `AndroidManifest.xml`.
13. **Regla de No Refactorización:** Funciona + está certificado = NO TOCAR.

### 📋 Protocolo de Modificación Futura:
Cualquier cambio requerirá obligatoriamente:
`NUEVO PROTOCOLO FORMAL (16 puntos) → AUDITORÍA DE IMPACTO → AUTORIZACIÓN HUMANA EXPLÍCITA → HOTFIX QUIRÚRGICO → SUITE DE TESTS (13/13) → CERTIFICACIÓN EN DISPOSITIVO FÍSICO`.

**Estado oficial de trabajo:**  
🟢 **ROUTING VIAL REAL & ETA COURIER — CODE FREEZE / PROTECTED 🔒**

## Regla de Congelamiento Arquitectónico — Courier Performance, Reviews & History Data Homologation Freeze (ADR-025 / BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001)

### Principio Fundamental e Inviolable
El subsistema integral de **Mi Rendimiento e Historial, Calificación Real, Opiniones de Clientes Paginadas e Historial por Comercio Paginado en App Courier** (`CourierPerformanceScreen.kt`, `CourierMainDashboardScreen.kt`, `CourierReviewItem`, `PedidoOfrecido`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el protocolo oficial:

```text
🧊 IDENTIFICADOR: BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001
ESTADO: 🟢 PASS — FULLY CERTIFIED / FROZEN
DISPOSITIVO DE REFERENCIA: Samsung Galaxy Z Fold 5
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Autorización Explícita y Nuevo Protocolo):
1. **Identificador Operativo Homologado (`displayOrderCode`):**
   - Resolución canónica del código legible `#TEC000001` / `#VAT000002` mediante `order.displayOrderCode`, preservando intacto e inmutable el `orderId` técnico del Ledger de Firestore (`SlNg6gMpfH03S1QIGuS2`).
2. **Reputación y Calificaciones Reales:**
   - Calificación promedio real (`courierRating`), estrellas proporcionales y cantidad exacta de valoraciones acumuladas (`courierReviewCount`) leídas desde la fuente canónica de Firestore (`/users/{courierId}` y `/couriers/{courierId}`).
3. **Opiniones Reales de Clientes Paginadas (`/reviews`):**
   - Paginación estricta de **3 opiniones por página** (`REVIEWS_PER_PAGE = 3`) provenientes de la subcolección canónica de reseñas.
   - Componente visual `DarkPaginationBar` con botones `< Anterior` y `Siguiente >`, estado reactivo (`reviewsPage`), e indicador `Página X de Y`.
4. **Métricas de Rendimiento y Gamificación con Datos Reales:**
   - Pedidos por hora, ganancia por kilómetro, tasa de éxito (100%), racha de entregas consecutivas, ranking semanal y bono acumulado computados a partir de los pedidos completados reales.
5. **Selector Dinámico y Aislado de Comercio:**
   - Desplegable de comercios (`Todos los comercios` + lista dinámica de comercios activos en el historial) con filtrado instantáneo y cero interferencia multi-tenant.
6. **Filtros Temporales por Rango de Fecha:**
   - Chips de fecha: `Recientes`, `Hoy`, `Ayer`, `7 Días`, `Rango` (con DateRangePicker dialog nativo en calendario).
7. **Historial de Pedidos Paginado:**
   - Paginación estricta de **5 pedidos por página** (`ORDERS_PER_PAGE = 5`), aplicable tanto a `Todos los comercios` como al filtrar por comercio individual.
   - Paginador `DarkPaginationBar` y reset automático de página (`ordersPage = 0`) ante cambios de filtro.
8. **Integridad Financiera y Ledger:**
   - Desacoplamiento estricto entre `displayOrderCode` y `orderId`. Las métricas de ganancia (`gananciaCourier`, `totalEarnings`) reflejan fielmente las transacciones monetarias sin alteraciones client-side.
9. **Cero Regresión Operativa:**
   - Protección absoluta e inviolable de los módulos de Pedidos Entrantes, Navegación Vial Real (ADR-024), Finanzas / Arqueos (ADR-018) y Mi Perfil.

Queda establecida como baseline certificada y protegida del Courier App. 🔒✅

## Regla de Congelamiento Arquitectónico — Merchant Operating Hours & Store Availability Freeze (ADR-021 / BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001)

### Principio Fundamental e Inviolable
El subsistema integral de **Gestión de Horarios Semanales, Sincronización Multi-Plataforma y Resolución de Disponibilidad Comercial** (`OperatingHoursResolver.kt`, `BusinessInfo`, `Branch`, `ComercioDetalleScreen`, `CustomerHomeViewModel`, `SettingsModule.tsx`, `OnboardingWizardModule.tsx`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)**:

```text
🧊 IDENTIFICADOR: BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001
ESTADO: 🟢 PASS — FULLY CERTIFIED / FROZEN (T01 a T15 100% PASSED)
ZONA HORARIA CANÓNICA: America/Managua (UTC-6 sin DST)
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Autorización Explícita y Nuevo Protocolo):
1. **Motor de Dominio Unificado (`OperatingHoursResolver.kt`):**
   - Resolución canónica de disponibilidad temporal (`isStoreOpen`, `resolveStatus`) con soporte exhaustivo de turnos nocturnos continuos (overnight shifts, ej. 18:00–02:00 del día siguiente).
   - Parsing tolerante a claves de días en español con/sin tildes e inglés.
   - Jerarquía SSOT de timezone: `Tenant/Business canonical timezone -> OperatingHoursResolver (Platform fallback "America/Managua") -> Todas las experiencias`.
2. **Sincronización Atómica en Merchant Web:**
   - `SettingsModule.tsx` y `OnboardingWizardModule.tsx` proyectan atómicamente `schedule` y `weeklySchedule` tanto en `/businesses/{id}` como en `/branches/{id}` eliminando el silo de `/restaurant_settings`.
3. **Modelos de Dominio y Repositorios Android:**
   - `BusinessInfo` (`BusinessRepository.kt`) y `Branch` (`Branch.kt`) delegan su estado operativo dinámico en `OperatingHoursResolver`.
   - Extracción tolerante en `toBusinessInfoSafely()` soportando esquemas mixtos (Map vs String) sin excepciones.
4. **Protección de Experiencia de Usuario y Pedidos:**
   - Badge dinámico `ABIERTO` / `CERRADO` en `ComercioDetalleScreen.kt`.
   - Bloqueo interactivo en adición al carrito, modal de detalle y botón de checkout cuando el local está cerrado.
   - Validación perimetral previa a la creación de orden en `CustomerHomeViewModel.placeOrder()`.
5. **Gobernanza del Fallback:**
   - El uso de `manualOpen = isOpen && abierto` ante la ausencia de horario queda catalogado estrictamente como **LEGACY FALLBACK** transitorio, con retiro programado tras auditoría futura de migración total.
6. **Límite Concurrente Documentado:**
   - La ventana de validación temporal entre cliente y commit en `/orders` queda registrada como un **Known Boundary**, manteniendo inmutable `functions/src/triggers/orders.ts` bajo ADR-016.

### 🚫 Reglas Prohibitivas de Freeze:
- Prohibido crear resolvers paralelos de horario.
- Prohibido sustituir el horario por el booleano estático `isOpen`.
- Prohibido leer `/restaurant_settings` desde Customer App.
- Prohibido introducir campos efímeros redundantes en Firestore (`currentOpen`, `storeIsOpenNow`).
- Prohibido modificar `firestore.rules` o `orders.ts` por causas de horario.

## Regla de Congelamiento Arquitectónico — Notification Center Enterprise & Android Tray Freeze (ADR-022 / FASE 4.2-B)

### Principio Fundamental e Inviolable
El subsistema integral de **Notification Center Enterprise, Gestión de Ciclo de Vida (UNREAD → READ → DISABLED → DELETED), Despacho FCM Data-Only, Sincronización Multi-Dispositivo y Android System Tray** queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)**:

```text
┌──────────────────────────────────────────────────────────────┐
│ NOTIFICATION CENTER ENTERPRISE & FCM CORE                    │
│                                                              │
│ FASE 3.2  FCM IDEMPOTENCY                 🟢 FROZEN          │
│ FASE 4    NOTIFICATION CENTER             🟢 FROZEN          │
│ FASE 4.1  OPERATIONAL                     🟢 FROZEN          │
│ FASE 4.2  LIFECYCLE + ANDROID TRAY        🟢 FROZEN          │
│ FASE 4.2-B PHYSICAL E2E CERTIFICATION     🟢 FROZEN          │
│                                                              │
│ STATUS: ENTERPRISE CERTIFIED & INMUTABLE                     │
└──────────────────────────────────────────────────────────────┘
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Nueva Fase Formal):
1. **Worker de Despacho y Cola FCM (`notificationQueueWorker.ts`):**
   - Transiciones atómicas: `QUEUED` → `PROCESSING` → `SENT` / `PARTIALLY_SENT` / `RETRY` / `FAILED`.
   - Payload FCM estrictamente **DATA-ONLY** para Android (`android: { priority: "high", directBootOk: true }`).
   - Deduplicación física e idempotencia estricta vía `/campaign_deliveries/{campaignId}_{uid}_{deviceId}` con bypass ante estado previo `FCM_ACCEPTED`.
   - Heartbeat de lease atómico para evitar adquisiciones concurrentes.
2. **Callables de Ciclo de Vida (`functions/src/callables/admin.ts`):**
   - `adminDeleteCampaign`: Eliminación lógica global que actualiza `"visibility.status": "DELETED"` en `/notification_campaigns/{campaignId}` y propaga de forma atómica en batches `visibilityStatus: "DELETED"` a `/users/{uid}/notifications/{campaignId}` sin destruir estadísticas históricas ni registros de entrega.
   - `adminDisableNotificationForUser`: Deshabilitación granular de visibilidad en el documento de usuario objetivo con trazabilidad inmutable en `/audit_events`.
3. **Modelos y Repositorio Android (`AppNotification.kt` y `NotificationRepository.kt`):**
   - Filtrado reactivo con `isVisibleToUser()` sobre `visibilityStatus` (`"VISIBLE"` | `"DISABLED"` | `"DELETED"`).
   - Manejo unificado de lectura (`isRead`, `read`, `readSource`, `readAt`, `readByUid`).
   - Sincronización multi-dispositivo basada en escucha de subcolección de usuario sin silos locales.
4. **Servicio y Enrutador Móvil (`DeliveryFirebaseMessagingService.kt`, `MainActivity.kt`, `NotificationRouter.kt`):**
   - `onMessageReceived()` unificado para Foreground, Background y Killed.
   - Restricción estricta de `USE_FULL_SCREEN_INTENT` exclusivamente para despachos operativos de motorizado (`isIncomingOrder`), prohibiendo su uso en notificaciones comerciales o de sistema.
   - Captura de clic en System Tray inyectando `readSource: "system_tray"` y resolviendo deep links con Role Guard sin dead-ends.
5. **Panel Administrativo Web (`notifications.js`, `functions.js`):**
   - Presentación de campañas eliminadas bajo estado `🗑️ ELIMINADA DE LA BANDEJA`, preservando KPIs y ocultando botones de re-eliminación.

### Backlog Técnico Registrado (Microtarea de Infraestructura):
- **TASK-BACKLOG-001 — AUDIT_EVENTS COMPOSITE INDEX:**
  - Agregar índice compuesto en `firestore.indexes.json` para la colección `audit_events`:
    `fields: [ { fieldPath: "domain", order: "ASCENDING" }, { fieldPath: "timestamp", order: "DESCENDING" } ]`
  - *Clasificación:* 🟡 GAP NO BLOQUEANTE (no altera el funcionamiento del Notification Center ni de la escritura de auditoría).

Queda formalmente certificado, blindado y cerrado el Notification Center Enterprise. 🔒✅









## Regla de Congelamiento Arquitectónico — Merchant Demand Intelligence & Heatmap Analytics Freeze (ADR-021)

### Principio Fundamental e Inviolable
El ecosistema de Inteligencia de Demanda y Mapas de Calor (heatmapAnalytics.js, heatmapAnalytics.ts, generadores CSV y PDF) queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise**:

1. **Componentes Blindados Inmutables (Prohibido Modificar sin ADR Previo):**
   - **Backend (dminGetHeatmapData):** El procesamiento de coordenadas para el modo comercio debe mantener forzosamente la perspectiva DESTINATION (para analizar hacia dónde viaja la demanda) y la relajación de privacidad (K >= 1) para evitar invisibilizar ventas individuales. La protección estándar (K >= 2) se mantiene exclusiva para el modo Global. Las filtraciones en Firestore se hacen en memoria para evitar errores de índices combinados (FAILED_PRECONDITION).
   - **Motor de Reportes Ejecutivos (CSV / PDF):** Queda terminantemente prohibido alterar la lógica de exportación multi-sección. El archivo generado debe incluir obligatoriamente el contexto de filtros, el resumen por municipio, y el desglose atómico por celda térmica.
   - **Generador Vectorial PDF:** La exportación a PDF debe utilizar exclusivamente jsPDF y jspdf-autotable. Se prohíbe el uso de canvas destructivos (ej. html2canvas). Los enlaces a Google Maps en el desglose térmico deben permanecer activos y clicables.

2. **Protocolo de Protección:**
   Cualquier refactorización visual, cambio de formato de reporte o alteración del algoritmo de clusters de calor queda bloqueada por defecto. Toda modificación futura en los archivos heatmapAnalytics.js o heatmapAnalytics.ts requerirá demostración analítica y la apertura de una nueva Fase formal de ingeniería.

## Regla de Congelamiento Arquitectónico — X→Y Financial Canonicalization & Frozen Core (ADR-026 / BSD-X2Y-FINANCIAL-FROZEN-CORE-001)

### Principio Fundamental e Inviolable
El subsistema de **Tarificación SSOT, Cotización en Rutas, Facturación al Cliente, Liquidación al Courier, Ganancia de Plataforma, Custodia de Efectivo y Cierre Contable de Encomiendas X→Y Delivery Express** (`/system_config/global.xToYPricing`, `routingService.ts`, `RealRoutingEngine.kt`, `SolicitarEnvioScreen.kt`, `pricingSnapshot`, `trips.ts`, `financial_events`, `courier_cash_ledger`, `courier_balances`, `closure`, `deposit`, `settlement`) queda formalmente **CONGELADO como Baseline Inmutable v2.2 Enterprise (STATUS: FROZEN / PROTECTED 🔒)**:

```text
🧊 IDENTIFICADOR: BSD-X2Y-FINANCIAL-FROZEN-CORE-001 / ADR-026
ESTADO: 🟢 CERTIFIED / FROZEN
DISPOSITIVO BASELINE / FLAVOR: assembleCoreDebug
```

### Cadena Protegida Inmutable (De Extremo a Extremo):
```text
/system_config/global.xToYPricing
              ↓
      routingService.ts
              ↓
     RealRoutingEngine.kt
              ↓
    SolicitarEnvioScreen.kt
              ↓
       pricingSnapshot
              ↓
          trips.ts
              ↓
      financial_events
              ↓
     courier_cash_ledger
              ↓
      courier_balances
              ↓
          closure
              ↓
          deposit
              ↓
         settlement
```

### Las 10 Reglas Financieras Inmutables:
1. **Regla 1 (Conservación Monetaria):** $\text{CUSTOMER\_TOTAL} = \text{COURIER\_EARNINGS} + \text{PLATFORM\_REVENUE}$.
2. **Regla 2 (Ganancia del Courier):** $\text{COURIER\_EARNINGS} = \text{DISTANCE} \times \text{PRICE\_PER\_KM}$.
3. **Regla 3 (Ingreso de Plataforma):** $\text{PLATFORM\_REVENUE} = \text{BASE\_FEE}$.
4. **Regla 4 (Cobro en Efectivo):** $\text{CASH\_COLLECTED} = \text{CUSTOMER\_TOTAL}$ (cuando sea en efectivo).
5. **Regla 5 (Responsabilidad de Custodia / Deuda del Courier):** $\text{CUSTODY\_LIABILITY} = \text{CASH\_COLLECTED} - \text{COURIER\_EARNINGS}$.
6. **Regla 6 (Inmutabilidad Histórica):** `pricingSnapshot` histórico de un viaje no se modifica jamás retroactivamente.
7. **Regla 7 (Idempotencia Estricta):** Un completion trigger repetido no puede generar dinero adicional ni duplicar `financial_events`.
8. **Regla 8 (Fail-Closed Absoluto):** Si el SSOT tarifario no está disponible o es inválido: **NO COTIZACIÓN**, no tarifa inventada, no fallback silencioso.
9. **Regla 9 (Aislamiento de Dominio):** X→Y no se convierte en Commerce. Se preserva la independencia entre `/deliveryTrips` y `/orders`.
10. **Regla 10 (Libro Mayor Único):** No crear una segunda contabilidad ni subledgers paralelos para X→Y.

### 🚫 Directiva Operativa de Blindaje:
**DESDE ESTE MOMENTO: NO TOCAR EL CORE**. Ningún agente de IA ni desarrollador realizará modificaciones funcionales, cosméticas o refactorizaciones sobre este subsistema. Cualquier necesidad futura deberá canalizarse mediante un nuevo Change Request formal con auditoría de impacto previa.

## Regla de Congelamiento Arquitectónico — Admin Web App Check & Resilient Authentication Freeze (ADR-027 / BSD-ADMIN-APPCHECK-AUTH-FREEZE-001)

### Principio Fundamental e Inviolable
El subsistema integral de **Atestación de Seguridad Firebase App Check (reCAPTCHA Enterprise), Flujo de Autenticación Resiliente y Validación de Custom Claims EIAM del Panel Administrativo Web** (`panel-admin/public/js/firebase-config.js`, `panel-admin/public/js/auth.js`, `dashboard.html`, `index.html`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el modo **STRICT CODE FREEZE / ZERO UNAUTHORIZED MUTATION / ZERO REGRESSION**:

```text
🧊 IDENTIFICADOR: BSD-ADMIN-APPCHECK-AUTH-FREEZE-001 / ADR-027
ESTADO: 🟢 PASS — FULLY CERTIFIED / FROZEN
DOMINIO CANÓNICO: admin.bluesystemdelivery.com
TARGET HOSTING: admin -> panel-admin/public
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Nuevo Protocolo y Autorización):
1. **Orden Estricto de Inicialización de App Check (`firebase-config.js`):**
   - La llamada `firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey), true)` **DEBE ejecutarse inmediatamente después de `firebase.initializeApp()` y ESTRICTAMENTE ANTES de invocar o instanciar cualquier servicio de Firebase** (`firebase.auth()`, `firebase.firestore()`, `firebase.storage()`, `firebase.functions()`).
   - Queda terminantemente prohibido instanciar `auth` o `firestore` antes de `appCheck.activate()`, para evitar condiciones de carrera y fallos prematuros de atestación.
   - El listener `appCheck.onTokenChanged(next, error)` debe mantener su firma defensiva de dos callbacks para capturar advertencias de red sin disparar excepciones no controladas en consola.

2. **Flujo de Autenticación Resiliente (`auth.js`):**
   - **Prohibición de Refresco Redundante:** Queda estrictamente prohibido reintroducir `await user.getIdToken(true)` inmediatamente después de `signInWithEmailAndPassword()`.
   - **Lectura Atómica en Memoria:** La obtención de Custom Claims debe realizarse exclusivamente a través de `await user.getIdTokenResult(false)` sobre el token JWT recién emitido en el login, evitando peticiones duplicadas a `securetoken.googleapis.com` que generen errores `net::ERR_CONNECTION_CLOSED` por microcortes TCP.
   - **Reintento Transparente:** Se debe conservar el mecanismo de retry ante excepciones transitorias `auth/network-request-failed` para proteger la experiencia del administrador ante latencias o microcortes de red.

3. **Configuración Canónica de Infraestructura en Google Cloud & Firebase:**
   - **Proyecto GCP:** `514416631826` (`bluesystem-7c9af`).
   - **Web App ID Canónico:** `1:514416631826:web:ceff16519cecd24088b8cb` ("BlueSystem Web").
   - **Clave reCAPTCHA Enterprise:** `6Ld84octAAAAAD7hM1x5bDfYDmEiRoarxyoBAP2X` (Tipo: `SCORE`).
   - **Dominios Autorizados Inmutables:**
     1. `admin.bluesystemdelivery.com` (Dominio canónico de administración).
     2. `bluesystemdelivery.com` (Dominio raíz corporativo).
     3. `bluesystem-7c9af.web.app` (Dominio default Hosting).
     4. `bluesystem-7c9af.firebaseapp.com` (Dominio default Auth).

4. **Cache-Busting Obligatorio:**
   - Todo despliegue sobre `panel-admin/public` debe actualizar explícitamente las versiones en `index.html` y `dashboard.html` (`firebase-config.js?v=...`, `auth.js?v=...`) para asegurar la propagación inmediata en clientes web.

### 🚫 Regla de Protección Inviolable:
Queda **TERMINANTEMENTE PROHIBIDO** modificar, alterar o refactorizar la lógica de inicialización de App Check o el flujo de login del Panel Administrativo sin una orden humana previa, explícita y separada acompañada de una auditoría formal de impacto.

**Estado oficial de trabajo:**  
🟢 **ADMIN APP CHECK & AUTH CORE — CODE FREEZE / PROTECTED 🔒**

## Regla de Congelamiento Arquitectónico — Admin Web Customer Operations Center & Customer 360 Freeze (ADR-028 / BSD-ADMIN-CUSTOMER-OPERATIONS-360-FREEZE-001)

### Principio Fundamental e Inviolable
El subsistema integral de **Operaciones Globales de Clientes y Customer 360 (Customer Operations Center & Customer 360)** en el Panel Administrativo Web (`panel-admin/public/js/dashboard/liveCustomers.js`, `dashboard.html`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el modo **STRICT CODE FREEZE / ZERO UNAUTHORIZED MUTATION / ZERO REGRESSION**:

```text
🧊 IDENTIFICADOR: BSD-ADMIN-CUSTOMER-OPERATIONS-360-FREEZE-001 / ADR-028
ESTADO: 🟢 PASS — FULLY CERTIFIED / FROZEN
COMPONENTE CANÓNICO: panel-admin/public/js/dashboard/liveCustomers.js (v5.2.0)
TARGET HOSTING: admin -> panel-admin/public
AUDITORÍA FORENSE DE CIERRE: BSD-ADMIN-CUSTOMER-360-FORENSIC-CERTIFICATION-001.md
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Nuevo Protocolo y Autorización):
1. **Resolución Canónica de Identidad y Cero Claims Asumidos:**
   - La clasificación de identidades de clientes opera sobre los campos materializados en `/users` procesados por `CanonicalIdentityResolver.resolve()`.
   - Queda estrictamente prohibido intentar filtrar en consultas directas de Firestore por Custom Claims de Firebase Auth, ya que no son campos indexados del documento.

2. **Cero Colecciones Paralelas (SSOT Absoluto):**
   - Queda terminantemente prohibido crear colecciones paralelas como `/customers`, `/customer_profiles`, `/customer_analytics` o similares. La verdad transaccional reside exclusivamente en `/users`, `/orders`, `/deliveryTrips` e `/incidents`.

3. **Arquitectura Anti N+1 y Gobernanza de Lecturas (ADR-003):**
   - Prohibido iterar sobre listas de usuarios para disparar consultas individuales a subcolecciones.
   - Las operaciones en vivo se sostienen sobre 3 listeners acotados:
     - Orders activas (`status` en estados operacionales, `limit(100)`).
     - Trips activos (`status` en estados operacionales, `limit(100)`).
     - Incidencias abiertas (`status in ['OPEN', 'IN_REVIEW']`, `limit(50)`).

4. **Paginación Cursor-Based Real para "TODOS":**
   - La pestaña `[ 📋 Todos los Clientes ]` opera mediante paginación real por cursor (`startAfter` / 20 por página con selector Anterior/Siguiente), eliminando cualquier límite artificial o descarga masiva que degrade la memoria del navegador.

5. **Compatibilidad Legacy Multicampo con Deduplicación Atómica:**
   - Las consultas históricas del expediente se ejecutan en paralelo (`Promise.all`) sobre `customerId`, `clienteId`, `userId` y `senderUid`, fusionándose y deduplicándose atómicamente por `doc.id` en memoria. Cero pérdida de pedidos históricos.

6. **Separación Estricta: Métricas Totales vs Timeline (Últimos 20):**
   - El **Timeline** operativo presenta los 20 eventos cronológicos más recientes combinados (Commerce + X→Y).
   - El **Resumen Financiero** (Gasto Total acumulado y Ticket Promedio) se calcula de forma exhaustiva sobre el 100% de las órdenes y viajes recuperados del cliente, garantizando integridad matemática absoluta.

7. **Delegación Operativa Sin Duplicación de Módulos:**
   - Customer 360 no implementa mapas propios ni gestores de pedidos paralelos. Las acciones contextuales delegan a los módulos oficiales mediante `dashboardController.switchTab()` (`liveOrders`, `liveMap`, `deliveryExpress`, `incidentsCenter`).

8. **Aislamiento EIAM:**
   - Desde el módulo Clientes está prohibido mutar roles, contraseñas, claims o estados de habilitación de cuenta. Esas atribuciones pertenecen exclusivamente al Governance Center / EIAM (`users.js`).

### 🚫 Regla de Protección Inviolable:
Queda **TERMINANTEMENTE PROHIBIDO** modificar, alterar o refactorizar este módulo para convertirlo en un listado estático, alterar su resolución multicampo o vulnerar sus contratos financieros y operativos. Cualquier intervención futura requerirá obligatoriamente:
`NUEVA SOLICITUD HUMANA EXPLÍCITA → AUDITORÍA FORENSE DE IMPACTO → AUTORIZACIÓN SEPARADA → HOTFIX QUIRÚRGICO → SUITE E2E → NUEVA CERTIFICACIÓN`.

## Regla de Congelamiento Arquitectónico — Delivery Express X→Y Full Lifecycle & Financial Closure Freeze (ADR-029 / BSD-X2Y-FINAL-CLOSURE-001)

### Principio Fundamental e Inviolable
El ciclo integral de vida, contabilidad y experiencia de usuario de **Delivery Express X→Y** (`serviceType == "X_TO_Y_DELIVERY"`, `/deliveryTrips/{tripId}`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el protocolo **`BSD-X2Y-FINAL-CLOSURE-001`**:

```text
🧊 IDENTIFICADOR: BSD-X2Y-FINAL-CLOSURE-001 / ADR-029
ESTADO: 🟢 FULLY CERTIFIED / DEPLOYED / FROZEN
ENTIDAD PRIMARIA Y SSOT: /deliveryTrips/{tripId}
PROHIBICIÓN ESTRICTA: Cero mutaciones no autorizadas, cero reapertura de micro-fases.
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Nueva Autorización Humana Explícita):
1. **Domain Firewall en Backend Triggers:**
   - `functions/src/triggers/orders.ts`: Omite terminantemente cualquier orden o encomienda con `serviceType === "X_TO_Y_DELIVERY"`. Prohibido liquidar o calcular ganancias X→Y en Commerce.
   - `functions/src/triggers/trips.ts`: Exige estrictamente `serviceType === "X_TO_Y_DELIVERY"`. Es la autoridad financiera y contable exclusiva para X→Y.
2. **Seguridad y Aislamiento en Firestore (`firestore.rules`):**
   - El cliente solo puede escribir claves operativas de efectivo autorizadas (`changeGiven`, `cashCollectedNet`, `discrepancyAmount`, `cashDiscrepancy`, `cashReceived`).
   - Bloqueo absoluto de claves financieras para Courier/Cliente: `pricingSnapshot`, `deliveryFee`, `canonicalPrice`, `courierEarnings`, `platformRevenue` y `financialReconciliationStatus` arrojan `PERMISSION_DENIED`.
3. **App Motorizado (`CourierFinanceCalculator.kt` y `FirebaseManager.kt`):**
   - Resolución canónica de ganancia: `courierTotalEarnings` (C$ 49.40 para caso C$ 85.00). Prohibido reintroducir el fallback a `customerOffer` (que inflaba ganancias a C$ 85.00 y reducía custodia a C$ 0.00).
   - Custodia a entregar: `requiredDeposit = cashCollected - effectiveGanancia = C$ 35.60`.
4. **App Cliente (`OrderDetailScreen.kt`):**
   - Aislamiento visual total de restaurantes/platillos para encomiendas. Tarjeta dedicada X→Y con origen, destino, paquete, distancia, tarifa base, tarifa por km y tarifa de encomienda sin subtotal de productos.
5. **Admin Web (`deliveryExpress.js?v=6.5.0` y `dashboard.html`):**
   - Lectura autoritativa de `/deliveryTrips` como SSOT con badge de reconciliación (`RECONCILED_OK`). Prohibido recalcular tarifas descartando el `roundingAdjustment`.
6. **Contrato de Conservación Monetaria (Caso Maestro C$ 85.00):**
   $$\text{Customer Total (C\$ 85.00)} = \text{Courier Earnings (C\$ 49.40)} + \text{Platform Custody (C\$ 35.60)}$$

### Distinción Operativa:
La certificación técnica y documental da por concluido el ciclo de desarrollo e integración. Cualquier prueba subsiguiente en dispositivos reales constituirá exclusivamente un **Smoke/E2E Production Verification** de la versión ya congelada y desplegada, sin apertura de nuevas fases ni modificaciones de diseño.

**Estado oficial de trabajo:**  
🟢 **DELIVERY EXPRESS X→Y FULL LIFECYCLE & FINANCIAL CORE — CODE FREEZE / PROTECTED 🔒**

## Regla de Congelamiento Arquitectónico — Dashboard Manager Home Governance & 17-Block Canonical Parity Freeze (ADR-030 / BSD-DASHBOARD-MANAGER-HOME-VISIBILITY-PHYSICAL-E2E-001)

### Principio Fundamental e Inviolable
El subsistema de **Gobernanza del Home, Visibilidad de Secciones, Ordenamiento Dinámico y Catálogo General de 17 Bloques** (`/dashboard/configuration` y overrides `/tenants/{tenantId}/dashboard/configuration`) queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise (STATUS: FROZEN / PROTECTED 🔒)** bajo el protocolo **`BSD-DASHBOARD-MANAGER-HOME-VISIBILITY-PHYSICAL-E2E-001`**:

```text
🧊 IDENTIFICADOR: BSD-DASHBOARD-MANAGER-HOME-VISIBILITY-PHYSICAL-E2E-001 / ADR-030
ESTADO: 🔒 PRODUCTION CLOSED / PHYSICAL E2E CERTIFIED / ARCHITECTURAL FREEZE
SSOT DE HOME: /dashboard/configuration (Layout, Visibilidad, Títulos, Acciones)
DISPOSITIVO DE CERTIFICACIÓN FÍSICA: Samsung Galaxy Z Fold 5 (SM-F946U1) — 15/15 Touchpoints PASS
OBSERVED REGRESSIONS: 0
PROHIBICIÓN ESTRICTA: Cero mutaciones de código, cero reapertura empírica sin auditoría y autorización humana.
```

### Componentes Blindados Inmutables (Prohibido Modificar sin Nueva Autorización Humana Explícita):
1. **Admin Web (`panel-admin/public/js/dashboard/dashboardManager.js`):**
   - Registro de los 17 bloques canónicos y sincronización semántica (`CATEGORIES` $\rightarrow$ *"Qué se te antoja hoy"*; `ALL_BUSINESSES` $\rightarrow$ *"Todos los Comercios 🏪"* con clave `showAllBusinesses`).
   - Contador de encabezado `'17 Secciones Dinámicas'` e inmunidad del master service gate `xToYServiceEnabled`.
   - Persistencia atómica con `currentConfig[key] !== false` y guardado defensivo `set(docRef, payload, { merge: true })`.
2. **Modelos y Parsers Defensivos Android (`app/src/main/java/com/example/Models.kt`):**
   - `DashboardConfig.showAllBusinesses: Boolean = true` (backward compatibility para documentos antiguos).
   - Inclusión de `"ALL_BUSINESSES"` en `CANONICAL_DEFAULT_SECTION_ORDER` y `CANONICAL_DEFAULT_BLOCK_TITLES`.
   - Parser defensivo `Map<String, Any?>?.toDashboardConfigSafely(base)` y `DocumentSnapshot?.toDashboardConfigSafely(base)` con preservación estricta de `false` mediante `map.containsKey()`.
3. **Sincronización Reactiva Multi-Tenant (`app/src/main/java/com/example/FirebaseManager.kt`):**
   - Rastreo continuo de `lastGlobalConfig` y algoritmo de merge campo por campo con la base global para evitar que defaults locales anulen el `false` global.
4. **Despacho Dinámico de Feed (`app/src/main/java/com/example/presentation/customer/home/CustomerHomeFeedSection.kt`):**
   - Despacho en bucle de `"ALL_BUSINESSES"` respetando `sectionOrder` dinámico y routing a `DestinationRouter`.
   - Guard de Single Render determinista: `containsAllBusinessesInOrder` asegura exactamente 1 render en bucle o exactamente 1 render en legacy fallback al pie del feed, y 0 renders cuando `showAllBusinesses == false`.
5. **Componente de Catálogo General (`app/src/main/java/com/example/presentation/customer/home/AllBusinessesSection.kt`):**
   - Soporte parametrizado para `title` dinámico (`getDisplayTitle`), `headerAction` (`getBlockAction`) y `onHeaderActionClick`.
6. **Cliente Flutter / iOS (`flutter_client/lib/`):**
   - `catalog_entity.dart`: Inclusión de `'ALL_BUSINESSES'` en `canonicalDefaultSectionOrder` (17 bloques) y `fromMap(..., {DashboardConfigEntity? base})` con merge defensivo.
   - `commercial_home_screen.dart`: Despacho dinámico de `'ALL_BUSINESSES'` en `_renderDynamicSection` y guard determinista de Single Render (`containsAllBusinessesInOrder`).
   - `merchant_service.dart`: Suscripción `watchDashboardConfig` con rastreo y merge sobre la base de configuración global para aislamiento multi-tenant.

### Matriz de los 17 Bloques Canónicos Blindados:
`BANNERS`, `CATEGORIES`, `BRANCHES`, `NEARBY`, `FEATURED_BUSINESSES`, `FEATURED_PRODUCTS`, `FLASH_DEALS`, `PROMOTIONS`, `SAME_PRICE`, `TOP_SELLING`, `RECOMMENDED`, `NEW_BUSINESSES`, `QUICK_REORDER`, `FAVORITES`, `EXPRESS_DELIVERY`, `EDITORIAL_ADS`, `ALL_BUSINESSES`.

### 🚫 Regla de Protección Inviolable:
Queda **TERMINANTEMENTE PROHIBIDO** desincronizar el contrato de 17 bloques entre Admin Web y Android, reintroducir fallbacks con coerción `value || true`, duplicar flags o eliminar el guard de single-render. Cualquier intervención futura requerirá obligatoriamente:  
`NUEVA SOLICITUD HUMANA EXPLÍCITA → AUDITORÍA FORENSE DE IMPACTO → AUTORIZACIÓN SEPARADA → HOTFIX QUIRÚRGICO → SUITE E2E (30 TESTS + 15 TOUCHPOINTS FÍSICOS) → NUEVA CERTIFICACIÓN`.




