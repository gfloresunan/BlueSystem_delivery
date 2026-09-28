package com.example

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.AuthCredential
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.perf.FirebasePerformance
import kotlinx.coroutines.tasks.await

class AuthManager {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance()

    val currentUser: FirebaseUser?
        get() = auth.currentUser

    suspend fun enviarCorreoRecuperacion(email: String): Result<Unit> {
        val cleanEmail = email.trim()
        Log.d("AUTH_DEBUG", "=== INICIO RECUPERACION DE CONTRASEÑA ===")
        Log.d("AUTH_DEBUG", "Email solicitado: $cleanEmail")

        if (cleanEmail.isBlank()) {
            Log.w("AUTH_DEBUG", "Error de validación: Email en blanco")
            return Result.failure(Exception("Por favor, ingresa tu correo electrónico."))
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(cleanEmail).matches()) {
            Log.w("AUTH_DEBUG", "Error de validación: Formato de email inválido ($cleanEmail)")
            return Result.failure(Exception("El formato del correo electrónico no es válido."))
        }
        AuditLogger.logEvent("AUTH_PASSWORD_RESET_REQUESTED", mapOf("email" to cleanEmail))

        return try {
            try {
                Log.d("AUTH_DEBUG", "Intentando invocar Cloud Function corporativa 'sendCorporatePasswordReset'...")
                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                val callable = functions.getHttpsCallable("sendCorporatePasswordReset")
                val payload = hashMapOf("email" to cleanEmail)
                val callResult = callable.call(payload).await()
                Log.d("AUTH_DEBUG", "🟢 Cloud Function corporativa 'sendCorporatePasswordReset' ejecutada con éxito. Respuesta: ${callResult.data}")
                AuditLogger.logEvent("AUTH_CORPORATE_PASSWORD_RESET_SENT", mapOf("email" to cleanEmail))
                Result.success(Unit)
            } catch (callableErr: Exception) {
                Log.e("AUTH_DEBUG", "🔴 Error al invocar Cloud Function 'sendCorporatePasswordReset': ${callableErr.javaClass.simpleName} - ${callableErr.message}", callableErr)
                if (callableErr is com.google.firebase.functions.FirebaseFunctionsException) {
                    Log.e("AUTH_DEBUG", "FirebaseFunctionsException Code: ${callableErr.code}, Details: ${callableErr.details}")
                }
                Log.d("AUTH_DEBUG", "Activando Fallback nativo de Firebase Auth 'sendPasswordResetEmail' para garantizar continuidad operacional...")
                auth.sendPasswordResetEmail(cleanEmail).await()
                Log.d("AUTH_DEBUG", "🟢 Fallback nativo de Firebase Auth completado exitosamente.")
                AuditLogger.logEvent("AUTH_PASSWORD_RESET_FALLBACK_SENT", mapOf("email" to cleanEmail))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Log.e("AUTH_DEBUG", "🔴 Fallo definitivo en recuperación de contraseña: ${e.javaClass.simpleName} - ${e.message}", e)
            AuditLogger.logEvent("AUTH_PASSWORD_RESET_FAILED", mapOf("email" to cleanEmail, "error" to (e.message ?: "")))
            val friendlyError = when {
                e.message?.contains("formato", ignoreCase = true) == true -> Exception("El formato del correo electrónico no es válido.")
                else -> Exception("No fue posible procesar la solicitud en este momento. Inténtalo nuevamente más tarde.")
            }
            Result.failure(friendlyError)
        }
    }

    suspend fun enviarVerificacionCorreo(): Result<Unit> {
        val user = auth.currentUser ?: return Result.failure(Exception("Usuario no autenticado"))
        AuditLogger.logEvent("AUTH_EMAIL_VERIFICATION_REQUESTED", mapOf("uid" to user.uid, "email" to (user.email ?: "")))
        return try {
            try {
                // 1. Despacho Corporativo Oficial mediante Cloud Function & SMTP (noreply@bluesystemdelivery.com)
                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                val callable = functions.getHttpsCallable("sendCorporateEmailVerification")
                callable.call().await()
                AuditLogger.logEvent("AUTH_CORPORATE_EMAIL_VERIFICATION_SENT", mapOf("uid" to user.uid))
                Result.success(Unit)
            } catch (callableErr: Exception) {
                Log.w("AuthManager", "Fallo al despachar verificación corporativa vía Cloud Function, usando fallback: ${callableErr.message}")
                // 2. Fallback de cliente nativo si falla el callable
                user.sendEmailVerification().await()
                AuditLogger.logEvent("AUTH_EMAIL_VERIFICATION_SENT_FALLBACK", mapOf("uid" to user.uid))
                Result.success(Unit)
            }
        } catch (e: Exception) {
            AuditLogger.logEvent("AUTH_EMAIL_VERIFICATION_FAILED", mapOf("uid" to user.uid, "error" to (e.message ?: "")))
            val friendlyMsg = when {
                e.message?.contains("blocked all requests", ignoreCase = true) == true ||
                e.message?.contains("TOO_MANY_ATTEMPTS", ignoreCase = true) == true ||
                e.message?.contains("unusual activity", ignoreCase = true) == true ||
                e.message?.contains("resource-exhausted", ignoreCase = true) == true ->
                    "Has alcanzado el límite de intentos permitidos temporalmente. Por seguridad, por favor espera unos minutos antes de volver a intentarlo."
                else -> e.localizedMessage ?: "Error al procesar la solicitud de verificación."
            }
            Result.failure(Exception(friendlyMsg))
        }
    }

    suspend fun recargarEstadoUsuario(): Result<FirebaseUser?> {
        val user = auth.currentUser ?: return Result.failure(Exception("Usuario no autenticado"))
        return try {
            user.reload().await()
            val reloadedUser = auth.currentUser
            Result.success(reloadedUser)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun cambiarContrasena(
        contrasenaActual: String,
        nuevaContrasena: String
    ): Result<Unit> {
        val user = auth.currentUser ?: return Result.failure(Exception("Usuario no autenticado. Por favor inicia sesión nuevamente."))
        val email = user.email ?: return Result.failure(Exception("No se encontró el correo del usuario."))

        if (contrasenaActual.isBlank()) {
            return Result.failure(Exception("Debes ingresar tu contraseña actual."))
        }
        if (nuevaContrasena.length < 6) {
            return Result.failure(Exception("La nueva contraseña debe tener al menos 6 caracteres."))
        }
        if (contrasenaActual == nuevaContrasena) {
            return Result.failure(Exception("La nueva contraseña no puede ser igual a la anterior."))
        }

        AuditLogger.logEvent("AUTH_PASSWORD_CHANGE_REQUESTED", mapOf("uid" to user.uid))

        return try {
            // 1. Reautenticación obligatoria con la contraseña actual
            val credential = EmailAuthProvider.getCredential(email, contrasenaActual)
            user.reauthenticate(credential).await()

            // 2. Actualización de contraseña mediante Firebase Auth (NUNCA en Firestore)
            user.updatePassword(nuevaContrasena).await()

            AuditLogger.logEvent("AUTH_PASSWORD_CHANGE_SUCCESS", mapOf("uid" to user.uid))
            Result.success(Unit)
        } catch (e: Exception) {
            AuditLogger.logEvent("AUTH_PASSWORD_CHANGE_FAILED", mapOf("uid" to user.uid, "error" to (e.message ?: "")))
            val friendlyError = when {
                e.message?.contains("invalid-credential", ignoreCase = true) == true ||
                e.message?.contains("wrong-password", ignoreCase = true) == true -> {
                    Exception("La contraseña actual ingresada es incorrecta.")
                }
                e.message?.contains("weak-password", ignoreCase = true) == true -> {
                    Exception("La nueva contraseña es muy débil. Debe tener al menos 6 caracteres.")
                }
                e.message?.contains("requires-recent-login", ignoreCase = true) == true -> {
                    Exception("Esta operación requiere que vuelvas a iniciar sesión por seguridad.")
                }
                else -> Exception("Error al actualizar la contraseña: ${e.localizedMessage}")
            }
            Result.failure(friendlyError)
        }
    }

    suspend fun registrarUsuario(
        email: String,
        contrasena: String,
        nombreCompleto: String,
        telefono: String,
        userType: String = "customer" // En Customer App el registro es exclusivamente 'customer'
    ): Result<FirebaseUser> {
        val trace = FirebasePerformance.getInstance().newTrace("auth_register_trace")
        trace.start()
        AuditLogger.logEvent("AUTH_REGISTER_STARTED", mapOf("email" to email, "userType" to "customer"))
        
        return try {
            Log.d("REGISTER_FLOW", "Creating FirebaseAuth user...")
            val authResult = auth.createUserWithEmailAndPassword(email, contrasena).await()
            val user = authResult.user ?: throw Exception("No se pudo obtener el usuario creado.")
            Log.d("REGISTER_FLOW", "FirebaseAuth OK")
            
            // FASE 1 & ACTIVIDAD #6: El registro desde Customer App es estrictamente rol 'customer'
            val safeUserType = "customer"

            val userData = mutableMapOf<String, Any>(
                "uid" to user.uid,
                "email" to email,
                "nombre" to nombreCompleto,
                "name" to nombreCompleto,
                "telefono" to telefono,
                "phone" to telefono,
                "userType" to safeUserType,
                "role" to safeUserType,
                "rol" to safeUserType,
                "identityOrigin" to "APP",
                "createdVia" to "APP",
                "source" to "CUSTOMER_APP_SIGNUP",
                "active" to true,
                "isActive" to true,
                "fechaRegistro" to System.currentTimeMillis().toString()
            )

            try {
                Log.d("REGISTER_FLOW", "Creating Firestore user...")
                Log.d("REGISTER_FLOW", "Firestore path: users/${user.uid}")
                db.collection("users").document(user.uid).set(userData).await()
                Log.d("REGISTER_FLOW", "Firestore user created")
                
                val defaultPreferences = mapOf("theme" to "dark", "language" to "es")
                val defaultNotifications = mapOf("pushEnabled" to true, "emailEnabled" to true, "orderUpdates" to true)
                val defaultShoppingCart = mapOf("items" to emptyList<Map<String, Any>>(), "updatedAt" to System.currentTimeMillis())
                val defaultFavorites = mapOf("businessIds" to emptyList<String>(), "productIds" to emptyList<String>())
                
                db.collection("users").document(user.uid).collection("preferences").document("settings").set(defaultPreferences).await()
                db.collection("users").document(user.uid).collection("notificationSettings").document("settings").set(defaultNotifications).await()
                db.collection("users").document(user.uid).collection("shoppingCart").document("cart").set(defaultShoppingCart).await()
                db.collection("users").document(user.uid).collection("favorites").document("list").set(defaultFavorites).await()
                
                Log.d("REGISTER_FLOW", "Registration completed")
                AuditLogger.logEvent("PROFILE_CREATED", mapOf("uid" to user.uid, "email" to email))
            } catch (fsException: Exception) {
                Log.e("REGISTER_FLOW", "Firestore rejected user creation", fsException)
                Log.e("REGISTER_FLOW", "Firestore path: users/${user.uid}")
                Log.e("REGISTER_FLOW", "Security rule denied write", fsException)
                AuditLogger.logEvent("AUTH_REGISTER_FAIL_FIRESTORE", mapOf("uid" to user.uid, "error" to fsException.message))

                // FASE 6: Rollback obligatorio si falla Firestore. NUNCA registrar AUTH_REGISTER_SUCCESS si falla Firestore.
                Log.d("REGISTER_FLOW", "Rollback started")
                try {
                    user.delete().await()
                    auth.signOut()
                    AuditLogger.logRollback(user.uid, email, fsException.message ?: "Fallo al inicializar expediente en Firestore")
                } catch (delException: Exception) {
                    Log.e("AuthManager", "Error al ejecutar rollback de usuario", delException)
                }
                throw Exception("Error al inicializar la base de datos de usuario. Por favor, intenta de nuevo.")
            }
            
            // Configurar Crashlytics tras registro exitoso
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.setUserId(user.uid)
            crashlytics.setCustomKey("role", safeUserType)
            crashlytics.setCustomKey("email", email)
            crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME)
            
            AuditLogger.logEvent("AUTH_REGISTER_SUCCESS", mapOf("uid" to user.uid))
            trace.putAttribute("status", "success")
            Result.success(user)
        } catch (e: Exception) {
            AuditLogger.logEvent("AUTH_REGISTER_FAILED", mapOf("email" to email, "error" to e.message))
            trace.putAttribute("status", "error")
            val friendlyError = when (e) {
                is com.google.firebase.auth.FirebaseAuthUserCollisionException -> {
                    Exception("Este correo electrónico ya está registrado. Inicia sesión o utiliza otro correo.")
                }
                is com.google.firebase.auth.FirebaseAuthWeakPasswordException -> {
                    Exception("La contraseña ingresada es muy débil. Por seguridad, debe tener al menos 6 caracteres.")
                }
                is com.google.firebase.auth.FirebaseAuthInvalidCredentialsException -> {
                    Exception("El formato del correo electrónico ingresado no es válido.")
                }
                else -> e
            }
            Result.failure(friendlyError)
        } finally {
            trace.stop()
        }
    }

    suspend fun iniciarSesion(
        email: String,
        contrasena: String
    ): Result<FirebaseUser> {
        val trace = FirebasePerformance.getInstance().newTrace("auth_login_trace")
        trace.start()
        AuditLogger.logEvent("AUTH_LOGIN_STARTED", mapOf("email" to email))
        return try {
            val authResult = auth.signInWithEmailAndPassword(email, contrasena).await()
            val user = authResult.user ?: throw Exception("No se pudo iniciar sesión.")
            
            val userInfo = obtenerDatosUsuario(user.uid)
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.setUserId(user.uid)
            crashlytics.setCustomKey("role", userInfo.role)
            crashlytics.setCustomKey("email", email)
            crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME)
            
            AuditLogger.logEvent("AUTH_LOGIN_SUCCESS", mapOf("uid" to user.uid, "role" to userInfo.role))
            trace.putAttribute("status", "success")
            Result.success(user)
        } catch (e: Exception) {
            AuditLogger.logEvent("AUTH_LOGIN_FAILED", mapOf("email" to email, "error" to e.message))
            trace.putAttribute("status", "error")
            Result.failure(e)
        } finally {
            trace.stop()
        }
    }

    data class UserInfoData(val userType: String = "", val role: String = "")
    private val userInfoCache = java.util.concurrent.ConcurrentHashMap<String, UserInfoData>()

    suspend fun obtenerDatosUsuario(uid: String): UserInfoData {
        userInfoCache[uid]?.let { return it }
        return try {
            val doc = db.collection("users").document(uid).get().await()
            if (doc.exists()) {
                val rawRole = doc.getString("role") ?: doc.getString("eiamRole") ?: doc.getString("rol") ?: ""
                val rawUserType = doc.getString("userType") ?: rawRole
                val data = UserInfoData(userType = rawUserType, role = rawRole)
                userInfoCache[uid] = data
                data
            } else {
                UserInfoData(userType = "", role = "")
            }
        } catch (e: Exception) {
            Log.e("AuthManager", "Error al obtener datos de usuario", e)
            UserInfoData(userType = "", role = "")
        }
    }

    suspend fun obtenerTipoUsuario(uid: String): String? {
        val userType = obtenerDatosUsuario(uid).userType
        return userType.ifBlank { null }
    }

    suspend fun obtenerRole(uid: String): String? {
        val role = obtenerDatosUsuario(uid).role
        return role.ifBlank { null }
    }

    fun cerrarSesion(orchestrator: com.example.data.sync.RealtimeSyncOrchestrator? = null) {
        val stoppedCount = orchestrator?.stopUserSession() ?: 0
        val uid = auth.currentUser?.uid ?: "none"
        val email = auth.currentUser?.email
        Log.d("AUDIT_LOG", "LOGOUT_SIGNOUT_EXECUTED | StoppedUserListeners: $stoppedCount | UID: $uid | Email: $email | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
        Log.d("LOGOUT", "FirebaseAuth.signOut()")
        auth.signOut()
        userInfoCache.clear()
        com.example.domain.engine.auth.AppRoleResolver.clearCache(if (uid != "none") uid else null)
        com.example.eiam.domain.resolver.MerchantIdentityResolver.clearContext()
        AuditLogger.logEvent("AUTH_LOGOUT", mapOf("uid" to uid, "email" to email, "stoppedListeners" to stoppedCount))
        Log.d("LOGOUT", "Logout cleanup completed.")
    }

    suspend fun iniciarSesionConCredencial(credential: AuthCredential): Result<FirebaseUser> {
        val trace = FirebasePerformance.getInstance().newTrace("auth_social_login_trace")
        trace.start()
        return try {
            val authResult = auth.signInWithCredential(credential).await()
            val user = authResult.user ?: throw Exception("No se pudo iniciar sesión con la credencial.")
            
            // Si el usuario no existe en Firestore, lo creamos por defecto como "customer"
            val doc = db.collection("users").document(user.uid).get().await()
            if (!doc.exists()) {
                val userData = mutableMapOf(
                    "uid" to user.uid,
                    "email" to (user.email ?: ""),
                    "nombre" to (user.displayName ?: "Usuario Social"),
                    "telefono" to (user.phoneNumber ?: ""),
                    "userType" to "customer",
                    "fechaRegistro" to System.currentTimeMillis().toString()
                )
                
                try {
                    db.collection("users").document(user.uid).set(userData).await()
                    
                    val defaultPreferences = mapOf("theme" to "dark", "language" to "es")
                    val defaultNotifications = mapOf("pushEnabled" to true, "emailEnabled" to true, "orderUpdates" to true)
                    val defaultShoppingCart = mapOf("items" to emptyList<Map<String, Any>>(), "updatedAt" to System.currentTimeMillis())
                    val defaultFavorites = mapOf("businessIds" to emptyList<String>(), "productIds" to emptyList<String>())
                    
                    db.collection("users").document(user.uid).collection("preferences").document("settings").set(defaultPreferences).await()
                    db.collection("users").document(user.uid).collection("notificationSettings").document("settings").set(defaultNotifications).await()
                    db.collection("users").document(user.uid).collection("shoppingCart").document("cart").set(defaultShoppingCart).await()
                    db.collection("users").document(user.uid).collection("favorites").document("list").set(defaultFavorites).await()
                } catch (fsException: Exception) {
                    AuditLogger.logEvent("AUTH_SOCIAL_REGISTER_FAIL_FIRESTORE", mapOf("uid" to user.uid, "error" to fsException.message))
                    try {
                        user.delete().await()
                        AuditLogger.logRollback(user.uid, user.email ?: "", fsException.message ?: "Fallo al inicializar colecciones de usuario social")
                    } catch (delException: Exception) {
                        Log.e("AuthManager", "Error al intentar eliminar usuario huérfano de Firebase Auth", delException)
                    }
                    throw Exception("Error al inicializar la base de datos de usuario. Por favor, intenta de nuevo.")
                }
            }
            
            val role = obtenerRole(user.uid) ?: obtenerTipoUsuario(user.uid) ?: "customer"
            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.setUserId(user.uid)
            crashlytics.setCustomKey("role", role)
            crashlytics.setCustomKey("email", user.email ?: "")
            crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME)
            
            AuditLogger.logEvent("AUTH_SOCIAL_LOGIN_SUCCESS", mapOf("uid" to user.uid, "role" to role))
            trace.putAttribute("status", "success")
            Result.success(user)
        } catch (e: Exception) {
            AuditLogger.logEvent("AUTH_SOCIAL_LOGIN_FAILED", mapOf("error" to e.message))
            trace.putAttribute("status", "error")
            Result.failure(e)
        } finally {
            trace.stop()
        }
    }
}
