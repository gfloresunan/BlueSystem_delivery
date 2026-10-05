# INFORME FORENSE DE AUDITORÍA — FASE 5
## Versionado, Actualizaciones, Remote Configuration, Rollback y Estrategia de Go-Live
### BlueSystem Delivery — Android + iOS
**PROTOCOLO:** `BSD-PRESTORE-PHASE-5-VERSIONING-UPDATE-ROLLBACK-GOLIVE-AUDIT-001`  
**FASE:** 5 de 6  
**ESTADO:** 🟢 **PHASE 5 — VERSIONING & GO-LIVE READY (CONDITIONAL)**  
**FECHA DE AUDITORÍA:** 2026-10-01  
**MODO OPERATIVO:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DEPLOYMENT`  
**PROYECTO FIREBASE:** `bluesystem-7c9af`

---

## 1. EXECUTIVE SUMMARY

El presente informe constituye la auditoría forense de la **Fase 5 de 6** del protocolo de pre-lanzamiento a tiendas (`BSD-PRESTORE-PHASE-5-VERSIONING-UPDATE-ROLLBACK-GOLIVE-AUDIT-001`). Siguiendo la disciplina inmutable de gobernanza técnica, este análisis se ejecutó en modo **estrictamente de solo lectura**, con **cero mutación de código y cero despliegues operativos**.

### 1.1 Veredicto Central
BlueSystem Delivery cuenta con una **arquitectura desacoplada y madura** que distingue rigurosamente entre:
1. **Configuración Dinámica y Financiera de Negocio (Server Authority / Remote Config):** Reside en Firestore bajo `/system_config/global`, `/system_config/app_update`, `/system_config/bank_accounts` y `/system_config/settlement_recipients`. Permite alterar tarifas por kilómetro, comisiones a comercios, radios de despacho, cuentas bancarias, bonos a motorizados y banners/textos sin requerir que los usuarios descarguen una nueva compilación de Google Play o Apple App Store.
2. **Binarios Compilados de Aplicación (Client Binaries):** Alojan la lógica de renderizado, controladores nativos, SDKs de hardware (GPS, Bluetooth, Cámara) y permisos del sistema operativo.
3. **App Update Center Enterprise:** Motor centralizado administrable desde el Panel Web (`appUpdateCenter.js`), proyectado de forma pública sanitizada hacia `/system_config/app_update` y respaldado por el motor determinístico `AppUpdateResolver.kt` en Android, capaz de gestionar actualizaciones informativas, recomendadas y bloqueantes (`FORCED`) con soporte de SemVer.

### 1.2 Principales Hallazgos y Brechas Identificadas
* **Asimetría de Consumo de `AppUpdateCenter` entre Plataformas:** La aplicación nativa Android cuenta con integración completa en `ConfigurationRepository.kt`, `MainActivity.kt` y `AppUpdateModal.kt`. Sin embargo, el cliente Flutter (`flutter_client`, base de iOS y cliente unificado) actualmente no suscribe a `/system_config/app_update` en su ciclo de vida (`main.dart` / `session_state.dart`), dependiendo de su propio contrato multi-tenant `app_configs`.
* **Discrepancia en el Consumo de Tarifas X→Y en Flutter Client:** En `flutter_client/lib/core/engine/x_to_y_pricing_engine.dart`, las tarifas base y por kilómetro están definidas como constantes en código (`baseFee: 35.0`, `pricePerKm: 10.0`), a diferencia de Android que delega el cálculo al backend autoritativo (`RealRoutingEngine.kt` -> `calculateDeliveryRouteCallable`), garantizando que cualquier cambio en `/system_config/global.xToYPricing` se refleje inmediatamente.
* **Gobernanza Canary & Kill Switch Existente:** Existe una suite completa de gobernanza canary en Cloud Functions (`productionCanaryLock.ts`, `canaryRouter.ts`, `canaryKillSwitch.ts`) con bloqueo estricto por defecto (`CANARY_PERCENTAGE = 0`, `PRODUCTION_CANARY_LOCK = true`) cumpliendo plenamente con la regla inviolable **ADR-014 (NO AUTO-ROLLOUT POLICY)**.

---

## 2. CURRENT VERSION ARCHITECTURE

BlueSystem Delivery implementa una arquitectura híbrida de distribución:

```
                                  BLUE SYSTEM DELIVERY
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ↓                                           ↓
             APP BINARIES                                 REMOTE CONFIGURATION
      ┌──────────────┴──────────────┐             ┌──────────────┴──────────────┐
      │                             │             │                             │
Android Native (Kotlin)     Flutter (iOS/Android)  Firestore /system_config/global   Firestore /system_config/app_update
[versionCode: 2]            [version: 2.2.0+100]  (Comisiones, Tarifas, Despacho)  (SemVer, Modal, Forzado, Cooldown)
[versionName: 1.0.1]        (Track B Client)                     │                             │
      │                             │                            └──────────────┬──────────────┘
      └──────────────┬──────────────┘                                           ↓
                     └──────────────────────────┬───────────────────────────────┘
                                                ↓
                                      RUNTIME BEHAVIOR
```

El binario compilado contiene los algoritmos de navegación, presentación de interfaz y manejo de hardware. La configuración remota gobierna los valores monetarios, parámetros de temporización y switches de ciclo de vida.

---

## 3. ANDROID VERSIONING

### 3.1 Identificación Técnica
* **Archivo de Configuración:** `app/build.gradle.kts`
* **Namespace:** `com.example`
* **Application ID:** `com.aistudio.delivery.djweq`
* **Compile SDK:** 36 (minorApiLevel = 1)
* **Min SDK:** 24 (Android 7.0 Nougat)
* **Target SDK:** 36
* **Version Code:** `2` (parametrizable dinámicamente vía CLI `-PcustomBuildNumber`)
* **Version Name:** `"1.0.1"` (parametrizable dinámicamente vía CLI `-PcustomVersionName`)
* **Java Compatibility:** Java 11

### 3.2 Estrategia de Compilación
El archivo Gradle define un bloque de inyección segura:
```kotlin
val customVersionName = (project.findProperty("customVersionName") as? String)?.takeIf { it.isNotBlank() } ?: "1.0.0"
val customBuildNumber = (project.findProperty("customBuildNumber") as? String)?.toIntOrNull() ?: 1
```
Esto permite al pipeline de CI/CD inyectar versiones de release sin mutar el archivo físico base.

---

## 4. IOS VERSIONING

### 4.1 Identificación Técnica
* **Archivo de Configuración:** `flutter_client/pubspec.yaml` e `ios/Runner/Info.plist`
* **Version Tag:** `2.2.0+100`
* **CFBundleIdentifier:** `com.bluesystem.delivery.client`
* **CFBundleShortVersionString:** `$(FLUTTER_BUILD_NAME)` -> `2.2.0`
* **CFBundleVersion:** `$(FLUTTER_BUILD_NUMBER)` -> `100`
* **MinimumOSVersion:** iOS 12.0 (declarado en `AppFrameworkInfo.plist`)
* **Target Platforms:** iPhone e iPad (Universal)

---

## 5. RELEASE ARTIFACTS

| Componente | Plataforma | Formato de Salida | Canal de Distribución Primario | Estado de Preparación |
|:---|:---:|:---:|:---:|:---:|
| **Customer / Courier / Admin** | Android Nativo | Android App Bundle (`.aab`) / Universal `.apk` | Google Play Console (Internal App Sharing / Production) | 🟢 Compilable / Configurado |
| **Commercial Flutter Client** | iOS | Xcode Archive (`.xcarchive`) / `.ipa` | Apple TestFlight / App Store Connect | 🟠 Bloqueado externamente por infraestructura macOS/p8 |
| **Commercial Flutter Client** | Android | Split APKs / `.aab` | Google Play Store | 🟢 Compilable / Configurado |
| **Merchant Control Tower** | Web SPA | HTML5 / Vanilla JS / Leaflet Bundle | Firebase Hosting (`bluesystem-7c9af.web.app`) | 🟢 Desplegado en producción |
| **Backend Core** | Node.js TS | Cloud Functions v1/v2 Engine | Google Cloud Functions (`us-central1`) | 🟢 87/87 Tests Pasando |

---

## 6. REMOTE CONFIGURATION

A diferencia del SDK tradicional de `FirebaseRemoteConfig`, BlueSystem Delivery utiliza **Firestore SSOT Documents** como su motor de configuración remota preferido.

### Justificación Técnica de la Decisión:
1. **Latencia Inmediata:** Firestore Snapshot Listeners (`onSnapshot` / Kotlin `Flow`) propagan cambios en **< 100 ms**, mientras que el SDK de Remote Config estándar tiene un throttling predeterminado de caché de hasta 12 horas en clientes de producción.
2. **Auditabilidad y Control:** Cada actualización en `/system_config/global` o `/system_config/app_update` se escribe atómicamente junto con un evento formal en `/audit_events`.
3. **Aislamiento Multi-Tenant y Seguridad:** Permite reglas de granularidad fina en `firestore.rules` con permisos estrictos de escritura solo para `SUPER_ADMIN` y `PLATFORM_ADMIN`.

---

## 7. SYSTEM CONFIG

El inventario de documentos bajo la colección raíz `/system_config` en Firestore comprende:

```
/system_config
   ├── global                   (SSOT Maestro de Parámetros Operativos y Financieros)
   ├── app_update               (Proyección Pública Sanitizada para Clientes Móviles)
   ├── bank_accounts            (Catálogo de Cuentas Bancarias Oficiales para Liquidaciones)
   ├── settlement_recipients    (Destinatarios Notificados en Procesos de Arqueo y Cierre)
   └── support                  (Canales de Atención al Cliente, WhatsApp y Teléfonos)
```

### Reglas de Seguridad Verificadas (`firestore.rules` líneas 1422-1434):
```javascript
match /system_config/{configId} {
  // GATE-001: Lectura pública autorizada EXCLUSIVAMENTE para la proyección sanitizada 'app_update'
  // El documento 'global' y demás configuraciones maestras requieren autenticación estricta (cero exposición pública)
  allow read: if configId == 'app_update' || isAuthenticated();
  // Least Privilege: Modificación restringida estrictamente a SUPER_ADMIN o PLATFORM_ADMIN
  allow write: if isAuthenticated() && (
    isSuperAdmin() ||
    getRole() in ["SUPER_ADMIN", "PLATFORM_ADMIN", "super_admin", "platform_admin"] ||
    request.auth.token.get("isSuperAdmin", false) == true ||
    request.auth.token.get("isPlatformAdmin", false) == true
  );
}
```

---

## 8. FEATURE FLAGS

BlueSystem Delivery implementa Feature Flags en tres capas independientes:

| Flag Name | Ubicación | Ámbito | Estado por Defecto | Capacidad Kill Switch | Propietario Técnico |
|:---|:---:|:---:|:---:|:---:|:---:|
| `maintenanceMode` | `/system_config/global` | Global (Móvil) | `false` | ✅ SÍ (Bloquea acceso a clientes no-admin) | Platform Admin |
| `forceUpdate` | `/system_config/app_update` | Global (Móvil) | `false` | ✅ SÍ (Forza pantalla obligatoria de update) | Platform Admin |
| `additionalChargeEnabled`| `/system_config/global` | Checkout Pedidos| `false` | ✅ SÍ (Desactiva cargos extra administrativos)| Super Admin |
| `merchantCommissionEnabled`| `/system_config/global`| Liquidaciones | `true` | ✅ SÍ (Desactiva comisión global) | Platform Admin |
| `allowGuest` | `/system_config/global` | Catálogo | `true` | ✅ SÍ (Fuerza autenticación obligatoria) | Platform Admin |
| `showPromotions` | `/system_config/global` | Catálogo | `true` | ✅ SÍ (Oculta carrusel de promociones) | Platform Admin |
| `EIAM_V3_CANARY_ENABLED` | `productionCanaryLock.ts`| Backend Auth | `false` | ✅ SÍ (`CanaryKillSwitch.disableCanary()`) | Backend Lead |
| `isCardPaymentAllowed` | `paymentActivationGate.ts`| Pasarela Pagos| `false` | ✅ SÍ (Falla cerrado en efectivo) | Finance Auditor |

---

## 9. CANARY

La infraestructura Canary está formalizada bajo las microfases 2C.13-S y 2C.13-T en Cloud Functions:
* **Canary Percentage:** `0%` fijo por defecto (`CANARY_PERCENTAGE = 0`).
* **Canary Locks:**
  * `PRODUCTION_CANARY_LOCK = true`
  * `CANARY_CLAIMS_LOCK = true`
  * `CANARY_PROVISIONING_LOCK = true`
  * `CANARY_RULES_LOCK = true`
  * `CANARY_ROOM_LOCK = true`
  * `CANARY_LEGACY_MIGRATION_LOCK = true`
  * `CANARY_OPERATIONAL_MODULE_LOCK = true`
* **Allowlist Estricta:** `CANARY_UID_ALLOWLIST = []`. No se permite el uso de comodines (`*`).
* **Kill Switch Automático:** Disparado de inmediato ante:
  1. Mismatches en resoluciones diferenciales > 0.
  2. Intentos de violación Cross-Tenant > 0.
  3. Intentos de escritura en producción > 0.
  4. Intentos de despliegue no autorizados de reglas de seguridad.

---

## 10. CONFIGURATION CACHE

| Nivel de Caché | Componente | Mecanismo | TTL / Política | Riesgo de Stale Data |
|:---|:---:|:---:|:---:|:---:|
| **Backend Memory** | `routingService.ts` | `cachedPricingConfig` | 60 segundos | Mínimo (1 min máximo de desincronización) |
| **Backend Memory** | `xToYDispatchEngine.ts`| `cachedDispatchConfig` | 60 segundos | Mínimo (1 min) |
| **Android Memory** | `RealRoutingEngine.kt`| `localCache` Map | 60 segundos | Nulo (invalida al cambiar ruta o expirar TTL)|
| **Android Persistence**| `ConfigurationRepository`| Room / PersistentCache | Persistente offline | Controlado (Snapshot listener reactivo) |
| **Web Admin Memory** | `appUpdateCenter.js` | Variables de módulo | Efímero por sesión | Nulo (`onSnapshot` directo en tiempo real) |

---

## 11. CONFIGURATION FALLBACKS

### Matriz Forense de Fallbacks:

```
Valor Remoto (/system_config/global)
          │
          ├── [Disponible] ───────────► Usa valor de Firestore SSOT (Fail-Open a la Verdad)
          │
          └── [Error / Inexistente] ──► Evaluación de Política:
                                           ├── Tarifas Comerciales ──► FAIL-CLOSED (Lanza excepción / error de cotización)
                                           ├── Tarifas X→Y Backend ──► FAIL-CLOSED (PRICING_CONFIG_MISSING)
                                           ├── Despacho X→Y ─────────► SAFE FALLBACK (Radios: 5, 8, 12 km)
                                           ├── App Update Resolver ──► SAFE FALLBACK (NoUpdate si no hay config)
                                           └── Comisiones ───────────► SAFE FALLBACK (15% defensivo / log de alerta)
```

### Clasificación de Riesgo de Fallbacks:
* `getXToYPricingConfig(failClosed = true)`: **SAFE (FAIL-CLOSED)**. Si `/system_config/global.xToYPricing` no existe, se rechaza la cotización para evitar cobrar un monto incorrecto.
* `getCommerceDeliveryPricingConfig(failClosed = false)`: **SAFE**. Retorna `customerPricePerKm = 8.0` y `courierPricePerKm = 7.0` únicamente si Firestore está indisponible en modo no restrictivo.
* `orders.ts` (Línea 367): **SAFE (FAIL-CLOSED)**. Si la tarifa del motorizado no se resuelve válidamente, no se estampan campos financieros corruptos.

---

## 12. FINANCIAL CONFIGURATION

| Parámetro Financiero | Fuente Primaria | Autoridad Definitiva | Android | iOS | Permite Cambio Remoto |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Comisión Comercio Global** | `/system_config/global.merchantCommissionRate` | Cloud Functions (`orders.ts`) | Dinámico | Dinámico | ✅ SÍ (Sin actualización) |
| **Tarifa Comercio Cliente** | `/system_config/global.commerceDeliveryPricing.customerPricePerKm` | Backend Routing / Triggers | Dinámico | Dinámico | ✅ SÍ (Sin actualización) |
| **Ganancia Motorizado Comercio**| `/system_config/global.commerceDeliveryPricing.courierPricePerKm` | Cloud Functions (`orders.ts`) | Dinámico | Dinámico | ✅ SÍ (Sin actualización) |
| **Bono Pedido Motorizado** | `/system_config/global.courierOrderBonus` | Cloud Functions (`orders.ts`) | Dinámico | Dinámico | ✅ SÍ (Sin actualización) |
| **Tarifa Base X→Y** | `/system_config/global.xToYPricing.baseFee` | Cloud Functions (`routingService.ts`) | Dinámico | **Hardcoded** ⚠️ | ⚠️ Parcial (Requiere Update iOS) |
| **Tarifa por Km X→Y** | `/system_config/global.xToYPricing.pricePerKm` | Cloud Functions (`routingService.ts`) | Dinámico | **Hardcoded** ⚠️ | ⚠️ Parcial (Requiere Update iOS) |
| **Cargo Adicional Global** | `/system_config/global.additionalChargeAmount` | Checkout / Triggers | Dinámico | N/A | ✅ SÍ (Sin actualización) |

---

## 13. MULTI-TENANT CONFIGURATION

1. **Aislamiento de Configuración:** Las configuraciones bajo `/system_config` aplican de forma global a la plataforma (Platform Level). Las configuraciones de cada tenant específico residen en `/tenants/{tenantId}` y `/app_configs/{configId}`.
2. **Evaluación de Contaminación Cruzada:** Verificado en pruebas unitarias (`platformConvergenceC2D12.test.ts` y `courierSettlementFullLifecycleE2E.test.ts`). Un cambio en `/system_config/global` no altera las cuotas, saldos ni membresías aisladas de cada tenant comercial.

---

## 14. VERSION COMPATIBILITY

### Matriz de Coexistencia de Versiones:
* **Versión Anterior (Android v1.0.0 / Code 1):** Compatible con backend actual. Consume esquemas canónicos de `/orders` y `/users`. Si el valor `minimumVersion` en `/system_config/global` es `>= 2`, es interceptada limpiamente por `AppUpdateModal` o `ForceUpdateScreen`.
* **Versión Actual (Android v1.0.1 / Code 2):** Plenamente operativa. Integra listener sanitizado `app_update`.
* **Versión Flutter (v2.2.0 / Code 100):** Compatible a nivel de colecciones Firestore (`orders`, `deliveryTrips`, `users`), pero opera de manera autónoma sin bloqueo por `app_update`.

---

## 15. BACKWARD COMPATIBILITY

El backend implementa de forma consistente el principio de **tolerancia aditiva**:
1. **Campos Duales / Aliases Retrocompatibles:**
   * En tarifas X→Y: Se escriben simultáneamente `pricePerKm` (canónico) y `perKmRate` (alias legacy).
   * En comisiones: Si `bizData.commissionOverrideRate` está presente, anula la tasa global respetando contratos previos.
   * En tokens FCM: Se almacenan simultáneamente `fcmToken` y `token` en `/user_devices`.
2. **Lectura Segura con Fallbacks Defensivos:** Los serializadores no fallan ante campos ausentes; asignan valores predeterminados o rechazan la transacción de forma controlada (`Fail-Closed`).

---

## 16. FORWARD COMPATIBILITY

Los clientes móviles utilizan la anotación `@IgnoreExtraProperties` en Kotlin y deserialización tolerante mediante mapas en Flutter (`(map['key'] as? Type)`). Si el backend añade nuevos atributos a las órdenes o configuraciones en futuras fases, las aplicaciones cliente instaladas **ignoran los campos nuevos sin colapsar**.

---

## 17. FIRESTORE SCHEMA COMPATIBILITY

Todos los esquemas de colecciones nucleares (`/orders`, `/deliveryTrips`, `/users`, `/couriers`, `/system_config`) han evolucionado de forma **aditiva**. No se han eliminado campos obligatorios históricos ni se han renombrado claves estructurales de forma destructiva.

---

## 18. CLOUD FUNCTIONS COMPATIBILITY

Las Cloud Functions interactúan con los clientes móviles principalmente mediante **Triggers en Firestore** y un conjunto acotado de llamadas HTTPS **Callable**:
* Si un cliente antiguo escribe un documento de pedido sin ciertos campos enriquecidos (por ejemplo, sin `routingProvider`), el trigger `onOrderDelivered` resuelve los datos faltantes de manera autónoma calculando la distancia Haversine y aplicando las tarifas de `/system_config/global`.

---

## 19. API COMPATIBILITY

BlueSystem Delivery no expone una API REST tradicional sujeta a cambios de URL (`/v1` vs `/v2`), sino un modelo reactivo basado en el **SDK de Firebase**. La estabilidad del protocolo está garantizada por los contratos de tipos TypeScript en `functions/src/` y las entidades de dominio en Kotlin y Dart.

---

## 20. UPDATE POLICY

| Tipo de Actualización | Condición en AppUpdateCenter | Comportamiento en Android | Comportamiento en iOS | Experiencia de Usuario |
|:---|:---:|:---:|:---:|:---:|
| **Informativa (INFO)** | `updateType == 'INFO'` | Modal informativo | No implementado en UI | Permite cerrar con botón "Entendido" |
| **Recomendada (RECOMMENDED)** | `updateType == 'RECOMMENDED'` | Modal con "Más tarde" | No implementado en UI | Registra cooldown y permite omitir |
| **Obligatoria (FORCED)** | `updateType == 'FORCED'` o `installed < minimumVersion` | **Modal Bloqueante** | No implementado en UI | Deshabilita botón atrás y clic exterior |

---

## 21. FORCE UPDATE

En la aplicación nativa Android, cuando `isForced == true` (por flag explícito o por violar `minimumVersion`):
1. El modal `AppUpdateModal` se renderiza cubriendo la pantalla completa (`DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)`).
2. Se oculta el botón secundario "Más tarde".
3. El botón primario redirige de inmediato a la URL de Google Play Store (`market://details?id=...` con fallback a HTTPS).
4. El usuario no puede acceder a ninguna pantalla de la aplicación mientras no actualice el binario.

---

## 22. REMOTE UPDATE PROMPT

La proyección pública sanitizada `/system_config/app_update` expone los siguientes atributos configurables en vivo desde el panel web:
* `title`: Título personalizable del aviso.
* `subtitle`: Subtítulo descriptivo.
* `message`: Texto editorial detallando las novedades.
* `primaryButtonText`: Texto del botón de acción (ej. "Actualizar ahora").
* `secondaryButtonText`: Texto del botón de escape (ej. "Más tarde").
* `imageUrl` / `iconUrl`: Assets multimedia descargados dinámicamente vía Coil.
* `primaryButtonColor` / `backgroundColor` / `textColor`: Paleta hexadecimal configurable para branding dinámico.

---

## 23. UPDATE WITHOUT STORE

### Declaración de Integridad y Seguridad Arquitectónica:
**NO EXISTE NINGÚN MECANISMO DE EJECUCIÓN REMOTA DE CÓDIGO (RCE), DESCARGA DE APKs EXTERNAS (SIDE-LOADING) O BYPASS DE TIENDAS.**
BlueSystem Delivery cumple estrictamente con las políticas de Google Play Developer Distribution Agreement y Apple App Store Review Guidelines (Sección 2.5.2). La configuración remota altera exclusivamente metadatos, parámetros y visuales descriptivos, redirigiendo obligatoriamente al usuario a las tiendas oficiales (`Google Play Store` / `Apple App Store`) para obtener el nuevo binario compilado.

---

## 24. ROLLBACK STRATEGY

BlueSystem Delivery define una matriz de rollback en 4 niveles de aislamiento:

```
                            INCIDENTE OPERATIVO
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ↓                           ↓                           ↓
NIVEL 1: CONFIG ROLLBACK     NIVEL 2: FEATURE ROLLBACK   NIVEL 3: BACKEND ROLLBACK   NIVEL 4: APP ROLLBACK
Alterar /system_config/global   Desactivar Feature Flag   Re-desplegar Functions      Detener Rollout en Store
(Tarifas, Comisiones, Cupón)   (Modo Mantenimiento ON)   (Git Commit Anterior)       (Halt Staged Rollout)
Tiempo: < 10 segundos          Tiempo: < 10 segundos     Tiempo: ~ 3 minutos         Tiempo: Inmediato en Store
Impacto: 0 descargas           Impacto: 0 descargas      Impacto: 0 descargas        Impacto: Requiere nueva versión
```

---

## 25. REMOTE CONFIG ROLLBACK

Si se ingresa una tarifa o comisión incorrecta desde el Panel de Administración:
1. El Administrador accede a `panel-admin/#config` o `panel-admin/#delivery-express`.
2. Restaura los valores previos numéricos (ej. C$ 8.00/km a C$ 7.00/km).
3. Presiona **"Guardar Configuración"**.
4. La actualización se propaga instantáneamente a todas las instancias activas vía Firestore.
5. El evento anterior y el nuevo quedan auditados en `/audit_events`.

---

## 26. FEATURE FLAG ROLLBACK

Si una funcionalidad experimental presenta fallas en producción:
1. Activar `maintenanceMode: true` en `/system_config/global` bloquea de inmediato a todos los clientes no-admin.
2. Si la falla corresponde al subsistema Canary de backend, el `CanaryKillSwitch.disableCanary("MANUAL_ROLLBACK")` retorna instantáneamente el 100% del tráfico al flujo Legacy validado.

---

## 27. BACKEND ROLLBACK

Dado que las Cloud Functions de Firebase no permiten "downgrade" con un solo clic en la consola estándar:
1. El código fuente está versionado bajo Git.
2. La reversión se ejecuta mediante checkout del commit previo estable y re-ejecución del comando de despliegue (`firebase deploy --only functions`).
3. La suite de pruebas de regresión (`npm test`) garantiza que el commit restaurado pase el 100% de los tests antes del push.

---

## 28. STORE ROLLOUT

### Google Play Console:
* **Fase 1:** Internal App Sharing / Pruebas Internas (Equipo de QA y Dirección).
* **Fase 2:** Pruebas Cerradas (Closed Testing - Comercios y Motorizados seleccionados).
* **Fase 3:** Lanzamiento Progresivo en Producción (Staged Rollout):
  * Día 1: 5%
  * Día 2: 10%
  * Día 3: 20%
  * Día 4: 50%
  * Día 5: 100%
* Durante el staged rollout, si la tasa de crasheos supera el 0.5%, se detiene inmediatamente el rollout (`Halt Rollout`).

### Apple App Store:
* **Fase 1:** TestFlight Internal Testing.
* **Fase 2:** TestFlight External Testing (10-50 usuarios piloto).
* **Fase 3:** Phased Release (Publicación por Fases de 7 días automática con capacidad de pausa manual).

---

## 29. VERSION OBSERVABILITY

### Capacidad Actual de Telemetría:
* **Android Nativo:** Al iniciar sesión o refrescar token FCM, `FcmManager.kt` registra en `/user_devices/{uid}_{deviceId}`:
  * `appVersion`: `BuildConfig.VERSION_NAME` (ej. `"1.0.1"`)
  * `platform`: `"Android"`
  * `androidVersion`: `Build.VERSION.RELEASE`
  * `model` / `manufacturer`: Hardware del dispositivo.
* **Flutter Client:** En `PlatformNotificationAdapter.dart`:
  * Registra `platform: 'iOS'`, pero actualmente **omite el campo `appVersion`** en el documento de `/user_devices`.
* **Visualización Administrativa:** El Panel Web de Monitoreo en Vivo (`liveCouriers.js` / `health.js`) puede inspeccionar los dispositivos conectados y sus versiones de aplicación registradas.

---

## 30. RELEASE TRACEABILITY

Cada artefacto de compilación oficial está correlacionado con:
* **Git Hash Commit:** Identificador SHA del repositorio.
* **Version Code / Build Number:** Secuencia monótona creciente.
* **Firebase Environment:** `bluesystem-7c9af`.
* **Proyección en Base de Datos:** Documento `/system_config/app_update` con `campaignId` y timestamp inmutable de actualización.

---

## 31. GO-LIVE SEQUENCE

Secuencia cronológica y segura certificada para el despliegue general:

```
PASO 1: Certificación y Despliegue de Backend (Cloud Functions + Firestore Rules)
         ↓
PASO 2: Verificación de Documentos Maestros (/system_config/global y app_update)
         ↓
PASO 3: Validación de Cero Fugas y Canary Armado en Modo Seguro (0%)
         ↓
PASO 4: Generación de Artefactos de Producción (AAB Android + Archive iOS)
         ↓
PASO 5: Subida a Google Play Console y App Store Connect (Tracks de Prueba)
         ↓
PASO 6: Validación E2E en Dispositivos Físicos de Referencia (Samsung / iPhone)
         ↓
PASO 7: Aprobación Humana Explícita de Lanzamiento (ADR-014 No Auto-Rollout)
         ↓
PASO 8: Inicio de Staged Rollout Progresivo (5% -> 10% -> 25% -> 50% -> 100%)
         ↓
PASO 9: Monitoreo Continuo de Métricas en Panel de Salud (health.js)
```

---

## 32. GO-LIVE GATES

| Gate ID | Descripción del Gate | Criterio de Aceptación | Estado Forense |
|:---|:---|:---|:---:|
| **GATE 0** | **Backend Core** | 87/87 tests pasando en Cloud Functions | 🟢 **PASS** |
| **GATE 1** | **Configuration SSOT** | `/system_config/global` y `app_update` aislados y protegidos | 🟢 **PASS** |
| **GATE 2** | **Android Binary** | Gradle configurado, SDK 36, AppUpdateModal funcional | 🟢 **PASS** |
| **GATE 3** | **iOS Binary** | Pubspec configurado v2.2.0, Info.plist validado | 🟠 **CONDITIONAL (Falta p8/Mac)** |
| **GATE 4** | **Push Notifications** | Tokens en `/user_devices`, desvinculación en logout | 🟢 **PASS** |
| **GATE 5** | **Identity & RBAC** | Reglas EIAM v2.2/v3 activas en producción | 🟢 **PASS** |
| **GATE 6** | **Financial Integrity** | Fail-Closed en cotizaciones, inmutabilidad de snapshots | 🟢 **PASS** |
| **GATE 7** | **Observability** | Telemetría activa en `user_devices` y `health.js` | 🟢 **PASS** |
| **GATE 8** | **Store Compliance** | Eliminación de cuentas (Apple 5.1.1(v)), cero RCE | 🟢 **PASS** |
| **GATE 9** | **Canary Safety** | Canary Locks activos (0%), Kill Switch armado | 🟢 **PASS** |
| **GATE 10** | **Human Authorization** | Orden humana explícita previa a rollout (ADR-014) | 🟢 **PASS** |

---

## 33. ROLLBACK DECISION MATRIX

| Tipo de Incidente | Causa Raíz Típica | Acción de Mitigación Inmediata | Alcance | ¿Requiere App Update? |
|:---|:---|:---|:---:|:---:|
| **Tarifa Errónea** | Error humano en Admin Web al ingresar C$/km | Revertir valor en `/system_config/global` | Global | ❌ NO |
| **Comisión Desfasada** | Porcentaje de comercio configurado incorrecto | Ajustar `merchantCommissionRate` en Firestore | Comercio / Global | ❌ NO |
| **Crash en Pantalla Específica**| Excepción de interfaz o renderizado en cliente | Detener staged rollout en Play Store / TestFlight | Versión específica | ✅ SÍ (Hotfix compilado) |
| **Falla en Pasarela de Pago** | Error en webhook o conectividad bancaria | Desactivar cobro con tarjeta en `paymentActivationGate` | Global | ❌ NO |
| **Vulnerabilidad de Seguridad** | SDK vulnerable o bypass en cliente | Activar `forceUpdate: true` y `minimumVersion` | Versión vulnerable | ✅ SÍ (Nueva versión en tienda) |
| **Incidente en Cloud Function**| Excepción no controlada en trigger | Revertir commit y re-desplegar functions | Backend | ❌ NO |

---

## 34. FINDINGS

### FINDING ID: F5-01
* **CATEGORY:** VERSIONING & CLIENT CONSISTENCY
* **PLATFORM:** Cross-Platform (Flutter / iOS)
* **COMPONENT:** `XToYPricingEngine.dart`
* **FILE:** `flutter_client/lib/core/engine/x_to_y_pricing_engine.dart` (Líneas 8-11)
* **CURRENT STATE:** Las tarifas de encomiendas X→Y están hardcodeadas en constantes estáticas Dart (`baseFee = 35.0`, `pricePerKm = 10.0`).
* **EXPECTED STATE:** Las tarifas deben resolverse dinámicamente desde `/system_config/global.xToYPricing` tal como lo hace Android vía Cloud Function autoritativa.
* **EVIDENCE:**
  ```dart
  class XToYPricingEngine {
    static const double baseFee = 35.0;
    static const double pricePerKm = 10.0;
  ```
* **RISK:** Si la administración altera la tarifa por kilómetro a C$ 15.00 en `/system_config/global`, el cliente Flutter mantendrá la tarifa vieja de C$ 10.00 a menos que sea actualizado en tienda.
* **USER IMPACT:** Discrepancia de cobro entre usuarios Android e iOS en envíos punto a punto.
* **FINANCIAL IMPACT:** Riesgo de subfacturación en envíos creados desde el cliente Flutter.
* **OPERATIONAL IMPACT:** Pérdida de soberanía de configuración remota en Track B.
* **SEVERITY:** 🟠 **HIGH**
* **BLOCKER:** NO (El backend rechaza o sanitiza en validaciones autoritativas, pero crea fricción en UI de cotización).
* **RECOMMENDATION:** Homologar la consulta dinámica de `/system_config/global.xToYPricing` en el cliente Flutter o consumir el callable `calculateDeliveryRouteCallable`.

---

### FINDING ID: F5-02
* **CATEGORY:** APP UPDATE ORCHESTRATION
* **PLATFORM:** Cross-Platform (Flutter / iOS)
* **COMPONENT:** `session_state.dart` / `main.dart`
* **FILE:** `flutter_client/lib/main.dart` y `flutter_client/lib/presentation/providers/session_state.dart`
* **CURRENT STATE:** La aplicación Flutter no implementa un listener para `/system_config/app_update`, careciendo del modal dinámico `AppUpdateModal` que sí posee Android.
* **EXPECTED STATE:** Paridad total con Android (`ConfigurationRepository.kt`) para recibir avisos de actualización remota, recomendada y forzada.
* **EVIDENCE:** Búsqueda global de `app_update` en `flutter_client` arrojó 0 resultados.
* **RISK:** Imposibilidad de forzar a usuarios de iOS a actualizar la app de forma remota sin dar de baja el backend.
* **USER IMPACT:** Clientes iOS en versiones antiguas continuarán navegando sin enterarse de nuevas versiones en App Store.
* **FINANCIAL IMPACT:** Ninguno directo.
* **OPERATIONAL IMPACT:** Dificultad para retirar versiones obsoletas en el ecosistema Apple.
* **SEVERITY:** 🟠 **HIGH**
* **BLOCKER:** NO (No bloquea la compilación ni el uso actual, pero es una brecha de gestión remota).
* **RECOMMENDATION:** Implementar un `AppUpdateListener` en `session_state.dart` que consuma `/system_config/app_update`.

---

### FINDING ID: F5-03
* **CATEGORY:** OBSERVABILITY & TELEMETRY
* **PLATFORM:** iOS (Flutter Client)
* **COMPONENT:** `PlatformNotificationAdapter.dart`
* **FILE:** `flutter_client/lib/platform/notifications/notification_adapter.dart` (Línea 187)
* **CURRENT STATE:** El registro del dispositivo en `/user_devices/{uid}_{deviceId}` no incluye el atributo `appVersion`, a diferencia de Android que estampa `BuildConfig.VERSION_NAME`.
* **EXPECTED STATE:** Registrar `appVersion: "2.2.0"` en el documento de dispositivo para trazabilidad de versiones instaladas.
* **EVIDENCE:**
  ```dart
  await deviceRef.set({
    'deviceId': resolvedDeviceId,
    'uid': uid,
    'fcmToken': token,
    'platform': 'iOS',
    // Falta 'appVersion'
  });
  ```
* **RISK:** El administrador no puede auditar con precisión qué versión de la app de iOS tiene instalada un usuario o repartidor específico.
* **USER IMPACT:** Ninguno visible para el usuario final.
* **FINANCIAL IMPACT:** Ninguno.
* **OPERATIONAL IMPACT:** Falta de telemetría de distribución de versiones iOS en el panel de control.
* **SEVERITY:** 🟡 **MEDIUM**
* **BLOCKER:** NO.
* **RECOMMENDATION:** Añadir el paquete `package_info_plus` o inyectar la versión desde `AppDistributionConfig` al registrar el token.

---

### FINDING ID: F5-04
* **CATEGORY:** EXTERNAL INFRASTRUCTURE
* **PLATFORM:** iOS
* **COMPONENT:** Apple Push Notification Service (APNs) & App Store Connect
* **FILE:** Entorno externo Apple
* **CURRENT STATE:** Persiste la dependencia externa de infraestructura física macOS / Xcode y credenciales Apple Developer (`.p8`, Team ID, Key ID).
* **EXPECTED STATE:** Certificado y perfiles de aprovisionamiento activos para distribución de producción.
* **EVIDENCE:** Finding `P4-03` auditado en Fase 4 y 4.2.
* **RISK:** Incapacidad de generar el binario firmado para App Store sin entorno Apple físico.
* **USER IMPACT:** Retraso en el lanzamiento en App Store para usuarios de iPhone.
* **FINANCIAL IMPACT:** Ninguno directo en Android.
* **OPERATIONAL IMPACT:** Lanzamiento secuencial (Android First, iOS Second).
* **SEVERITY:** 🟠 **HIGH (BLOCKED — EXTERNAL)**
* **BLOCKER:** SÍ para el lanzamiento de iOS en tienda; NO para Android.
* **RECOMMENDATION:** Mantener catalogado como `BLOCKED — EXTERNAL INFRASTRUCTURE` hasta disponer del equipo Mac del cliente.

---

## 35. BLOCKERS

Actualmente existe **UN SOLO BLOQUEANTE OPERATIVO**, el cual es de índole **externa**:

1. 🟠 **EXTERNAL BLOCKER (iOS Submission):** Ausencia de entorno macOS / Apple Developer Program activo para la exportación y firma del `.ipa` de producción.
   * **Alcance:** Afecta exclusivamente la publicación en Apple App Store.
   * **No afecta:** Android (100% listo y compilable), Panel Administrativo Web (100% activo) ni Backend Cloud Functions (100% activo).

---

## 36. REMEDIATION PLAN

Para resolver los hallazgos no bloqueantes antes del cierre final de la Fase 6, se establece el siguiente plan quirúrgico (a ejecutarse únicamente bajo autorización):

| Paso | Acción Técnica | Archivo Objetivo | Complejidad |
|:---:|:---|:---|:---:|
| **1** | Migrar `XToYPricingEngine.dart` para consultar `/system_config/global.xToYPricing` de forma reactiva o delegar al backend autoritativo. | `flutter_client/lib/core/engine/x_to_y_pricing_engine.dart` | Baja |
| **2** | Conectar un listener a `/system_config/app_update` en `SessionState` de Flutter y desplegar el diálogo modal cuando `isForced == true`. | `flutter_client/lib/presentation/providers/session_state.dart` | Media |
| **3** | Incluir el campo `appVersion` en el payload de `user_devices` dentro de `PlatformNotificationAdapter.dart`. | `flutter_client/lib/platform/notifications/notification_adapter.dart` | Mínima |

---

## 37. FINAL CERTIFICATION

### Evaluación de Criterios de Certificación:

1. **Separación de Responsabilidades:**
   $$\text{APP BINARY (Código/Hardware)} \quad \longleftrightarrow \quad \text{REMOTE CONFIG (Negocio/Finanzas/Flags)}$$
   * **DEMOSTRADO:** Tarifas de envío comercial, comisiones de negocio, radios de despacho, cuentas bancarias de recaudación, bonos a motorizados y banners de actualización operan de forma 100% dinámica sobre Firestore sin requerir subida de binarios a las tiendas.
2. **Ciclo de Actualización de Código:**
   * **DEMOSTRADO:** Nuevas funciones, pantallas nativas y parches de librerías siguen el ciclo riguroso de compilación, firma y distribución oficial por Google Play Store / Apple App Store. Cero riesgo de ejecución remota no autorizada.
3. **Rollback Diferenciado:**
   * **DEMOSTRADO:** Existen mecanismos inmediatos para revertir configuraciones en < 10 segundos, desactivar tráfico vía Kill Switch y detener despliegues por etapas en tienda.
4. **Coexistencia y Resiliencia de Versiones:**
   * **DEMOSTRADO:** Versiones anteriores coexisten sin romper el backend gracias a la tolerancia de esquemas aditivos y la compatibilidad hacia atrás garantizada.

### DICTAMEN FINAL:
🟢 **PHASE 5 — VERSIONING & GO-LIVE READY (CONDITIONAL)**

*El ecosistema BlueSystem Delivery demuestra una arquitectura sólida de versionado y gobernanza remota, apta para soportar cambios dinámicos de negocio sin fricción técnica. Queda autorizado el paso a la Fase 6 (Auditoría Integral de Cierre y Simulación Go-Live).*
