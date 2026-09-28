# BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001-AUDIT.md
# BLUE SYSTEM DELIVERY ENTERPRISE — FORENSIC AUDIT & ROOT CAUSE ANALYSIS REPORT
**Audit ID:** BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001  
**Target Domain:** Merchant Operating Hours & Store Availability Lifecycle  
**Platforms Audited:** Merchant Web (`merchant-web/`), Customer App Android (`app/`), Firestore Schema & Rules (`firestore.rules`), Cloud Functions (`functions/`), Admin Web (`panel-admin/`)  
**Status:** 🟢 AUDIT COMPLETED — ROOT CAUSE IDENTIFIED  

---

## 1. Executive Summary
An exhaustive, code-level forensic audit was conducted across all repositories and platforms of BlueSystem Delivery Enterprise to identify the root cause of discrepancies in merchant opening and closing hours, real-time availability, visibility in the marketplace, and order acceptance.

The investigation demonstrated that while the Merchant Web interface (`merchant-web/src/modules/SettingsModule.tsx`) provides a UI for configuring weekly schedules, **the operating hours (`schedule`) are persisted exclusively to private merchant documents (`/restaurant_settings/{merchantId}`) and are NEVER projected or synchronized to the public collections (`/businesses` and `/branches`) that the Customer App and Marketplace consume**. 

Furthermore, throughout the entire Customer App and Admin Web, store availability is evaluated as a static stored boolean flag (`isOpen && abierto`) rather than a dynamic temporal evaluation against the merchant's canonical schedule and operating timezone (`America/Managua`). As a result, stores configured with an active switch remain marked as "ABIERTO 🟢" 24/7—even at 3:00 AM on closed days—and orders can be submitted outside operational hours.

A surgical, unified **OperatingHoursResolver** and canonical data synchronization plan has been designed to resolve this end-to-end without breaking any existing contracts or migrating production data.

---

## 2. Scope
The audit inspected the complete lifecycle of operating hours across:
1. **Merchant Web:** `merchant-web/src/modules/SettingsModule.tsx`, `OnboardingWizardModule.tsx`, `onboardingValidator.ts`.
2. **Customer App Android:** `BusinessRepository.kt`, `BusinessInfo`, `Branch.kt`, `RestaurantSettingsRepository.kt`, `CustomerHomeScreen.kt`, `PublicBusinessCard.kt`, `FavoritesScreen.kt`, `CuratedBusinessSections.kt`, `ComercioDetalleScreen.kt`, `ComercioDetalleViewModel.kt`, `CartCheckoutDialog.kt`, `CustomerHomeViewModel.kt`, `AvailabilityEngine.kt`.
3. **Firestore Security & Data Contracts:** `firestore.rules` (rules for `/restaurant_settings`, `/businesses`, `/branches`).
4. **Cloud Functions:** `functions/src/triggers/businessProjection.ts`, `functions/src/triggers/orders.ts`.
5. **Admin Web:** `panel-admin/public/js/dashboard/liveRestaurants.js`.

---

## 3. Architecture Reviewed
The system adheres to the *ONE CORE, ONE CODEBASE, ONE DATABASE, MULTI-TENANT, WHITE-LABEL* architecture:
- **Merchant Web:** The source of administrative truth for store configuration.
- **Firestore:** Canonical storage layer. Public discovery utilizes `/businesses` and `/branches`, while private management utilizes `/restaurant_settings/{restaurantId}`.
- **Customer App (Android):** Consumes `/businesses` and `/branches` for search, category filtering, merchant cards, merchant detail, cart, and checkout.
- **Cloud Functions:** Event-driven backend triggers for projection, notification, and validation.

---

## 4. Data Flow
```
[Merchant Web (SettingsModule)]
   │
   ├─► batch.set(/restaurant_settings/{id})  ──► Writes { schedule, isOpen }  [RESTRICTED: Customer cannot read]
   │
   ├─► batch.update(/businesses/{id})         ──► Writes { isOpen, abierto }   [PUBLIC: schedule is OMITTED!]
   │
   └─► batch.update(/branches/{branchId})     ──► Writes { isOpen, abierto }   [PUBLIC: schedule is OMITTED!]

[Customer App Android]
   │
   ├─► Reads /businesses/{id}                 ──► Missing 'schedule' field; only reads static 'isOpen'
   │
   ├─► Calls getEffectiveIsOpen()             ──► Evaluates 'isOpen && abierto' (static boolean, ignores time!)
   │
   ├─► Renders PublicBusinessCard & Feed      ──► Shows "ABIERTO 🟢" 24/7 regardless of actual time
   │
   └─► Checkout / Place Order                 ──► No operating hours gate; allows orders at 03:00 AM
```

---

## 5. Current Operating Hours Contract
### A. Canonical Representation in Merchant Web (`SettingsModule.tsx`):
```typescript
interface ScheduleDay {
  open: string;    // "HH:mm", e.g. "08:00"
  close: string;   // "HH:mm", e.g. "22:00"
  isOpen: boolean; // true if operating on this weekday
}

interface WeeklySchedule {
  lunes: ScheduleDay;
  martes: ScheduleDay;
  miercoles: ScheduleDay;
  jueves: ScheduleDay;
  viernes: ScheduleDay;
  sabado: ScheduleDay;
  domingo: ScheduleDay;
}
```

### B. Firestore Storage:
| Elemento | Evidencia |
| :--- | :--- |
| **Colección canónica de configuración** | `/restaurant_settings` (ID: `{merchantId}`) |
| **Colección canónica pública (Marketplace)** | `/businesses` (ID: `{merchantId}`) y `/branches` (ID: `{branchId}`) |
| **Campo de horario configurado** | `schedule` (Map de 7 días: `lunes`..`domingo`) |
| **Actor escritor** | Merchant Web (`SettingsModule.tsx`, `OnboardingWizardModule.tsx`) |
| **Actor lector de configuración** | Merchant Web (`SettingsModule.tsx`), Business Owner APK |
| **Actor lector del Marketplace** | Customer App Android (`BusinessRepository.kt`, `ComercioDetalleViewModel.kt`) |
| **Admin Web** | `liveRestaurants.js` (solo lee `isOpen`/`abierto`) |
| **Cloud Functions** | `businessProjection.ts` (solo proyecta `isOpen`) |
| **Campo legacy / duplicado** | `horario`, `scheduleText`, `abierto` |
| **Fuente real de verdad** | `/restaurant_settings/{id}.schedule` sincronizado atómicamente a `/businesses/{id}.schedule` y `/branches/{id}.schedule` |

---

## 6. Merchant Web Audit
- **File:** `merchant-web/src/modules/SettingsModule.tsx`
- **Loading:** Loads `restaurant_settings/{merchantId}` and `businesses/{merchantId}`. Correctly binds `schedule` to the UI state.
- **Editing:** Allows editing `open`, `close` (using `<input type="time">`, format `HH:mm`) and toggling `isOpen` per day. Also allows copying Monday to all weekdays.
- **Persistence (`handleSaveSettings`):**
  - Line 505: `batch.set(settsRef, { ..., schedule: settings.schedule }, { merge: true })`
  - Line 517: `batch.update(bizRef, { isOpen: settings.isOpen, abierto: settings.isOpen, ... })` ➔ **DEFECT:** `schedule` is completely omitted from the `bizRef` update!
  - Line 562: `batch.update(bDoc.ref, { isOpen: settings.isOpen, ... })` ➔ **DEFECT:** `schedule` is completely omitted from the branch updates!
- **Onboarding (`OnboardingWizardModule.tsx`):**
  - Line 455: `schedule: wizardData.schedule` is written to `restaurant_settings`, but omitted from `businesses` (line 371) and `branches` (line 411).

---

## 7. Customer App Audit
- **Files:** `BusinessRepository.kt`, `BusinessInfo`, `ComercioDetalleScreen.kt`, `ComercioDetalleViewModel.kt`, `CustomerHomeViewModel.kt`.
- **Finding 1:** `BusinessInfo` defines `schedule: String = ""` and `horario: String = ""`. When Firestore contains a map, `toObject` fails with a deserialization error and falls back to manual parsing, where `doc.getString("schedule")` returns null because it is a Map, leaving `schedule = ""`.
- **Finding 2:** `fun getEffectiveIsOpen(): Boolean = isOpen && abierto` evaluates only the static boolean stored in the document. It does NOT evaluate the time of day, day of the week, or the configured schedule.
- **Finding 3:** `ComercioDetalleScreen.kt` does not display whether the store is open or closed, and does not block the customer from adding items to cart or initiating checkout when the store is closed.
- **Finding 4:** `CustomerHomeViewModel.kt` (`placeOrder`) executes checks for municipal isolation and GPS validity, but does NOT verify whether the merchant is currently open before creating the order in `/orders`.

---

## 8. Firestore Audit
- **Security Rules (`firestore.rules`):**
  - Lines 687-693: `/restaurant_settings/{restaurantId}` enforces `allow read: if isAuthenticated() && (isPlatformAdmin() || ownsBusiness(restaurantId));`.
  - **Direct consequence:** The Customer App CANNOT read `/restaurant_settings`. The Customer App CAN ONLY read `/businesses` and `/branches` (which have `allow read: if true;`).
  - Therefore, storing `schedule` exclusively in `/restaurant_settings` completely deprives the Customer App of the schedule data.
  - **Verdict on Security Rules:** ZERO-TOUCH SECURITY. The rules already correctly permit public reading of `/businesses` and `/branches`. No changes to `firestore.rules` are required.

---

## 9. Cloud Functions Audit
- **Files:** `functions/src/triggers/businessProjection.ts`, `functions/src/triggers/orders.ts`.
- **Finding:** `projectSingleStore` projects fields from `/users` to `/businesses` and `/branches`. If a user document has `schedule`, it was not projected to `/businesses` or `/branches`.
- **Backend Order Authority:** Orders are currently written directly by the authenticated customer via the Firebase Android SDK into `/orders`, triggering `notifyNewOrder`.

---

## 10. Timezone Audit
- **Canonical Timezone:** `America/Managua` (UTC-6, Central America, no daylight saving time).
- **Audit:**
  - `RestaurantSettings.kt` defines `timezone: String = "America/Managua"`.
  - Cloud Functions schedulers and policies explicitly use `America/Managua`.
  - **Risk:** Client mobile devices and web browsers evaluate `new Date()` or `LocalDateTime.now()` using the *device's local system timezone*. A customer in another timezone or with a misconfigured clock would evaluate store availability incorrectly.
  - **Solution:** The Availability Resolver must resolve the current time against the store's canonical timezone (`America/Managua`) via `ZoneId.of("America/Managua")` or `Intl.DateTimeFormat`.

---

## 11. Overnight Hours Audit
- **Scenario:** Opening: `18:00`, Closing: `02:00`.
- **Existing `AvailabilityEngine.kt` bug (lines 108-117):**
  - Evaluated `!currentTime.isBefore(start) && !currentTime.isAfter(end)`.
  - For `18:00 - 02:00`, `start > end`, so no `currentTime` can satisfy `currentTime >= 18:00 && currentTime <= 02:00` on the same day.
  - Overnight hours failed completely in the existing menu availability engine.
- **Required Resolution:**
  - If `open > close` (overnight):
    1. During today: `currentTime >= open` is OPEN.
    2. During tomorrow morning: If yesterday's shift was overnight and `currentTime < yesterdayClose`, it is OPEN.

---

## 12. Day-of-Week Audit
- **Keys in Merchant Web:** `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`, `domingo`.
- **Kotlin `java.time.DayOfWeek`:** `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`.
- **Mapping:**
  - `MONDAY` ➔ `lunes`
  - `TUESDAY` ➔ `martes`
  - `WEDNESDAY` ➔ `miercoles`
  - `THURSDAY` ➔ `jueves`
  - `FRIDAY` ➔ `viernes`
  - `SATURDAY` ➔ `sabado`
  - `SUNDAY` ➔ `domingo`
  The resolver must also accept English keys (`monday`..`sunday`) and integer keys (`1`..`7`) to guarantee 100% backward and cross-platform compatibility.

---

## 13. Cache Audit
- `BusinessRepository.kt` implements a local Firestore cache hit (`firestore.collection("businesses").get(Source.CACHE)`), followed by a real-time `addSnapshotListener`.
- When `schedule` is updated in `/businesses/{merchantId}`, the real-time listener immediately receives the update and refreshes `_publicBusinesses`.
- No aggressive memory caching prevents real-time schedule changes from propagating.

---

## 14. Multi-Tenant Audit
- Segregation: `schedule` is strictly scoped per `merchantId` / `businessId` and per `branchId`.
- No global tenant schedule exists as a fallback. Each merchant/branch owns its schedule.

---

## 15. Hardcoded Values
- `DEFAULT_SCHEDULE` in `SettingsModule.tsx` provides 08:00-22:00 (Mon-Thu), 08:00-23:00 (Fri), 09:00-23:00 (Sat), 09:00-21:00 (Sun closed) as a fallback default when a new commerce initializes settings. This is a legitimate UI default fallback, not a bug.

---

## 16. Duplicate Sources
- `isOpen` vs `schedule`:
  - `isOpen` is the **Manual Master Switch** ("Tienda Abierta / Recibiendo pedidos" vs "Tienda Cerrada / Pausa manual").
  - `schedule` is the **Weekly Operating Hours Configuration**.
  - **Harmonized Contract:** A store is operational IF AND ONLY IF:
    `Manual Master Switch (isOpen) == true` **AND** `OperatingHoursResolver.isWithinSchedule(schedule, localBusinessTime) == true`.

---

## 17. Root Cause Statement
1. **Source Disconnect:** Merchant Web (`SettingsModule.tsx` and `OnboardingWizardModule.tsx`) saves the weekly `schedule` only to `/restaurant_settings/{merchantId}`. It fails to write `schedule` to `/businesses/{merchantId}` and `/branches/{branchId}`.
2. **Access Control Barrier:** The Customer App cannot read `/restaurant_settings` due to security rules (`firestore.rules`). It only reads `/businesses` and `/branches`, which lacked the schedule.
3. **Missing Temporal Evaluation:** The Customer App evaluated availability via `getEffectiveIsOpen() = isOpen && abierto`, treating a static administrative switch as real-time open status and completely ignoring the clock, day of the week, and overnight hours.
4. **No Cart / Checkout Gate:** `ComercioDetalleScreen` and `CustomerHomeViewModel` allowed products to be added to cart and orders to be submitted without verifying if the store was open.

---

## 18. Secondary Causes
- Deserialization type mismatch: `BusinessInfo` declared `var schedule: String = ""`, which prevented Firestore from parsing map objects.
- Lack of timezone normalization against `America/Managua`.
- Overnight hour edge cases (`18:00 - 02:00`) not handled by comparison logic.

---

## 19. Surgical Fix Strategy
1. **Merchant Web:**
   - In `SettingsModule.tsx` (`handleSaveSettings`) and `OnboardingWizardModule.tsx` (`handleActivateCommerce`): atomically replicate `schedule` to `/businesses/{merchantId}` and all relevant `/branches/{branchId}`.
2. **Domain Model & Deserializer:**
   - In `BusinessRepository.kt`: Update `BusinessInfo` to support `scheduleMap: Map<String, Any>? = null` safely without breaking existing serialization.
   - Update `toBusinessInfoSafely()` to safely extract `schedule` as a map or string.
3. **Unified OperatingHoursResolver (Kotlin):**
   - Create `com.example.domain.engine.business.OperatingHoursResolver`:
     - Receives `scheduleMap`, `manualOpen: Boolean`, `timezone: String = "America/Managua"`.
     - Determines `currentDay` and `currentTime` in `America/Managua`.
     - Handles today's shift and yesterday's overnight shift.
     - Handles 24h shifts (`00:00 - 23:59`, `00:00 - 00:00`).
     - Returns deterministic `OperatingHoursStatus(isOpen: Boolean, reason: String, todayScheduleText: String)`.
4. **Harmonize `getEffectiveIsOpen()`:**
   - In `BusinessInfo.getEffectiveIsOpen()`: Delegate to `OperatingHoursResolver`.
   - In `Branch.isCurrentlyOpen()`: Delegate to `OperatingHoursResolver`.
5. **Customer Experience & Order Protection:**
   - In `ComercioDetalleScreen.kt`: Display Open/Closed badge with current operating hours. If closed, disable or warn on "Agregar" / "Comprar".
   - In `CustomerHomeViewModel.kt` (`placeOrder`): Validate that the merchant/branch is open before creating the order in `/orders`.

---

## 20. Files Modified (Targeted)
1. `merchant-web/src/modules/SettingsModule.tsx` (Atomic synchronization of `schedule` to `/businesses` and `/branches`).
2. `merchant-web/src/modules/OnboardingWizardModule.tsx` (Atomic synchronization of `schedule` in onboarding).
3. `app/src/main/java/com/example/domain/engine/business/OperatingHoursResolver.kt` (NEW — Universal canonical availability resolver).
4. `app/src/main/java/com/example/data/repository/BusinessRepository.kt` (`BusinessInfo` schedule support & `getEffectiveIsOpen()` integration).
5. `app/src/main/java/com/example/eiam/domain/model/Branch.kt` (`isCurrentlyOpen()` integration).
6. `app/src/main/java/com/example/ComercioDetalleScreen.kt` (Open/Closed badge & protective UI gate).
7. `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt` (Order validation gate in `placeOrder`).
8. `app/src/test/java/com/example/settings/OperatingHoursResolverTest.kt` (Comprehensive T01–T12 unit test suite).

---

## 21. Files Protected (Zero Mutation)
- `firestore.rules` (Security unchanged).
- `functions/src/triggers/orders.ts` (Frozen core order lifecycle unchanged).
- `CourierCashClosureScreen.kt`, `CourierFinancesScreen.kt` (ADR-018 frozen).
- `DeliveryControlTowerModule.tsx` (ADR-013 frozen).
- `FleetEligibilityEngine.kt` (ADR-016 frozen).
- `merchantSettlement.ts` (ADR-019 frozen).

---

## 22. Test Matrix Plan (T01 - T12)
| Test | Schedule | Test Time | Expected Result |
| :--- | :--- | :--- | :--- |
| **T01** | 09:00–22:00 | 08:59 | `CLOSED` |
| **T02** | 09:00–22:00 | 09:00 | `OPEN` |
| **T03** | 09:00–22:00 | 12:00 | `OPEN` |
| **T04** | 09:00–22:00 | 21:59 | `OPEN` |
| **T05** | 09:00–22:00 | 22:00 | `CLOSED` |
| **T06** | 18:00–02:00 | 17:59 | `CLOSED` |
| **T07** | 18:00–02:00 | 18:00 | `OPEN` |
| **T08** | 18:00–02:00 | 23:00 | `OPEN` |
| **T09** | 18:00–02:00 | 01:59 | `OPEN` |
| **T10** | 18:00–02:00 | 02:00 | `CLOSED` |
| **T11** | Día cerrado (`isOpen: false`) | Any time | `CLOSED` |
| **T12** | 24 Horas (`00:00–23:59`) | Any time | `OPEN` |

---

## 23. Regression Strategy
Execute:
- `npm run build` in `merchant-web/`
- `npm test` in `functions/`
- `./gradlew :app:testCoreDebugUnitTest` in `app/`
Verify that no build breaks, zero lint warnings are introduced, and no unrelated modules are modified.

---

## 24. Security Validation
No mutations to `firestore.rules` or security claims. Public access to `/businesses` and `/branches` remains secure and strictly read-only for unauthenticated or customer users.

---

## 25. Production Readiness & Rollback Plan
- Backward compatibility: If an existing business in Firestore does not yet have a `schedule` map in `/businesses`, it falls back to the manual `isOpen` state, ensuring zero outage for existing merchants.
- Rollback: Changes are fully decoupled and can be reverted simply by restoring the modified files with zero database schema migrations needed.

---

## 26. Gobernanza del Fallback Legacy y Hoja de Ruta de Retiro

### Estado Dual Transitorio
El sistema opera actualmente bajo dos modalidades de evaluación:
1. **Schedule Existente en `/businesses` o `/branches`:**  
   → **Disponibilidad Temporal Real:** El estado se calcula dinámicamente según día de la semana, hora, turno nocturno y zona horaria contra `OperatingHoursResolver`.
2. **Schedule No Existente o Vacío:**  
   → **LEGACY FALLBACK:** El estado se resuelve mediante el booleano manual `manualOpen = isOpen && abierto`.

> [!CAUTION]
> El estado (2) queda formalmente catalogado como **LEGACY FALLBACK** de compatibilidad operativa transitoria para evitar disrupción de comercios ya creados. **NO REPRESENTA un comportamiento arquitectónico permanente.** Queda agendada una auditoría futura de retiro del fallback una vez que el 100% de los comercios productivos hayan guardado sus horarios semanales desde Merchant Web.

---

## 27. Arquitectura Canónica SSOT del Timezone y Cadena de Resolución

Para evitar divergencias temporales entre colecciones o plataformas, se establece la siguiente jerarquía canónica de resolución de zona horaria:

```text
Tenant / Business Canonical Timezone (si está explícitamente configurado)
                       │
                       ▼
OperatingHoursResolver (Platform Fallback Defensivo: "America/Managua" UTC-6 sin DST)
                       │
                       ▼
Todas las Experiencias de Usuario (Customer App Android, Merchant Web, Admin Web, Cloud Functions)
```

- **Plataforma Base:** Nicaragua opera bajo `America/Managua` (UTC-6) sin horario de verano.
- **SSOT de Referencia:** Ningún módulo cliente o función aislada debe instanciar zonas horarias dispares ni realizar parsing de horas mediante formatos de locale arbitrarios.

---

## 28. Matriz Oficial de Certificación Automatizada (T01 a T15)

La suite de pruebas unitarias implementada en `OperatingHoursResolverTest.kt` cubre formalmente 15 casos de validación determinística:

| ID | Caso de Prueba | Condición / Entrada | Hora Evaluada | Resultado Esperado | Estatus |
|---|---|---|---|---|---|
| **T01** | Standard Daytime | 09:00–22:00 | 08:59 | `CLOSED` | 🟢 PASSED |
| **T02** | Standard Daytime | 09:00–22:00 | 09:00 (Apertura exacta) | `OPEN` | 🟢 PASSED |
| **T03** | Standard Daytime | 09:00–22:00 | 12:00 (Mediodía) | `OPEN` | 🟢 PASSED |
| **T04** | Standard Daytime | 09:00–22:00 | 22:00 (Cierre exacto) | `CLOSED` | 🟢 PASSED |
| **T05** | Standard Daytime | 09:00–22:00 | 22:01 (Post-cierre) | `CLOSED` | 🟢 PASSED |
| **T06** | Compatibilidad Keys | English keys (`monday`, `wednesday`...) | 12:00 | `OPEN` | 🟢 PASSED |
| **T07** | Compatibilidad Keys | Claves con tilde (`miércoles`, `sábado`) | 12:00 | `OPEN` | 🟢 PASSED |
| **T08** | Overnight Shift | 18:00–02:00 (Pre-medianoche) | 23:00 (Día D) | `OPEN` | 🟢 PASSED |
| **T09** | Overnight Shift | 18:00–02:00 (Madrugada continua) | 01:59 (Día D+1) | `OPEN` | 🟢 PASSED |
| **T10** | Overnight Shift | 18:00–02:00 (Cierre madrugada) | 02:00 (Día D+1) | `CLOSED` | 🟢 PASSED |
| **T11** | Día Cerrado | `isOpen: false` | 14:00 (Domingo) | `CLOSED` | 🟢 PASSED |
| **T12** | 24 Horas | `open: "00:00", close: "23:59"` | 03:30 / 23:45 | `OPEN` | 🟢 PASSED |
| **T13** | Emergency Switch | Master switch `manualOpen: false` | 12:00 (En horario activo) | `CLOSED` | 🟢 PASSED |
| **T14** | Multi-Tenant Isolation | Tenant A (08-15h) vs Tenant B (17-23h) | 16:00 / 18:00 | Aislado por tenant | 🟢 PASSED |
| **T15** | Integración de Modelos | `BusinessInfo.getEffectiveIsOpen()` & `Branch.isCurrentlyOpen()` | Estado dinámico | `true / false` conforme modelo | 🟢 PASSED |

---

## 29. Límite Concurrente Documentado (Known Boundary — Temporal Validation Race)

Se documenta formalmente la existencia de un límite concurrente temporal:

```text
CustomerHomeViewModel
    │
    ▼ [21:59:59.900] Valida horario → OPEN ✓
    │
    ▼ [22:00:01.100] Commit en Firestore /orders (Transacción de red: ~1.2s)
    │
Firestore Database
```

Si el cliente pulsa "Ir a Pagar" a fracciones de segundo antes del cierre del comercio, la orden se persistirá en Firestore segundos después del cierre oficial.  
Debido a que el ciclo de órdenes backend (`functions/src/triggers/orders.ts`) se encuentra estrictamente **CONGELADO bajo ADR-016**, no se introdujo una mutación en dicho archivo en esta intervención.  
Este comportamiento queda formalmente catalogado como un **Known Boundary** (carrera de validación temporal perimetral) sin impacto funcional crítico, susceptible de incorporar un checkpoint de rechazo atómico server-side en un futuro ADR de órdenes.

---

## 30. Regla de Congelamiento Arquitectónico — Merchant Operating Hours & Store Availability Freeze (ADR-021)

### Principio Inviolable
El subsistema de **Gestión de Horarios Semanales, Sincronización Multi-Plataforma y Resolución de Disponibilidad Comercial** queda formalmente **CONGELADO como Baseline Inmutable v2.3 Enterprise**.

Queda **TERMINANTEMENTE PROHIBIDO**:
1. **Crear Resolvers Paralelos:** No implementar motores o funciones de cálculo de horario ad-hoc en otros módulos; toda la aplicación debe consumir exclusivamente `OperatingHoursResolver`.
2. **Sustitución Regresiva por Booleano:** Queda prohibido volver a utilizar `isOpen` o `abierto` como sustitutos del horario dinámico semanal.
3. **Lecturas Prohibidas de `/restaurant_settings`:** La aplicación de clientes nunca debe consultar `/restaurant_settings` para determinar si una tienda está abierta.
4. **Campos Redundantes en BD:** No introducir campos derivados efímeros en Firestore (ej. `currentOpen`, `storeIsOpenNow`, `isAvailableRightNow`) que desincronicen el cálculo canónico en tiempo real.
5. **Retiro Prematuro del Fallback:** No eliminar el **LEGACY FALLBACK** sin una auditoría previa que certifique que todos los comercios activos tienen un `schedule` válido en `/businesses`.
6. **Mutación de Seguridad Innecesaria:** Prohibido modificar `firestore.rules` para alterar la visibilidad de colecciones por motivos de horarios.
7. **Modificación de Módulos Protegidos:** Prohibido alterar `functions/src/triggers/orders.ts` o Control Tower (`DeliveryControlTowerModule.tsx`) sin apertura formal de un nuevo ADR.
8. **Obligatoriedad de Consumo del Resolver:** Cualquier nueva pantalla, widget, notificación push o reporte que requiera verificar el estado del comercio debe invocar `OperatingHoursResolver`.
9. **Zona Horaria Canónica:** La referencia oficial es obligatoriamente `America/Managua` (UTC-6) como fallback de plataforma, evitando fallbacks implícitos del dispositivo del usuario (`Locale.getDefault()`).
10. **Protocolo de Intervención:** Cualquier modificación futura requerirá una nueva auditoría forense BSD con aprobación formal.

