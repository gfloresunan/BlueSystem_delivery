# C2D25E.4 — ANDROID-SPECIFIC COUPLING AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Resumen de Acoplamientos de Plataforma

La auditoría forense analizó todas las dependencias y referencias específicas del sistema operativo Android para verificar que estén confinadas exclusivamente a la capa del cliente Android (`app/`) y no contaminen el Core (`functions/`, `services/`, Firestore schemas).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANDROID COUPLING AUDIT MATRIX                            │
├──────────────────────────────────────┬────────────────────────┬─────────────┤
│ Dominio / Componente                 │ Nivel de Acoplamiento  │ Ubicación   │
├──────────────────────────────────────┼────────────────────────┼─────────────┤
│ Jetpack Compose UI / Activities      │ 🔴 100% Android-Only   │ app/src/    │
│ Android Services & WorkManager       │ 🔴 100% Android-Only   │ app/src/    │
│ Room Database (AppDatabase.kt)       │ 🔴 100% Android-Only   │ app/src/    │
│ Gradle Build Configuration & Flavors │ 🔴 100% Android-Only   │ app/build/  │
│ Google Maps Android SDK (Maps API)   │ 🔴 100% Android-Only   │ app/src/    │
│ Cloud Functions Backend              │ 🟢 0% Android Coupled  │ functions/  │
│ Firestore Data Schemas & Rules       │ 🟢 0% Android Coupled  │ root        │
│ Firebase Auth Claims & Gatekeeper    │ 🟢 0% Android Coupled  │ functions/  │
│ FCM Notification Dispatcher (APNs)   │ 🟢 0% Android Coupled  │ functions/  │
└──────────────────────────────────────┴────────────────────────┴─────────────┘
```

---

### 2. Inventario Detallado de Dependencias de Android

#### A. UI y Framework Visual
- **Dependencias:** `androidx.compose.*`, `androidx.activity.*`, `androidx.lifecycle.*`.
- **Evaluación:** Confinadas 100% al módulo de cliente Android. No contienen reglas comerciales no reproducibles en Flutter o Web.

#### B. Persistencia Local y Caché
- **Dependencias:** `androidx.room.*` (`OfflineLocationDao`, `AppDatabase.kt`).
- **Evaluación:** Usado exclusivamente para almacenar coordenadas GPS offline cuando el dispositivo pierde conectividad antes de subir a `/ubicaciones_repartidores`. En Flutter se puede implementar un equivalente estándar (`sqflite` o `hive`) con el mismo esquema.

#### C. Tareas de Fondo y Localización
- **Dependencias:** `androidx.work.WorkManager`, `LocationSyncWorker.kt`, `FusedLocationProviderClient`.
- **Evaluación:** Representan adaptadores de hardware del sistema operativo. La carga útil resultante que se envía a Firestore (`{ motorizadoId, latitud, longitud, timestamp, pedidoActivoId }`) es puramente canónica.

#### D. Configuración de Build y Recursos
- **Dependencias:** `app/build.gradle.kts`, `AndroidManifest.xml`, `res/values/strings.xml`.
- **Evaluación:** Product Flavors (`core`, `enterpriseFitoni`, `whitelabel`) aplican empaquetado y firmas específicas de Android.

---

### 3. Veredicto sobre el Aislamiento de Android

El acoplamiento a Android está **estricta y saludablemente aislado** en la capa de presentación y servicios de cliente nativo. **El Core no tiene dependencias cruzadas con el SDK de Android**.
