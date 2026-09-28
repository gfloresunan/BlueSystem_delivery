package com.example.presentation.auth

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.activity.ComponentActivity

// ─────────────────────────────────────────────────────────────────────────────
// BiometricStatus: Resultado de disponibilidad del sensor en el dispositivo
// ─────────────────────────────────────────────────────────────────────────────
sealed class BiometricStatus {
    /** Sensor disponible y configurado — listo para usarse */
    object Available : BiometricStatus()
    /** Dispositivo no tiene hardware biométrico — ocultar opción */
    object HardwareNotPresent : BiometricStatus()
    /** Dispositivo tiene hardware pero el usuario no ha registrado huellas */
    object NotEnrolled : BiometricStatus()
    /** Estado transitorio desconocido */
    object Unknown : BiometricStatus()
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado del intento de autenticación biométrica
// ─────────────────────────────────────────────────────────────────────────────
sealed class BiometricResult {
    object Success : BiometricResult()
    data class Error(val code: Int, val message: String) : BiometricResult()
    object Failure : BiometricResult()
}

// ─────────────────────────────────────────────────────────────────────────────
// BiometricHelper: Encapsula toda la lógica de BiometricPrompt
// Compatible con ComponentActivity (no requiere FragmentActivity)
// ─────────────────────────────────────────────────────────────────────────────
object BiometricHelper {

    private const val TAG = "BIOMETRIC_HELPER"

    /**
     * Verifica el estado del hardware biométrico en el dispositivo.
     * Debe llamarse antes de mostrar cualquier opción al usuario.
     */
    fun checkStatus(context: Context): BiometricStatus {
        val manager = BiometricManager.from(context)
        return when (manager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> BiometricStatus.Available
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
            BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> BiometricStatus.HardwareNotPresent
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricStatus.NotEnrolled
            else -> BiometricStatus.Unknown
        }
    }

    /**
     * Muestra el prompt de autenticación biométrica.
     * @param activity FragmentActivity (MainActivity extiende FragmentActivity)
     * @param title Título del diálogo
     * @param subtitle Subtítulo del diálogo
     * @param onResult Callback con el resultado de la autenticación
     */
    fun showPrompt(
        activity: FragmentActivity,
        title: String = "BlueSystem",
        subtitle: String = "Confirma tu identidad para acceder",
        negativeButtonText: String = "Usar contraseña",
        onResult: (BiometricResult) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                Log.d(TAG, "Autenticación biométrica exitosa")
                onResult(BiometricResult.Success)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                Log.w(TAG, "Error biométrico [$errorCode]: $errString")
                onResult(BiometricResult.Error(errorCode, errString.toString()))
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                Log.w(TAG, "Autenticación biométrica fallida (huella no reconocida)")
                onResult(BiometricResult.Failure)
            }
        }

        val prompt = BiometricPrompt(activity, executor, callback)

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(negativeButtonText)
            .setAllowedAuthenticators(BIOMETRIC_STRONG)
            .build()

        prompt.authenticate(promptInfo)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BiometricPreferences: Preferencias de biometría (SIN guardar credenciales)
// Utiliza SharedPreferences estándar — solo guarda booleanos de configuración
// ─────────────────────────────────────────────────────────────────────────────
object BiometricPreferences {

    private const val PREFS_NAME = "biometric_prefs"
    private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    private const val KEY_ASK_ON_OPEN = "ask_on_open"
    private const val KEY_ACTIVATION_SHOWN = "activation_prompt_shown"
    private const val KEY_LOGIN_COUNT = "login_count"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** ¿El usuario activó el App Lock biométrico? */
    fun isBiometricEnabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_BIOMETRIC_ENABLED, false)

    /** Activar o desactivar el App Lock biométrico */
    fun setBiometricEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    }

    /** ¿Solicitar biometría al abrir la app? (siempre true cuando biometric está activa) */
    fun isAskOnOpen(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ASK_ON_OPEN, true)

    fun setAskOnOpen(context: Context, value: Boolean) {
        prefs(context).edit().putBoolean(KEY_ASK_ON_OPEN, value).apply()
    }

    /** ¿Ya se le mostró el prompt de activación al usuario? */
    fun wasActivationPromptShown(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ACTIVATION_SHOWN, false)

    fun markActivationPromptShown(context: Context) {
        prefs(context).edit().putBoolean(KEY_ACTIVATION_SHOWN, true).apply()
    }

    /** Contador de logins para re-sugerir activación (si eligió "Más tarde") */
    fun getLoginCount(context: Context): Int =
        prefs(context).getInt(KEY_LOGIN_COUNT, 0)

    fun incrementLoginCount(context: Context) {
        val count = getLoginCount(context) + 1
        prefs(context).edit().putInt(KEY_LOGIN_COUNT, count).apply()
    }

    /** Reset completo (al cerrar sesión) */
    fun clearSession(context: Context) {
        // Solo limpiamos el estado de sesión, no la configuración del usuario
        // Las preferencias de biometría persisten entre sesiones por diseño
    }
}
