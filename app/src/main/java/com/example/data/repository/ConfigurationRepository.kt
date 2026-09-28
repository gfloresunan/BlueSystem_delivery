package com.example.data.repository

import android.util.Log
import com.example.domain.engine.update.AppUpdateResolver
import com.example.domain.model.AppUpdateConfig
import com.example.domain.model.SystemConfig
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ConfigurationRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _config = MutableStateFlow(SystemConfig())
    val config: StateFlow<SystemConfig> = _config.asStateFlow()

    private var appUpdateListener: ListenerRegistration? = null
    private var globalListener: ListenerRegistration? = null

    fun startListening() {
        if (appUpdateListener != null || globalListener != null) return

        // 1. GATE-001: Listener a la Proyección Pública Sanitizada (/system_config/app_update)
        // Accesible públicamente para usuarios invitados / anónimos / splash sin requerir auth
        appUpdateListener = firestore.collection("system_config")
            .document("app_update")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("ConfigurationRepo", "Notice: system_config/app_update listener notice: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    try {
                        val safeUpdate = AppUpdateResolver.parseSafe(snapshot.data)
                        if (safeUpdate != null) {
                            _config.value = _config.value.copy(appUpdate = safeUpdate)
                            Log.d("ConfigurationRepo", "Sanitized appUpdate projection updated: enabled=${safeUpdate.enabled}, latest=${safeUpdate.latestVersion}")
                        }
                    } catch (e: Exception) {
                        Log.e("ConfigurationRepo", "Fail-safe: Error parsing app_update projection, keeping previous state", e)
                    }
                }
            }

        // 2. Listener a la Configuración Maestra (/system_config/global)
        // Contiene parámetros operativos del sistema (requiere autenticación bajo reglas EIAM)
        globalListener = firestore.collection("system_config")
            .document("global")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // Esperado en sesiones no autenticadas (invitados) debido a reglas de seguridad
                    Log.d("ConfigurationRepo", "Global config listener restricted or not signed in yet: ${error.code}")
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    try {
                        val cfg = snapshot.toObject(SystemConfig::class.java) ?: SystemConfig()
                        // Preservar appUpdate de la proyección si ya existe y es más específico
                        val effectiveUpdate = cfg.appUpdate ?: _config.value.appUpdate
                        _config.value = cfg.copy(appUpdate = effectiveUpdate)
                        Log.d("ConfigurationRepo", "SystemConfig global updated: maintenance=${cfg.maintenanceMode}, minVer=${cfg.minimumVersion}")
                    } catch (e: Exception) {
                        Log.e("ConfigurationRepo", "Fail-safe: Error deserializing SystemConfig, falling back defensively", e)
                        val safeUpdate = AppUpdateResolver.parseSafe(snapshot.data?.get("appUpdate"))
                        if (safeUpdate != null) {
                            _config.value = _config.value.copy(appUpdate = safeUpdate)
                        }
                    }
                }
            }
    }

    fun stopListening() {
        appUpdateListener?.remove()
        appUpdateListener = null
        globalListener?.remove()
        globalListener = null
    }
}
