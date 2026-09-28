# AUTHENTICATION_ARCHITECTURE.md
# Auditoría de Arquitectura de Autenticación — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fecha de Auditoría**: 2026-08-05

---

## 1. Providers de Autenticación Disponibles

### 1.1 Email / Password (IMPLEMENTADO Y ACTIVO)
- **Clase**: `AuthManager.kt` — `registrarUsuario()` y `iniciarSesion()`
- **SDK**: `FirebaseAuth.createUserWithEmailAndPassword()` y `signInWithEmailAndPassword()`
- **Flujo**:
  1. El usuario ingresa email + contraseña.
  2. Firebase Auth valida credenciales.
  3. Si es registro: crea usuario en Firestore `/users/{uid}` con campos base.
  4. Si falla Firestore: **rollback automático** (se elimina el usuario de Firebase Auth).
  5. Se envían eventos al `AuditLogger`.

### 1.2 Google Sign-In (IMPLEMENTADO Y ACTIVO)
- **Clase**: `AuthViewModel.kt` — `loginWithGoogleToken(idToken)`
- **Credencial**: `GoogleAuthProvider.getCredential(idToken, null)`
- **Flujo**:
  1. El cliente obtiene el `idToken` de Google.
  2. Se invoca `loginWithGoogleToken()` en el ViewModel.
  3. Internamente llama a `iniciarSesionConCredencial(credential)` en `AuthManager.kt`.
  4. Si el usuario **no existe** en Firestore, se crea automáticamente con `userType = "customer"`.
  5. Si falla Firestore: rollback + eliminación del usuario Auth huérfano.

### 1.3 Facebook Sign-In (IMPLEMENTADO Y ACTIVO)
- **Clase**: `AuthViewModel.kt` — `loginWithFacebookToken(accessToken)`
- **Credencial**: `FacebookAuthProvider.getCredential(accessToken)`
- **Flujo**: Idéntico al flujo de Google (ruta social unificada en `iniciarSesionConCredencial()`).

### 1.4 Social Provider Simulado (MODO DEMO)
- **Clase**: `AuthViewModel.kt` — `loginWithSocialProvider(provider: String)`
- Crea un `AuthUser` de prueba sin llamar a Firebase.
- **Solo para desarrollo/demo**. No produce sesión real en Firebase.

### 1.5 Anonymous / Modo Invitado (IMPLEMENTADO)
- **No** se usa `auth.signInAnonymously()`.
- El modo invitado está gestionado por `SessionManager.kt`.
- `SessionManager.isGuest()` retorna `true` cuando no existe usuario autenticado.
- `FirebaseManager.isPrivateAccessAllowed()` bloquea todos los listeners privados en modo guest.

---

## 2. Firebase Auth — Flujo Técnico

```
App Inicia
     │
     ▼
SplashViewModel.checkSession()
     │
     ▼
awaitFirebaseAuthInitialState()  ← espera hasta 3000ms AuthStateListener
     │
     ├─ user != null ──► obtenerTipoUsuarioUseCase(uid)
     │                        │
     │                        ▼
     │                  Firestore: /users/{uid}
     │                  Lee: role | rol | userType
     │                        │
     │                        ▼
     │                  SplashViewModel.NavigationEvent
     │                  (NavigateToCourier | NavigateToAdmin |
     │                   NavigateToBusinessDashboard | NavigateToSolicitarEnvio)
     │
     └─ user == null ──► NavigateToGuest (Modo Invitado)
```

---

## 3. UID y Token

- **UID**: Generado por Firebase Auth. Inmutable. Es la PK de `/users/{uid}` en Firestore.
- **Token (ID Token)**: JWT emitido por Firebase Auth. Se renueva automáticamente cada 1 hora.
- **No** existe gestión manual de tokens en la app; Firebase SDK maneja el refresh automáticamente.

---

## 4. Registro — Restricciones de Seguridad

| Restricción | Código |
|---|---|
| Admin bloqueado desde app móvil | `AuthManager.kt:37` — Si `userType == "admin"` o email contiene "admin", fuerza `"customer"` |
| Rollback automático si falla Firestore | `AuthManager.kt:83-92` — `user.delete().await()` + `signOut()` |
| Subcollections creadas al registro | `preferences/settings`, `notificationSettings/settings`, `shoppingCart/cart`, `favorites/list` |

---

## 5. Crashlytics — Tracking de Sesión

Al login exitoso (cualquier provider):
```kotlin
crashlytics.setUserId(user.uid)
crashlytics.setCustomKey("role", role)
crashlytics.setCustomKey("email", email)
crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME)
```

---

## 6. Logout

- **Clase**: `AuthManager.cerrarSesion()`
- Detiene todos los listeners activos del usuario vía `RealtimeSyncOrchestrator.stopUserSession()`.
- Llama a `auth.signOut()`.
- Registra evento `AUTH_LOGOUT` en `AuditLogger`.

---

## 7. Biometría (App Lock)

- **Clase**: `BiometricPreferences.kt`
- Si está habilitada: al iniciar sesión, el flujo pasa por `NavigateToBiometricUnlock(targetRoute)`.
- La pantalla de biometría desbloquea y redirige al destino original por rol.
