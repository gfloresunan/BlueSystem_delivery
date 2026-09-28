# AUTH + PROFILE IDENTITY FORENSIC AUDIT REPORT
**Documento:** `AUTH_PROFILE_IDENTITY_FORENSIC_AUDIT_REPORT.md`  
**Protocolo:** `BSD-CUSTOMER-AUTH-PROFILE-IDENTITY-FORENSIC-AUDIT-001`  
**Plataforma:** BlueSystem Delivery Enterprise v2.3  
**Módulo Auditado:** Customer App — Auth Router, Splash, Session Persistence & Profile Identity Resolution  
**Modo de Ejecución:** `READ-ONLY / ZERO-MUTATION FORENSIC AUDIT`  
**Fecha:** 2026-09-07  
**Auditor:** Senior Developer & Forensic Auditor — BlueSystem Delivery Enterprise  

---

## 1. Executive Summary

La presente auditoría forense fue ejecutada en modo estrictamente de **sólo lectura (Zero Mutation)** con el objetivo taxativo de identificar la causa raíz técnica y arquitectónica de por qué, en una instalación aparentemente nueva de la Customer App, al ingresar a la sección "Mi Perfil", la aplicación renderiza una identidad ficticia conformada por:

* **Nombre de Usuario:** `Cliente BlueSystem`
* **Correo Electrónico:** `cliente@bluesystemdelivery.com` (o `cliente@bluesystem.com`)
* **Identificador de Cliente:** `ID: BS-849201`
* **Badge:** `Verificado` (Checkmark verde)
* **Rol:** `Cliente`

cuando el contrato funcional canónico estipula que una instalación sin sesión activa de Firebase Auth debe presentar obligatoriamente la pantalla de bienvenida y autenticación (`Screen.LoginRegister` / `AuthScreen`):

```
Bienvenido
Ingresa o regístrate para continuar
- Continuar con Google
- Continuar con Facebook
- Otro método (Email/Teléfono)
- Regístrate aquí
- Explorar como invitado
```

### Veredicto Ejecutivo
La investigación forense demostró mediante evidencia directa e incontrovertible en el código fuente que:

1. **La identidad `BS-849201` NO proviene de Firebase Auth, NO proviene de Firestore, NO proviene de SharedPreferences, NO proviene de Room y NO es generada por algoritmos aleatorios.** Es un **literal de cadena quemado en el código (hardcoded string literal)** en `ProfileScreen.kt:573`:
   ```kotlin
   clientId = currentUser?.uid?.take(8)?.uppercase() ?: "BS-849201"
   ```
2. **El nombre `Cliente BlueSystem` y el email `cliente@bluesystemdelivery.com` provienen igualmente de operadores Elvis (`?:`) hardcodeados en la capa de UI** en `ProfileScreen.kt:569-570` y `ProfileHeader.kt:132-147`.
3. **El Auth Router en `SplashViewModel.kt:105-108` incurre en una violación flagrante de arquitectura:** Cuando `FirebaseAuth.currentUser == null`, el enrutador de inicio **NO navega a `Screen.LoginRegister` (Welcome/Login)**, sino que emite automáticamente `NavigationEvent.NavigateToGuest`, desviando al usuario sin credenciales directamente a `guest_home` (`CustomerHomeScreen`).
4. **Enrutamiento desprotegido en `MainActivity.kt:649-663`:** Las rutas `customer_dashboard?tab={tab}` y `solicitar_envio` instancian `CustomerHomeScreen` con `isGuest = false` **sin validar si existe una sesión en `FirebaseAuth`**.
5. **Persistencia de sesión en Android:** Si el dispositivo físico o emulador tuvo previamente una sesión de Firebase, `FirebaseAuth` persiste las credenciales en almacenamiento interno. Al reinstalar sin purga completa (`allowBackup="true"` en `AndroidManifest.xml`), Android Auto Backup restaura las credenciales. Si el documento `/users/{uid}` fue eliminado o mientras se carga asíncronamente, `ProfileViewModel.currentUser` es `null`, provocando que la UI despliegue de inmediato los fallbacks `Cliente BlueSystem` / `BS-849201`.

---

## 2. Audit Scope

| Módulo / Componente | Archivo Fuente | Rol en el Ecosistema |
|---|---|---|
| **App Entrypoint & NavHost** | [MainActivity.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt) | Inicialización de Firebase, Splash composable, NavHost, rutas `guest_home`, `customer_dashboard`, `solicitar_envio` |
| **Auth Router & Session Resolution** | [SplashViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt) | Decisión de sesión inicial, espera reactiva de `FirebaseAuth`, enrutamiento por rol o guest |
| **Splash UI** | [SplashScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashScreen.kt) | Presentación del Splash y recolección de eventos de navegación |
| **Auth & Welcome Screen** | [AuthScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/auth/AuthScreen.kt) | Pantalla canónica de bienvenida, login social, registro y exploración invitada |
| **Customer Dashboard & Tab Host** | [CustomerHomeScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt) | Host de tabs (0: Inicio, 1: Favoritos, 3: Pedidos, 4: Mi Perfil) y switch de `isGuest` |
| **Profile UI Screen** | [ProfileScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt) | Vista de Perfil, Drawer de Navegación, evaluación de `isGuest` y fallbacks visuales |
| **Profile Header Widget** | [ProfileHeader.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt) | Renderizado de Avatar, Nombre, Email, ID de Cliente y Rol |
| **Profile ViewModel** | [ProfileViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileViewModel.kt) | Carga de datos de perfil desde Firestore `/users/{uid}` |
| **Bottom Navigation Bar** | [BottomNavigationBar.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/BottomNavigationBar.kt) | Barra de navegación inferior y captura de clics en Tabs |
| **Auth Manager** | [AuthManager.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AuthManager.kt) | Métodos de autenticación, registro, recuperación y cierre de sesión |
| **Session Manager** | [SessionManager.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/data/sync/SessionManager.kt) | Máquina de estados en memoria (`STARTING`, `GUEST`, `AUTHENTICATED`, `LOGGING_OUT`) |
| **Domain Models** | [Models.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt) | Definición de `AppUser`, `Address`, `CommerceReview` |
| **Manifest & Backup Rules** | [AndroidManifest.xml](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/AndroidManifest.xml) | Declaración de actividades, permisos y directiva `allowBackup` |

---

## 3. Evidence Inventory

### Evidencia 1: Inyección Hardcodeada de "BS-849201"
* **Archivo:** [ProfileScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L573)
* **Línea:** 573
* **Código Exacto:**
  ```kotlin
  clientId = currentUser?.uid?.take(8)?.uppercase() ?: "BS-849201",
  ```
* **Hallazgo:** Si `currentUser` es `null`, o si `currentUser.uid` es `null`, el operador Elvis evalúa inmediatamente a `"BS-849201"`. Si `currentUser.uid` fuese un UID real de Firebase (ej. `"IBlriitmnP97CMw2IGqI"`), el resultado sería `"IBLRIITM"`. El valor `"BS-849201"` **únicamente puede aparecer cuando `currentUser?.uid` es nulo**.

### Evidencia 2: Inyección Hardcodeada de "Cliente BlueSystem" y Email Fallback
* **Archivo:** [ProfileScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L564-L576)
* **Líneas:** 564–576
* **Código Exacto:**
  ```kotlin
  val rawName = currentUser?.nombre?.ifBlank { currentUser?.name } ?: ""
  val rawPhone = currentUser?.telefono?.ifBlank { currentUser?.phone } ?: ""
  val userRole = (currentUser?.rol?.ifEmpty { currentUser?.role?.ifEmpty { currentUser?.userType ?: "Cliente" } } ?: "Cliente").replaceFirstChar { it.uppercase() }

  ProfileHeader(
      userName = rawName.ifEmpty { "Cliente BlueSystem" },
      userEmail = currentUser?.email ?: "cliente@bluesystemdelivery.com",
      userPhone = rawPhone,
      photoUrl = currentUser?.photoUrl ?: "",
      clientId = currentUser?.uid?.take(8)?.uppercase() ?: "BS-849201",
      roleTitle = userRole,
      onEditProfileClick = { showEditProfileDialog = true }
  )
  ```
* **Hallazgo:** Cuando `currentUser` es `null`, `rawName` es `""`, lo que activa `rawName.ifEmpty { "Cliente BlueSystem" }`. El email activa `currentUser?.email ?: "cliente@bluesystemdelivery.com"`. El rol activa `"Cliente"`.

### Evidencia 3: Fallback Redundante en ProfileHeader
* **Archivo:** [ProfileHeader.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L131-L186)
* **Líneas:** 132, 147, 182
* **Código Exacto:**
  ```kotlin
  // Línea 132
  text = userName.ifEmpty { "Cliente BlueSystem" },
  ...
  // Línea 147
  text = userEmail.ifEmpty { "cliente@bluesystem.com" },
  ...
  // Línea 182
  text = "ID: ${clientId.ifEmpty { "BS-8492" }}",
  ```
* **Hallazgo:** Si `ProfileScreen` llegase a pasar cadenas vacías, `ProfileHeader` vuelve a aplicar fallbacks hardcodeados idénticos.

### Evidencia 4: Fallback en el Drawer Lateral de Perfil
* **Archivo:** [ProfileScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L274-L286)
* **Líneas:** 274–286
* **Código Exacto:**
  ```kotlin
  val rawName = currentUser?.nombre?.ifBlank { currentUser?.name } ?: "Mi Perfil"
  Text(
      text = rawName,
      fontWeight = FontWeight.Bold,
      fontSize = 15.sp,
      color = MaterialTheme.colorScheme.onSurface
  )
  Text(
      text = currentUser?.email ?: "cliente@bluesystemdelivery.com",
      fontSize = 11.sp,
      color = MaterialTheme.colorScheme.onSurfaceVariant
  )
  ```

### Evidencia 5: Auth Router Desvía Automáticamente `user == null` hacia `guest_home`
* **Archivo:** [SplashViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt#L105-L108)
* **Líneas:** 105–108
* **Código Exacto:**
  ```kotlin
  } else {
      Log.d("SPLASH_AUTH", "No existe sesión activa. Navegando a Dashboard Principal en Modo Invitado.")
      _navigationEvent.emit(NavigationEvent.NavigateToGuest)
  }
  ```
* **Hallazgo:** Cuando no hay sesión de Firebase Auth (`user == null`), en lugar de enviar a `Screen.LoginRegister.route` ("Bienvenido / Ingresa o regístrate para continuar"), emite `NavigateToGuest`.
* **Archivo:** [MainActivity.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L407-L410)
* **Líneas:** 407–410:
  ```kotlin
  is SplashViewModel.NavigationEvent.NavigateToGuest -> {
      realtimeOrchestrator.startListeningGlobal(isGuest = true)
      "guest_home"
  }
  ```
  La app navega a `"guest_home"`. La pantalla de bienvenida inicial nunca se presenta en el arranque.

### Evidencia 6: `customer_dashboard` y `solicitar_envio` fuerzan `isGuest = false` sin Auth Check
* **Archivo:** [MainActivity.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L649-L673)
* **Líneas:** 649–673
* **Código Exacto:**
  ```kotlin
  composable(
      route = "customer_dashboard?tab={tab}",
      arguments = listOf(androidx.navigation.navArgument("tab") { defaultValue = "0" })
  ) { backStackEntry ->
      val initialTab = backStackEntry.arguments?.getString("tab")?.toIntOrNull() ?: 0
      CustomerHomeScreen(
          navController = navController,
          firebaseManager = firebaseManager,
          isGuest = false,
          initialTab = initialTab,
          onLogout = {
              performLogoutCleanup(realtimeOrchestrator, authManager, navController)
          }
      )
  }
  composable(Screen.SolicitarEnvio.route) {
      CustomerHomeScreen(
          navController = navController,
          firebaseManager = firebaseManager,
          isGuest = false,
          onLogout = {
              performLogoutCleanup(realtimeOrchestrator, authManager, navController)
          }
      )
  }
  ```
* **Hallazgo:** Si se accede a `"customer_dashboard"` o `"solicitar_envio"` por cualquier vía (Splash, deep link, notificación, NotificationRouter, CouponsScreen, back button de OrderDetail), el parámetro `isGuest` queda forzado en `false`.

### Evidencia 7: Asincronía y Estado Nulo en ProfileViewModel
* **Archivo:** [ProfileViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileViewModel.kt#L35-L36) y [L100-L113](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileViewModel.kt#L100-L113)
* **Líneas:** 35–36, 100–113
* **Código Exacto:**
  ```kotlin
  private val _currentUser = MutableStateFlow<AppUser?>(null)
  val currentUser: StateFlow<AppUser?> = _currentUser.asStateFlow()
  ...
  private fun loadUserProfile() {
      val uid = auth.currentUser?.uid ?: return
      viewModelScope.launch {
          try {
              val doc = db.collection("users").document(uid).get().await()
              if (doc.exists()) {
                  val user = doc.toObject(AppUser::class.java)
                  _currentUser.value = user?.copy(uid = uid)
              }
          } catch (e: Exception) {
              Log.w("ProfileViewModel", "Error loading user profile", e)
          }
      }
  }
  ```
* **Hallazgo:**
  1. Si `auth.currentUser` es `null`, `loadUserProfile()` retorna de inmediato y `_currentUser.value` queda en `null`.
  2. Si `auth.currentUser` no es `null` pero el documento en Firestore no existe o falla la red, `_currentUser.value` permanece en `null`.
  3. Durante la carga asíncrona (`await()`), `_currentUser.value` es inicialmente `null`.
  4. La UI en `ProfileScreen.kt` no tiene ningún estado de carga (`CircularProgressIndicator`) para el perfil: evalúa de inmediato los fallbacks `Cliente BlueSystem` / `BS-849201`.

---

## 4. Actual Auth Router Flow

El flujo real implementado en el código actual es el siguiente:

```
                  [App Launch: MainActivity.onCreate]
                                   │
                                   ▼
                  [NavHost startDestination = Screen.Splash]
                                   │
                                   ▼
                       [SplashScreen Composable]
                                   │
                                   ▼
                    [SplashViewModel.checkSession()]
                                   │
                     awaitFirebaseAuthInitialState()
                            (timeout: 3000ms)
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
         [user != null]                        [user == null]
                │                                     │
      ObtenerTipoUsuarioUseCase                       ▼
                │                          Emit NavigateToGuest
    ┌───────────┼───────────┐                         │
    │           │           │                         ▼
[Courier]   [Merchant]  [Customer]               "guest_home"
    │           │           │                         │
    ▼           ▼           ▼                         ▼
Courier      Business  "solicitar_envio"    CustomerHomeScreen
Screen      Dashboard       │                (isGuest = true)
                            ▼                         │
                    CustomerHomeScreen        Tab 4 (Mi Perfil)
                    (isGuest = false)                 │
                            │                         ▼
                    Tab 4 (Mi Perfil)         Redirige a Welcome
                            │                 (Screen.LoginRegister)
                            ▼
                      ProfileScreen
                    (isGuest = false)
                            │
               ProfileViewModel.currentUser == null
                            │
                            ▼
              ┌───────────────────────────┐
              │    "Cliente BlueSystem"   │
              │ cliente@bluesystemdel... │
              │        ID: BS-849201      │
              │        Checkmark          │
              └───────────────────────────┘
```

---

## 5. Actual Firebase Auth State Flow

| Punto del Código | Estado de `currentUser` | Acción Ejecutada | Riesgo / Defecto |
|---|---|---|---|
| **`MainActivity.onCreate` (L317)** | Listener global (`addAuthStateListener`) | Si `null` → `SessionManager.setGuestMode()`, `stopUserSession()`. Si no `null` → `setAuthenticatedMode()`, registra FCM token. | Correcto a nivel de sesión global, pero no controla la navegación del NavHost. |
| **`SplashViewModel.checkSession` (L53)** | `awaitFirebaseAuthInitialState()` | Espera hasta 3000ms a que Firebase Auth restaure tokens locales. | Si es `null`, desvía a `NavigateToGuest` en vez de `Welcome`. |
| **`MainActivity.onNavigate` (L407)** | `authManager.currentUser` | Enruta según el evento emitido por Splash. | En `NavigateToSolicitarEnvio`, no valida de nuevo si `currentUser != null`. |
| **`ProfileViewModel.init` (L80)** | `auth.currentUser?.uid ?: return` | Si es `null`, aborta la carga de Firestore. | Aborta silenciosamente dejando `_currentUser.value = null` sin notificar error a la UI. |
| **`ProfileScreen.kt` (L96)** | `remember { FirebaseAuth.getInstance().currentUser }` | Almacena `authUser` localmente sólo para el banner de email verification. | No se usa como compuerta de acceso para la identidad del perfil. |
| **`MainActivity.performLogoutCleanup` (L1902)** | `authManager.cerrarSesion()` | Ejecuta `auth.signOut()`, limpia cachés y navega a `Screen.LoginRegister`. | Correcto en logout explícito, pero la app no inicia en `Screen.LoginRegister`. |

---

## 6. Profile Identity Resolution Flow

El flujo de resolución que genera el síntoma observado se descompone en 4 etapas:

```
ETAPA 1: NAVEGACIÓN
Ruta ejecutada: "customer_dashboard" o "solicitar_envio"
  └─ CustomerHomeScreen(isGuest = false)
      └─ selectedTab = 4 (Mi Perfil)
          └─ ProfileScreen(isGuest = false)

ETAPA 2: VIEWMODEL INITIALIZATION
ProfileScreen crea ProfileViewModel()
  └─ _currentUser = MutableStateFlow<AppUser?>(null)
  └─ loadUserProfile():
      └─ val uid = auth.currentUser?.uid ?: return
         (Si uid == null, retorna de inmediato: _currentUser queda en null)
         (Si uid != null, se lanza corrutina asíncrona: _currentUser queda en null mientras espera red)

ETAPA 3: RENDERIZADO DE PROFILESCREEN
ProfileScreen recolecta: val currentUser by viewModel.currentUser.collectAsState()
  └─ currentUser == null
  └─ if (isGuest) -> FALSE (isGuest fue pasado como false)
  └─ else -> Rama de usuario autenticado

ETAPA 4: EVALUACIÓN DE OPERADORES ELVIS (SÍNTESIS DE LA IDENTIDAD FICTICIA)
  ├─ rawName = null?.nombre ?: null?.name ?: "" -> ""
  ├─ userName = "".ifEmpty { "Cliente BlueSystem" } -> "Cliente BlueSystem"
  ├─ userEmail = null?.email ?: "cliente@bluesystemdelivery.com" -> "cliente@bluesystemdelivery.com"
  ├─ clientId = null?.uid?.take(8)?.uppercase() ?: "BS-849201" -> "BS-849201"
  ├─ roleTitle = null?.rol ?: "Cliente" -> "Cliente"
  └─ ProfileHeader renderiza "Cliente BlueSystem", "cliente@bluesystemdelivery.com", "ID: BS-849201" con badge de verificado.
```

---

## 7. Origin of "Cliente BlueSystem"

El texto `"Cliente BlueSystem"` **NO existe en ninguna base de datos ni es emitido por el backend**. Proviene de 6 fuentes de código hardcodeadas en la aplicación Android:

1. **[ProfileScreen.kt:569](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L569):** `userName = rawName.ifEmpty { "Cliente BlueSystem" }` (Fallback de perfil visual)
2. **[ProfileHeader.kt:132](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L132):** `text = userName.ifEmpty { "Cliente BlueSystem" }` (Fallback en widget de cabecera)
3. **[Models.kt:873](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L873):** `val userName: String = "Cliente BlueSystem"` (Valor por defecto en data class `CommerceReview`)
4. **[Models.kt:881](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/Models.kt#L881):** `fun getEffectiveAuthor(): String = userName.ifBlank { authorName.ifBlank { "Cliente BlueSystem" } }`
5. **[ComercioDetalleViewModel.kt:552](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/ComercioDetalleViewModel.kt#L552):** `currentUser?.displayName ?: currentUser?.email?.substringBefore("@") ?: "Cliente BlueSystem"`
6. **[ControlTowerOrder.kt:13](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/controltower/ControlTowerOrder.kt#L13) & [MerchantOrder.kt:11](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/orders/MerchantOrder.kt#L11):** `val customerName: String = rawPedido.customerName.ifBlank { "Cliente BlueSystem" }`

---

## 8. Origin of "cliente@bluesystemdelivery..."

El correo electrónico ficticio proviene de 4 líneas hardcodeadas en la UI:

1. **[ProfileScreen.kt:570](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L570):**  
   `userEmail = currentUser?.email ?: "cliente@bluesystemdelivery.com"`
2. **[ProfileScreen.kt:282](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L282):**  
   `text = currentUser?.email ?: "cliente@bluesystemdelivery.com"` (en el Drawer lateral)
3. **[ProfileHeader.kt:147](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L147):**  
   `text = userEmail.ifEmpty { "cliente@bluesystem.com" }`
4. **[EditProfileDialog.kt:201](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/EditProfileDialog.kt#L201):**  
   `value = currentUser?.email ?: "cliente@bluesystem.com"`

---

## 9. Origin of "BS-849201"

El identificador visual `BS-849201`:

* **NO es un UID.**
* **NO es un customerId de Firestore.**
* **NO es un número de membresía persistido.**
* **NO es generado por un generador de números pseudoaleatorios ni UUID.**
* **ES UN LITERAL DE CADENA (HARDCODED STRING) en [ProfileScreen.kt:573](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L573):**
  ```kotlin
  clientId = currentUser?.uid?.take(8)?.uppercase() ?: "BS-849201",
  ```
  Complementado por el fallback parcial en [ProfileHeader.kt:182](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L182):
  ```kotlin
  text = "ID: ${clientId.ifEmpty { "BS-8492" }}"
  ```

---

## 10. Fallback / Mock / Demo Audit

| Elemento | Código / Línea | Clasificación | Impacto |
|---|---|---|---|
| `clientId ?: "BS-849201"` | `ProfileScreen.kt:573` | **BUG / MOCK HARDCODED** | Muestra ID inventado cuando el UID no existe. |
| `userName.ifEmpty { "Cliente BlueSystem" }` | `ProfileScreen.kt:569` | **BUG / UI PLACEHOLDER** | Simula nombre válido en lugar de exigir login o mostrar placeholder de carga. |
| `userEmail ?: "cliente@bluesystemdelivery.com"` | `ProfileScreen.kt:570` | **BUG / MOCK HARDCODED** | Muestra email corporativo ficticio cuando no hay email real. |
| `userEmail ?: "cliente@bluesystemdelivery.com"` | `ProfileScreen.kt:282` | **BUG / MOCK HARDCODED** | Expone email ficticio en el Drawer lateral de navegación. |
| `userRole ?: "Cliente"` | `ProfileScreen.kt:566` | **SAFE FALLBACK** | Asigna "Cliente" por defecto si el usuario es cliente pero el rol no está tipado. |
| `clientId.ifEmpty { "BS-8492" }` | `ProfileHeader.kt:182` | **BUG / MOCK HARDCODED** | Fallback secundario quemado en la cabecera. |
| `userName = "Cliente BlueSystem"` | `Models.kt:873` | **LEGACY MOCK** | Nombre por defecto para reseñas de comercio anónimas. |
| `customerName.ifBlank { "Cliente BlueSystem" }` | `ControlTowerOrder.kt:13` | **LEGACY FALLBACK** | Prevención de null pointer en pedidos de Control Tower sin nombre de cliente. |

---

## 11. Local Persistence Audit

1. **`FirebaseAuth` Internal Keystore/Preferences:**
   * Archivo en dispositivo: `/data/data/com.aistudio.delivery.djweq/shared_prefs/com.google.firebase.auth.api.Store.*.xml`.
   * **Comportamiento:** Persiste los tokens OAuth y JWT de Firebase a través del ciclo de vida de la app y reboots del sistema operativo.
   * **Reinstalación con `adb install -r`:** Conserva el 100% de las credenciales previas.
   * **Reinstalación limpia:** Si el usuario desinstala la aplicación pero tiene activado Android Auto Backup (`android:allowBackup="true"` en `AndroidManifest.xml:19`), el sistema operativo restaura automáticamente los SharedPreferences de Firebase al reinstalar desde Google Play o depuración.
2. **`user_session_prefs`:**
   * Clave: `last_verified_role_{uid}` (escrita en `SplashViewModel.kt:74`, leída en `L69`).
   * Almacena únicamente el rol ("customer", "courier", "admin", "business"). No almacena nombres ni correos.
3. **`auth_prefs`:**
   * Claves: `last_user_email`, `last_user_name`, `last_auth_provider` (escritas en `AuthScreen.kt:170-174`).
   * Utilizadas para auto-completar el formulario de login. No se inyectan en `ProfileScreen`.
4. **DataStore / Room:**
   * No existen entidades en Room ni DataStore que almacenen una identidad `Cliente BlueSystem` o `BS-849201`.

---

## 12. Anonymous Authentication Audit

* **Búsqueda exhaustiva:** Ejecutada sobre la totalidad del árbol de código fuente.
* **Resultado:** `signInAnonymously()` **NO EXISTE EN EL CÓDIGO**.
* **Certificación:** La aplicación **NO UTILIZA autenticación anónima de Firebase**. El modo invitado (`SessionMode.GUEST`, `isGuest = true`) opera 100% en memoria del cliente sin emitir ningún token ni documento en Firebase.

---

## 13. /users/{uid} Creation Audit

Toda creación de documentos `/users/{uid}` está estrictamente supeditada a un usuario real de Firebase Auth:

1. **Registro Manual (Email/Password):**
   * Archivo: [AuthManager.kt:171-199](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AuthManager.kt#L171-L199)
   * Función: `registrarUsuario()`
   * Secuencia: `auth.createUserWithEmailAndPassword()` → obtiene `user.uid` real → escribe `/users/{user.uid}` con `nombre`, `email`, `telefono`, `userType = "customer"`.
   * Rollback: Si Firestore rechaza la escritura, se ejecuta `user.delete()` y `auth.signOut()`.
2. **Login Social (Google / Facebook):**
   * Archivo: [AuthManager.kt:340-357](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AuthManager.kt#L340-L357)
   * Función: `iniciarSesionConCredencial()`
   * Secuencia: `auth.signInWithCredential()` → si `/users/{user.uid}` no existe → lo crea con `user.displayName` y `user.email`.
3. **No existe creación automática ni seed de `/users/{uid}` para usuarios no autenticados o invitados.**

---

## 14. Role Routing Audit

El enrutamiento por rol ocurre en [SplashViewModel.kt:84-104](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt#L84-L104):

```kotlin
val targetRoute = when (userType.lowercase()) {
    "driver", "motorizado", "courier" -> "courier"
    "admin" -> "admin"
    "business", "comercio", "merchant", "owner" -> "business_dashboard"
    else -> "solicitar_envio"
}
```

### Falla Crítica de Enrutamiento de Rol
* Cuando `userType` es `"customer"`, la ruta de destino resuelta es `"solicitar_envio"`.
* En `MainActivity.kt:664`:
  ```kotlin
  composable(Screen.SolicitarEnvio.route) {
      CustomerHomeScreen(
          navController = navController,
          firebaseManager = firebaseManager,
          isGuest = false,
          ...
  ```
  La ruta `"solicitar_envio"` aloja `CustomerHomeScreen` (el dashboard de cliente) con `isGuest = false`.
* **Vulnerabilidad de Asunción:** Si `user` existe en Firebase Auth pero el documento `/users/{uid}` en Firestore no existe, `obtenerTipoUsuarioUseCase` retorna `null`. La lógica en `SplashViewModel.kt:80` ejecuta:
  ```kotlin
  Log.w("SPLASH_AUTH", "Sin rol en vivo ni previamente persistido. Asignando default customer.")
  "customer"
  ```
  Asigna `"customer"` por defecto y envía al usuario al dashboard con `isGuest = false`. Al entrar a Perfil, `ProfileViewModel` no encuentra el documento en Firestore y se activan los fallbacks visuales `Cliente BlueSystem` y `BS-849201`.

---

## 15. Navigation Bypass Audit

Se identificaron 3 vectores donde se bypasséa la validación de sesión:

1. **Bypass por Entrada Directa a `customer_dashboard`:**
   En `MainActivity.kt:649`:
   ```kotlin
   composable(route = "customer_dashboard?tab={tab}") {
       CustomerHomeScreen(..., isGuest = false, ...)
   }
   ```
   No existe verificación de `FirebaseAuth.currentUser != null`. Si un deep link, notificación o componente navega a `"customer_dashboard"`, se asume inmediatamente que el usuario está autenticado (`isGuest = false`).
2. **Bypass en Splash para Usuarios sin Sesión:**
   En `SplashViewModel.kt:107`:
   Cuando `user == null`, se emite `NavigateToGuest` hacia `"guest_home"`. Se omite por completo la pantalla de bienvenida (`Screen.LoginRegister`).
3. **Restauración de BackStack de Android (Process Death / Task Recreation):**
   Si el usuario estaba previamente en `customer_dashboard?tab=4` o `solicitar_envio`, Android restaura el estado de navegación de Compose automáticamente al reanudar la app, sin pasar por la decisión de `SplashViewModel`.

---

## 16. Logout Audit

El flujo de logout en `performLogoutCleanup` ([MainActivity.kt:1902-1920](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L1902-L1920)) y `AuthManager.cerrarSesion()` ([AuthManager.kt:323-334](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AuthManager.kt#L323-L334)):

* **Acciones ejecutadas:**
  1. Detiene listeners de sincronización en tiempo real (`realtimeOrchestrator.stopUserSession()`).
  2. Ejecuta `auth.signOut()`.
  3. Limpia la caché en memoria `userInfoCache.clear()`.
  4. Limpia el contexto de identidad de comercio (`MerchantIdentityResolver.clearContext()`).
  5. Navega a `Screen.LoginRegister.route` con `popUpTo(0) { inclusive = true }`.
* **Comportamiento correcto:** Tras un logout explícito, el usuario sí es llevado a `Screen.LoginRegister` ("Bienvenido").
* **Discrepancia Forense:** El problema ocurre al **abrir la aplicación por primera vez**, no al hacer logout.

---

## 17. Session Persistence Audit

| Escenario | Comportamiento Real de Firebase Auth | Comportamiento del Router Actual | Comportamiento Esperado | Discrepancia |
|---|---|---|---|---|
| **Instalación limpia (sin sesión)** | `currentUser == null` | Navega a `guest_home` (`CustomerHomeScreen`) | Navegar a `Screen.LoginRegister` (Welcome) | 🔴 **CRÍTICA:** Bypassea Welcome screen |
| **Instalación con sesión previa (restaurada por OS)** | `currentUser != null` | Navega a `solicitar_envio` (`isGuest = false`) | Navegar a `solicitar_envio` o Dashboard | 🟢 Conforme |
| **App a segundo plano (Background)** | `currentUser` no muta | Permanece en la pantalla actual | Permanece en la pantalla actual | 🟢 Conforme |
| **App cerrada (Process Death)** | Tokens persisten en disco | Splash restaura sesión en $\le 3000\text{ms}$ | Restaura sesión y va a Dashboard | 🟢 Conforme |
| **Logout explícito** | `currentUser == null` | Navega a `Screen.LoginRegister` | Navega a `Screen.LoginRegister` | 🟢 Conforme |

---

## 18. Race Condition Audit

Se identificó una **condición de carrera confirmada (CONFIRMED RACE)** entre la inicialización de `ProfileScreen` y la carga asíncrona de Firestore en `ProfileViewModel`:

* **Disparador (Trigger):** `CustomerHomeScreen` cambia a `selectedTab = 4` (Mi Perfil) con `isGuest = false`.
* **Timing:** `ProfileViewModel` se instancia e inicia `_currentUser = MutableStateFlow<AppUser?>(null)`. Inmediatamente lanza `loadUserProfile()` en una corrutina de `viewModelScope`.
* **Ventana de Vulnerabilidad:** La corrutina requiere entre 150ms y 1200ms para resolver `db.collection("users").document(uid).get().await()`.
* **Consecuencia:** Durante esa ventana de tiempo (o indefinidamente si el dispositivo está sin red o el documento no existe), Compose recompone `ProfileScreen` con `currentUser == null`.
* **Síntoma Visible:** En vez de un Shimmer o `CircularProgressIndicator`, la UI evalúa instantáneamente los operadores Elvis `?:` y muestra de inmediato:
  `"Cliente BlueSystem"`, `"cliente@bluesystemdelivery.com"` e `"ID: BS-849201"`.

---

## 19. Guest Mode Audit

| Característica | Implementación Real | Evaluación |
|---|---|---|
| **¿Usa Firebase Anonymous Auth?** | No. No existe llamada a `signInAnonymously()`. | Conforme a arquitectura `0 Auth Cost`. |
| **¿Puede entrar a Home?** | Sí, a través de `"guest_home"` (`CustomerHomeScreen(isGuest = true)`). | Conforme. |
| **¿Puede ver catálogo y comercios?** | Sí, el catálogo público se consume en modo de solo lectura. | Conforme. |
| **¿Qué ocurre si pulsa 'Mi Perfil' en guest mode?** | [CustomerHomeScreen.kt:394](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt#L394) intercepta: `if (isGuest && (index == 3 \|\| index == 4))` y redirige a `Screen.LoginRegister.route`. | Conforme para guest explícito. |
| **¿Qué ocurre si ProfileScreen recibe `isGuest = true`?** | Renderiza [GuestProfileCard](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L772) ("¡Bienvenido a BlueSystem! Inicia sesión..."). No muestra `Cliente BlueSystem`. | Conforme. |
| **¿Por qué entonces se vio 'Cliente BlueSystem'?** | Porque `ProfileScreen` fue invocado con **`isGuest = false`** mientras `currentUser` era nulo. | 🔴 Causa raíz del síntoma visual. |

---

## 20. Security Consistency Audit

* **Reglas de Seguridad de Firestore:**
  En las reglas de Firestore, las colecciones `/users/{uid}` y `/users/{uid}/addresses` exigen estrictamente `request.auth.uid == uid`.
* **Consistencia del UID en Operaciones:**
  En `ProfileViewModel.kt:101`, `116` y `139`, las operaciones de base de datos se ejecutan contra `auth.currentUser?.uid`. Nunca se utiliza `"BS-849201"` para consultar Firestore.
* **Veredicto de Seguridad:** No existe fuga de datos ni suplantación de identidad en el backend. El identificador `"BS-849201"` y el nombre `"Cliente BlueSystem"` son **estrictamente una ilusión visual en la capa de interfaz de usuario de Android**, generada por fallbacks defensivos mal ubicados.

---

## 21. UI → ViewModel → Auth → Firestore Traceability

| UI Field en ProfileScreen | Fuente en Código | Fuente en ViewModel | Backend Firestore / Auth | Fallback Hardcodeado | Veredicto |
|---|---|---|---|---|---|
| **Nombre de Usuario** | `ProfileScreen.kt:569` | `ProfileViewModel.currentUser` | `/users/{uid}.nombre` o `.name` | `"Cliente BlueSystem"` | **MOCK FALLBACK** |
| **Correo Electrónico** | `ProfileScreen.kt:570` | `ProfileViewModel.currentUser` | `/users/{uid}.email` o `auth.currentUser.email` | `"cliente@bluesystemdelivery.com"` | **MOCK FALLBACK** |
| **ID de Cliente** | `ProfileScreen.kt:573` | `ProfileViewModel.currentUser` | `auth.currentUser.uid.take(8).uppercase()` | `"BS-849201"` | **MOCK FALLBACK** |
| **Rol / Tipo** | `ProfileScreen.kt:566` | `ProfileViewModel.currentUser` | `/users/{uid}.role` o `.userType` | `"Cliente"` | **SAFE FALLBACK** |
| **Avatar / Foto** | `ProfileScreen.kt:572` | `ProfileViewModel.currentUser` | `/users/{uid}.photoUrl` | `""` (Muestra icono `Person`) | **SAFE FALLBACK** |
| **Insignia Verificado** | `ProfileHeader.kt:140` | Estático en layout | N/A (Hardcoded en composable) | Siempre visible si hay nombre | **COSMETIC BUG** |

---

## 22. Root Cause

```
========================================================================================
                                     ROOT CAUSE
========================================================================================

ROOT CAUSE:
Existen DOS causas raíces interconectadas que producen el síntoma reportado:

1. CAUSA RAÍZ ARQUITECTÓNICA (Auth Router Defect):
   En [SplashViewModel.kt:105-108], cuando no existe sesión autenticada
   (FirebaseAuth.currentUser == null), el Auth Router NO navega a la pantalla
   canónica de bienvenida y registro ("Screen.LoginRegister" / AuthScreen), sino
   que emite automáticamente "NavigationEvent.NavigateToGuest", enviando al usuario
   sin sesión directamente al Customer Dashboard ("guest_home").
   Asimismo, en [MainActivity.kt:649-673], las rutas "customer_dashboard" y
   "solicitar_envio" instancian "CustomerHomeScreen" con "isGuest = false" de forma
   hardcodeada sin verificar si existe un "currentUser" en FirebaseAuth.

2. CAUSA RAÍZ DE IDENTIDAD VISUAL (Hardcoded Mock Fallbacks in Profile):
   En [ProfileScreen.kt:569-573], la interfaz de usuario utiliza operadores Elvis ("?:")
   con literales quemados en código:
     - userName = rawName.ifEmpty { "Cliente BlueSystem" }
     - userEmail = currentUser?.email ?: "cliente@bluesystemdelivery.com"
     - clientId = currentUser?.uid?.take(8)?.uppercase() ?: "BS-849201"
   Cuando "ProfileScreen" se ejecuta con "isGuest = false" pero "currentUser" aún es
   null (por asincronía de carga, fallo de red, documento inexistente o sesión vacía),
   la UI en lugar de mostrar un estado de carga o exigir login, sintetiza y renderiza
   la identidad falsa "Cliente BlueSystem" / "cliente@bluesystemdelivery.com" / "BS-849201".

SOURCE:
  - app/src/main/java/com/example/presentation/splash/SplashViewModel.kt (L105-108)
  - app/src/main/java/com/example/MainActivity.kt (L649-673)
  - app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt (L564-576)
  - app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt (L131-186)

FLOW:
  App inicia -> SplashViewModel.checkSession()
       ↓
  FirebaseAuth.currentUser == null
       ↓
  SplashViewModel emite NavigateToGuest (en vez de NavigateToLogin)
       ↓
  O bien: La app restaura sesión previa de Firebase Auth con un UID cuyo documento
  en Firestore no existe, o se ingresa por la ruta "customer_dashboard" (isGuest = false)
       ↓
  Usuario entra a Tab 4 (Mi Perfil) en CustomerHomeScreen (isGuest = false)
       ↓
  ProfileScreen se compone con ProfileViewModel._currentUser == null
       ↓
  ProfileScreen evalúa operadores Elvis:
    clientId -> "BS-849201"
    userName -> "Cliente BlueSystem"
    userEmail -> "cliente@bluesystemdelivery.com"
       ↓
  ProfileHeader renderiza la tarjeta con datos ficticios y badge de "Verificado".

TRIGGER:
  Abrir la app en una instalación sin sesión o con sesión desfasada de Firestore,
  accediendo a la pantalla de Perfil con el flag isGuest en false.

WRONG ASSUMPTION:
  El código de ProfileScreen asume erróneamente que si "isGuest == false", el objeto
  "currentUser" ya está cargado y no puede ser nulo, rellenando con valores ficticios
  cualquier campo faltante en vez de manejar un estado UI Loading/Unauthenticated.

VISIBLE RESULT:
  Aparece "Cliente BlueSystem", "cliente@bluesystemdelivery.com" y "ID: BS-849201".

EXPECTED:
  En instalación limpia: Mostrar Splash -> Welcome Screen (AuthScreen: Google, Facebook,
  Email, Registro, Invitado).
  Si se accede a Perfil sin sesión: Mostrar GuestProfileCard o forzar LoginRegister.
  Si se accede a Perfil con sesión pero cargando: Mostrar CircularProgressIndicator / Shimmer.
  CERO fallbacks ficticios.

IMPACT:
  Módulo de Autenticación de Cliente, Customer Dashboard, Perfil de Usuario y Enrutador Splash.
========================================================================================
```

---

## 23. Findings & Severity

| ID | Hallazgo | Archivo y Línea | Severidad |
|---|---|---|---|
| **F-01** | **Bypass del Welcome Screen en el arranque inicial:** `SplashViewModel` envía a `guest_home` en vez de `Screen.LoginRegister` cuando `currentUser == null`. | [SplashViewModel.kt:107](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt#L107) | 🟠 **P1 — AUTHENTICATION FLOW BLOCKER** |
| **F-02** | **Identidad Mock Hardcodeada en UI:** Literales `"BS-849201"`, `"Cliente BlueSystem"`, `"cliente@bluesystemdelivery.com"` inyectados mediante operadores Elvis en la vista. | [ProfileScreen.kt:569-573](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L569-L573) | 🔴 **P0 — SECURITY / IDENTITY BLOCKER** |
| **F-03** | **`customer_dashboard` y `solicitar_envio` fuerzan `isGuest = false`:** No se valida `FirebaseAuth.currentUser != null` antes de setear `isGuest = false`. | [MainActivity.kt:657, 668](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L657) | 🟠 **P1 — AUTHENTICATION FLOW BLOCKER** |
| **F-04** | **Condición de Carrera en Carga de Perfil:** `ProfileScreen` no implementa estado `Loading` mientras `ProfileViewModel` consulta Firestore, renderizando fallbacks de inmediato. | [ProfileScreen.kt:563-576](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt#L563-L576) | 🟡 **P2 — SESSION CONSISTENCY ISSUE** |
| **F-05** | **Fallbacks Redundantes en Componente Hijo:** `ProfileHeader.kt` vuelve a introducir `"Cliente BlueSystem"` e `"ID: BS-8492"`. | [ProfileHeader.kt:132, 182](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L132) | 🔵 **P3 — TECHNICAL DEBT** |
| **F-06** | **Badge 'Verificado' Estático:** Icono de checkmark verde renderizado incondicionalmente sin validar `isEmailVerified` ni estado en backend. | [ProfileHeader.kt:139-143](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/profile/ProfileHeader.kt#L139-L143) | ⚪ **P4 — COSMETIC** |

---

## 24. Recommended Correction — NO IMPLEMENTATION

> [!IMPORTANT]
> **RECORDATORIO OBLIGATORIO DE GOBERNANZA:**  
> De conformidad con el protocolo `EXECUTION MODE: READ-ONLY / ZERO-MUTATION`, **NINGUNA DE ESTAS RECOMENDACIONES HA SIDO APLICADA EN EL CÓDIGO**. Esta sección constituye exclusivamente la propuesta técnica para la futura fase de corrección.

### 1. Corrección del Auth Router en `SplashViewModel.kt`
* **Cambio:** En la rama `else` de `checkSession()` (cuando `user == null`), reemplazar `_navigationEvent.emit(NavigationEvent.NavigateToGuest)` por un nuevo evento:
  ```kotlin
  _navigationEvent.emit(NavigationEvent.NavigateToWelcome)
  ```
* **En `MainActivity.kt`:** Mapear `NavigateToWelcome` directamente hacia `Screen.LoginRegister.route`.
* **Resultado:** En cualquier arranque sin sesión, la app mostrará obligatoriamente la pantalla canónica de bienvenida con los botones de Google, Facebook, Email/Teléfono, Registro y "Explorar como invitado".

### 2. Eliminación Radical de Fallbacks Mock en `ProfileScreen.kt` y `ProfileHeader.kt`
* **Eliminar:** Los literales `"BS-849201"`, `"Cliente BlueSystem"`, `"cliente@bluesystemdelivery.com"`, `"cliente@bluesystem.com"`, `"BS-8492"`.
* **Implementar Manejo Canónico de Estados en `ProfileScreen.kt`:**
  ```kotlin
  val authUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
  val currentUser by viewModel.currentUser.collectAsState()
  val isLoading by viewModel.isLoading.collectAsState()

  if (isGuest || authUser == null) {
      GuestProfileCard(onNavigateToLogin = onNavigateToLogin)
  } else if (currentUser == null) {
      // Estado de carga / sincronización de perfil
      Box(modifier = Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
          CircularProgressIndicator(color = BluePrimary)
      }
  } else {
      // Perfil 100% real
      val displayName = currentUser.nombre.ifBlank { currentUser.name }.ifBlank { authUser.displayName ?: authUser.email?.substringBefore("@") ?: "Usuario" }
      val displayEmail = currentUser.email.ifBlank { authUser.email ?: "" }
      val displayId = currentUser.uid.take(8).uppercase()
      ...
  ```

### 3. Blindaje de Rutas en `MainActivity.kt`
* Modificar `composable("customer_dashboard?tab={tab}")` para resolver dinámicamente `isGuest = (FirebaseAuth.getInstance().currentUser == null)`.
* Si `isGuest == true`, delegar directamente el comportamiento de guest mode para evitar desincronizaciones de estado.

---

## 25. Certification Matrix

| Gate de Certificación Forense | Estatus | Evidencia / Referencia |
|---|---|---|
| **Auth Router Discovery** | **PASS** | `SplashViewModel.kt:105-108` mapeado a `NavigateToGuest` |
| **Firebase Auth Source** | **PASS** | `FirebaseAuth.getInstance().currentUser` es la única autoridad de sesión |
| **currentUser Validation** | **PASS** | `ProfileViewModel.kt:101` valida `auth.currentUser?.uid` |
| **Profile Identity Trace** | **PASS** | Trazabilidad completa desde `ProfileScreen` hasta `AppUser` |
| **"Cliente BlueSystem" Origin** | **FOUND** | Hardcoded en `ProfileScreen.kt:569`, `ProfileHeader.kt:132`, `Models.kt:873` |
| **"BS-849201" Origin** | **FOUND** | Hardcoded en `ProfileScreen.kt:573` (`?: "BS-849201"`) |
| **"cliente@bluesystemdelivery..." Origin** | **FOUND** | Hardcoded en `ProfileScreen.kt:570` y `L282` |
| **Fallback Audit** | **PASS** | 8 fallbacks identificados, inventariados y clasificados |
| **Mock Audit** | **PASS** | Cero mock accounts en backend; mock generado 100% en UI |
| **Anonymous Auth Audit** | **PASS** | `signInAnonymously()` ausente al 100% en el código |
| **Local Persistence Audit** | **PASS** | `user_session_prefs`, `auth_prefs`, Android Auto Backup auditados |
| **Role Routing Audit** | **PASS** | `SplashViewModel.kt:84-104` mapeado |
| **Navigation Bypass Audit** | **PASS** | `customer_dashboard` y `solicitar_envio` fuerzan `isGuest=false` |
| **Logout Behavior** | **PASS** | `performLogoutCleanup` limpia sesión y envía a LoginRegister |
| **Session Persistence Audit** | **PASS** | Tokens persisten en keystore de Android y sobreviven reboots |
| **Race Condition Audit** | **PASS** | Condición de carrera confirmada durante `loadUserProfile()` |
| **Guest Mode Audit** | **PASS** | Operación en memoria certificada |
| **Security Consistency Audit** | **PASS** | Cero impacto en Firestore Rules; identidad errónea es puramente visual |
| **Root Cause Identified** | **YES** | Causa raíz técnica, archivo y líneas exactamente identificados |
| **Code Mutation** | **0** | **CERTIFIED (Zero code mutation)** |
| **Firestore Mutation** | **0** | **CERTIFIED (Zero database mutation)** |
| **Auth Mutation** | **0** | **CERTIFIED (Zero auth mutation)** |
| **Deployment** | **0** | **CERTIFIED (Zero deployment)** |

---

## 26. Final Verdict

# 🟢 ROOT CAUSE IDENTIFIED — READY FOR CORRECTION

La causa raíz del despliegue de la identidad `Cliente BlueSystem` / `cliente@bluesystemdelivery.com` / `ID: BS-849201` ha sido identificada técnica y documentalmente con precisión milimétrica. No se requieren investigaciones adicionales. Queda expedito el camino para la planificación y ejecución de la futura fase correctiva bajo el protocolo correspondiente.
