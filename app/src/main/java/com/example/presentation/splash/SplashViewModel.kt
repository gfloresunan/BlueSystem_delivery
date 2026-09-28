package com.example.presentation.splash

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.domain.usecase.CheckSessionUseCase
import com.example.domain.usecase.ObtenerTipoUsuarioUseCase
import com.example.presentation.auth.BiometricPreferences
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

class SplashViewModel(
    private val checkSessionUseCase: CheckSessionUseCase,
    private val obtenerTipoUsuarioUseCase: ObtenerTipoUsuarioUseCase,
    private val context: Context
) : ViewModel() {

    sealed class NavigationEvent {
        object NavigateToLoginRegister : NavigationEvent()
        object NavigateToGuest : NavigationEvent()
        object NavigateToCourier : NavigationEvent()
        object NavigateToAdmin : NavigationEvent()
        object NavigateToBusinessDashboard : NavigationEvent()
        object NavigateToSolicitarEnvio : NavigationEvent()
        /**
         * El usuario tiene sesión activa Y ha activado el App Lock biométrico.
         * Se encamina a BiometricUnlockScreen que luego redirige a [targetRoute].
         */
        data class NavigateToBiometricUnlock(val targetRoute: String) : NavigationEvent()
    }

    private val _navigationEvent = MutableSharedFlow<NavigationEvent>()
    val navigationEvent: SharedFlow<NavigationEvent> = _navigationEvent.asSharedFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            Log.d("AUTH_FLOW", "App iniciando")
            Log.d("SPLASH_AUTH", "Esperando restauración de FirebaseAuth...")

            val userDeferred = async {
                withTimeoutOrNull(3000L) { awaitFirebaseAuthInitialState() }
            }
            val minDelayDeferred = async { delay(400) }

            val user = userDeferred.await()
            minDelayDeferred.await()

            Log.d("AUTH_FLOW", "currentUser = ${user?.uid}")
            Log.d("AUTH_FLOW", "email = ${user?.email}")
            Log.d("AUTH_FLOW", "isAnonymous = ${user?.isAnonymous}")

            if (user != null) {
                Log.d("SPLASH_AUTH", "Sesión restaurada correctamente para UID ${user.uid}.")
                
                val resolution = com.example.domain.engine.auth.AppRoleResolver.resolveRole(context, user)
                val appRole = resolution.role
                Log.d("SPLASH_AUTH", "AppRole resuelto en Splash: $appRole (Fuente: ${resolution.source}, Conflicto: ${resolution.isConflict})")

                if (appRole == com.example.domain.model.AppRole.UNKNOWN) {
                    Log.e("SPLASH_AUTH", "FAIL_CLOSED: Rol no verificado o en conflicto para UID ${user.uid}. Redirigiendo a LoginRegister.")
                    _navigationEvent.emit(NavigationEvent.NavigateToLoginRegister)
                    return@launch
                }

                val targetRoute = com.example.domain.engine.auth.AppRoleResolver.getCanonicalDestination(appRole)

                // Si biometría está habilitada → App Lock screen primero
                val biometricEnabled = BiometricPreferences.isBiometricEnabled(context)
                Log.d("SPLASH_AUTH", "Navegando hacia destino canónico: $targetRoute (Biométrica activa: $biometricEnabled)")
                if (biometricEnabled) {
                    _navigationEvent.emit(NavigationEvent.NavigateToBiometricUnlock(targetRoute))
                } else {
                    // Sin biometría: ir directo al destino por rol canónico
                    when (appRole) {
                        com.example.domain.model.AppRole.COURIER -> _navigationEvent.emit(NavigationEvent.NavigateToCourier)
                        com.example.domain.model.AppRole.ADMIN -> _navigationEvent.emit(NavigationEvent.NavigateToAdmin)
                        com.example.domain.model.AppRole.MERCHANT -> _navigationEvent.emit(NavigationEvent.NavigateToBusinessDashboard)
                        com.example.domain.model.AppRole.CUSTOMER -> _navigationEvent.emit(NavigationEvent.NavigateToSolicitarEnvio)
                        com.example.domain.model.AppRole.UNKNOWN -> _navigationEvent.emit(NavigationEvent.NavigateToLoginRegister)
                    }
                }
            } else {
                Log.d("SPLASH_AUTH", "No existe sesión activa. Navegando directamente a Guest Dashboard.")
                _navigationEvent.emit(NavigationEvent.NavigateToGuest)
            }
        }
    }

    private suspend fun awaitFirebaseAuthInitialState(): FirebaseUser? = suspendCancellableCoroutine { continuation ->
        val auth = FirebaseAuth.getInstance()
        val current = auth.currentUser
        if (current != null) {
            if (continuation.isActive) continuation.resume(current)
            return@suspendCancellableCoroutine
        }

        var listener: FirebaseAuth.AuthStateListener? = null
        listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            val u = firebaseAuth.currentUser
            listener?.let {
                auth.removeAuthStateListener(it)
                listener = null
            }
            if (continuation.isActive) {
                continuation.resume(u)
            }
        }
        auth.addAuthStateListener(listener!!)
        continuation.invokeOnCancellation {
            listener?.let { auth.removeAuthStateListener(it) }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class SplashViewModelFactory(
    private val checkSessionUseCase: CheckSessionUseCase,
    private val obtenerTipoUsuarioUseCase: ObtenerTipoUsuarioUseCase,
    private val context: Context
) : androidx.lifecycle.ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(SplashViewModel::class.java)) {
            return SplashViewModel(checkSessionUseCase, obtenerTipoUsuarioUseCase, context) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
