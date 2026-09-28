package com.example.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.AuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(private val authManager: AuthManager) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authManager.iniciarSesion(email, password)
            result.fold(
                onSuccess = { user ->
                    val userInfo = authManager.obtenerDatosUsuario(user.uid)
                    val userType = userInfo.userType
                    val role = userInfo.role
                    
                    val authUser = AuthUser(
                        email = user.email ?: email,
                        userType = userType,
                        role = role,
                        rol = role
                    )
                    _uiState.value = AuthUiState.Success(authUser)
                    com.example.AnalyticsHelper.logLogin("email")

                    // Register FCM token asynchronously in background thread
                    viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                        try {
                            com.example.data.FcmManager.registerCurrentDeviceToken(userType)
                        } catch (e: Exception) {
                            android.util.Log.w("AuthViewModel", "FCM Token registration error", e)
                        }
                    }
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Error al iniciar sesión")
                }
            )
        }
    }

    val currentUser: com.google.firebase.auth.FirebaseUser?
        get() = authManager.currentUser

    fun register(email: String, password: String, name: String, phone: String, userType: String = "customer") {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val finalUserType = "customer"
            val result = authManager.registrarUsuario(email, password, name, phone, finalUserType)
            result.fold(
                onSuccess = { user ->
                    // Register FCM token
                    viewModelScope.launch {
                        com.example.data.FcmManager.registerCurrentDeviceToken(finalUserType)
                    }
                    
                    com.example.AnalyticsHelper.logSignUp("email")

                    val authUser = AuthUser(
                        email = email,
                        userType = finalUserType,
                        role = finalUserType,
                        rol = finalUserType
                    )
                    _uiState.value = AuthUiState.Success(authUser)
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Error al registrar usuario")
                }
            )
        }
    }

    fun sendPasswordReset(email: String, onResult: (Boolean, String?) -> Unit) {
        android.util.Log.d("AUTH_DEBUG", "AuthViewModel: Iniciando sendPasswordReset para $email")
        viewModelScope.launch {
            val result = authManager.enviarCorreoRecuperacion(email)
            result.fold(
                onSuccess = {
                    android.util.Log.d("AUTH_DEBUG", "AuthViewModel: 🟢 Recuperación exitosa para $email. Notificando UI con SUCCESS.")
                    onResult(true, "Si existe una cuenta asociada a este correo, recibirás las instrucciones para restablecer tu contraseña. Revisa también tu bandeja de entrada y Spam.")
                },
                onFailure = { error ->
                    android.util.Log.e("AUTH_DEBUG", "AuthViewModel: 🔴 Error en recuperación para $email: ${error.message}", error)
                    onResult(false, error.localizedMessage ?: "No fue posible procesar la solicitud en este momento. Inténtalo nuevamente más tarde.")
                }
            )
        }
    }

    fun sendEmailVerification(onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            val result = authManager.enviarVerificacionCorreo()
            result.fold(
                onSuccess = {
                    onResult(true, "Correo de verificación enviado. Revisa tu bandeja de entrada.")
                },
                onFailure = { error ->
                    onResult(false, error.localizedMessage ?: "Error al enviar verificación de correo.")
                }
            )
        }
    }

    fun reloadUser(onResult: (Boolean, Boolean) -> Unit) {
        viewModelScope.launch {
            val result = authManager.recargarEstadoUsuario()
            result.fold(
                onSuccess = { user ->
                    val isVerified = user?.isEmailVerified == true
                    onResult(true, isVerified)
                },
                onFailure = {
                    onResult(false, false)
                }
            )
        }
    }

    fun changePassword(
        currentPass: String,
        newPass: String,
        onResult: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            val result = authManager.cambiarContrasena(currentPass, newPass)
            result.fold(
                onSuccess = {
                    onResult(true, "Contraseña actualizada exitosamente.")
                },
                onFailure = { error ->
                    onResult(false, error.localizedMessage ?: "Error al cambiar la contraseña.")
                }
            )
        }
    }

    fun loginWithCredential(credential: com.google.firebase.auth.AuthCredential) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authManager.iniciarSesionConCredencial(credential)
            result.fold(
                onSuccess = { user ->
                    val userType = authManager.obtenerTipoUsuario(user.uid) ?: "customer"
                    val role = authManager.obtenerRole(user.uid) ?: ""
                    
                    viewModelScope.launch {
                        com.example.data.FcmManager.registerCurrentDeviceToken(userType)
                    }
                    
                    com.example.AnalyticsHelper.logLogin("social")

                    val authUser = AuthUser(
                        email = user.email ?: "",
                        userType = userType,
                        role = role,
                        rol = role
                    )
                    _uiState.value = AuthUiState.Success(authUser)
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Error al iniciar sesión con redes sociales")
                }
            )
        }
    }

    fun loginWithGoogleToken(idToken: String) {
        val credential = com.google.firebase.auth.GoogleAuthProvider.getCredential(idToken, null)
        loginWithCredential(credential)
    }

    fun loginWithFacebookToken(accessToken: String) {
        val credential = com.google.firebase.auth.FacebookAuthProvider.getCredential(accessToken)
        loginWithCredential(credential)
    }

    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }
}

@Suppress("UNCHECKED_CAST")
class AuthViewModelFactory(private val authManager: AuthManager) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            return AuthViewModel(authManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
