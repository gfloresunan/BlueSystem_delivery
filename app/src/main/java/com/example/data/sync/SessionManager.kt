package com.example.data.sync

import android.util.Log
import com.example.data.auth.PermissionManager
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class SessionMode {
    STARTING,
    GUEST,
    AUTHENTICATED,
    LOGGING_OUT
}

object SessionManager {
    private val _sessionMode = MutableStateFlow(SessionMode.STARTING)
    val sessionMode: StateFlow<SessionMode> = _sessionMode.asStateFlow()

    val currentMode: SessionMode get() = _sessionMode.value

    var currentSessionId: String = java.util.UUID.randomUUID().toString()
        private set

    fun renewSessionId(): String {
        currentSessionId = java.util.UUID.randomUUID().toString()
        try {
            Log.d("SESSION_MANAGER", "Nuevo SessionId generado: $currentSessionId")
        } catch (e: Throwable) { }
        return currentSessionId
    }

    private var authStateListener: FirebaseAuth.AuthStateListener? = null

    init {
        setupAuthStateListener()
    }

    private fun setupAuthStateListener() {
        try {
            if (authStateListener != null) return
            authStateListener = FirebaseAuth.AuthStateListener { auth ->
                val user = auth.currentUser
                if (user == null && _sessionMode.value == SessionMode.AUTHENTICATED) {
                    try {
                        Log.w("SESSION_MANAGER", "FirebaseAuth emitio usuario null mientras estaba en AUTHENTICATED. Transicionando a GUEST de forma automatica.")
                    } catch (e: Throwable) { }
                    setGuestMode()
                }
            }
            FirebaseAuth.getInstance().addAuthStateListener(authStateListener!!)
        } catch (e: Throwable) {
            // Captura defensiva para ejecución en entorno de unit tests JVM
        }
    }

    fun setGuestMode() {
        renewSessionId()
        try {
            Log.d("SESSION_MANAGER", "SessionMode cambiado a GUEST | SessionId: $currentSessionId")
        } catch (e: Throwable) { }
        _sessionMode.value = SessionMode.GUEST
        try {
            PermissionManager.setGuestPermissions()
        } catch (e: Throwable) { }
    }

    fun setAuthenticatedMode(uid: String) {
        if (_sessionMode.value != SessionMode.AUTHENTICATED) {
            renewSessionId()
        }
        try {
            Log.d("SESSION_MANAGER", "SessionMode cambiado a AUTHENTICATED | UID: $uid | SessionId: $currentSessionId")
        } catch (e: Throwable) { }
        _sessionMode.value = SessionMode.AUTHENTICATED
    }

    fun setLoggingOut() {
        try {
            Log.d("SESSION_MANAGER", "SessionMode cambiado a LOGGING_OUT | SessionId: $currentSessionId")
        } catch (e: Throwable) { }
        _sessionMode.value = SessionMode.LOGGING_OUT
        try {
            PermissionManager.clearPermissions()
        } catch (e: Throwable) { }
    }

    fun isAuthenticated(): Boolean {
        return try {
            _sessionMode.value == SessionMode.AUTHENTICATED && FirebaseAuth.getInstance().currentUser != null
        } catch (e: Throwable) {
            _sessionMode.value == SessionMode.AUTHENTICATED
        }
    }

    fun isGuest(): Boolean {
        return _sessionMode.value == SessionMode.GUEST
    }
}
