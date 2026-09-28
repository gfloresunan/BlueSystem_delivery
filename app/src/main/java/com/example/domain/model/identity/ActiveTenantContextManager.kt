package com.example.domain.model.identity

import androidx.annotation.Keep
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Gestor de Estado Thread-Safe para Contexto Activo de Tenant en Android.
 * 
 * 🔒 REGLAS DE SEGURIDAD:
 * 1. Anti-Spoofing: callerUid debe coincidir con el UID de la membresía resuelta.
 * 2. Fail-Closed: Membresías suspendidas, ambiguas o pendientes de migración no producen contexto activo.
 * 3. Aislamiento: No existe estado global mutable compartido entre peticiones concurrentes.
 * 4. Zero Auth Mutation: En modo seguro de simulación (AuthSafetyGate LOCKED).
 */
@Keep
class ActiveTenantContextManager {

    private val _state = MutableStateFlow<TenantContextState>(TenantContextState.Uninitialized)
    val state: StateFlow<TenantContextState> = _state.asStateFlow()

    private val mutex = Mutex()

    /**
     * Solicita el cambio seguro de contexto de Tenant a partir de targetMembershipId.
     */
    suspend fun switchContext(
        callerUid: String,
        targetMembershipId: String,
        resolver: DualReadMembershipResolver,
        settingsProvider: (suspend (String) -> TenantSettings?)? = null
    ): Result<ActiveTenantContext> = mutex.withLock {
        if (callerUid.isBlank()) {
            val err = "Usuario no autenticado (callerUid inválido)."
            _state.value = TenantContextState.Error("UNAUTHENTICATED", err)
            return Result.failure(IllegalArgumentException(err))
        }

        if (targetMembershipId.isBlank()) {
            val err = "targetMembershipId no puede estar vacío."
            _state.value = TenantContextState.Error("INVALID_ARGUMENT", err)
            return Result.failure(IllegalArgumentException(err))
        }

        _state.value = TenantContextState.Loading

        val resolution = resolver.resolveByMembershipId(callerUid, targetMembershipId)

        return when (resolution.status) {
            DualReadStatus.RESOLVED_V3,
            DualReadStatus.RESOLVED_LEGACY -> {
                val membership = resolution.membership
                if (membership == null) {
                    val err = "Fallo interno: Membresía nula a pesar de estado ${resolution.status}."
                    _state.value = TenantContextState.Error("INTERNAL_ERROR", err)
                    Result.failure(IllegalStateException(err))
                } else if (membership.uid != callerUid) {
                    val err = "Violación de Seguridad: La membresía no pertenece al usuario autenticado."
                    _state.value = TenantContextState.Error("SECURITY_MISMATCH", err)
                    Result.failure(SecurityException(err))
                } else {
                    val contextResult = ActiveContextDeriver.deriveFromMembership(membership)
                    if (!contextResult.success || contextResult.context == null) {
                        val err = contextResult.errorDetail ?: "Fallo al derivar ActiveTenantContext."
                        _state.value = TenantContextState.Error("DERIVATION_FAILED", err)
                        Result.failure(IllegalStateException(err))
                    } else {
                        val activeContext = contextResult.context
                        val settings = settingsProvider?.invoke(activeContext.tenantId)

                        _state.value = TenantContextState.Active(
                            context = activeContext,
                            settings = settings,
                            source = resolution.status.name
                        )
                        Result.success(activeContext)
                    }
                }
            }

            DualReadStatus.NOT_FOUND -> {
                val err = "Membresía '$targetMembershipId' no encontrada."
                _state.value = TenantContextState.Error("NOT_FOUND", err)
                Result.failure(NoSuchElementException(err))
            }

            DualReadStatus.SECURITY_MISMATCH -> {
                val err = "Violación de Seguridad: Intento de acceso a membresía de otro UID."
                _state.value = TenantContextState.Error("SECURITY_MISMATCH", err)
                Result.failure(SecurityException(err))
            }

            DualReadStatus.NEVER_RESOLVE -> {
                val err = "Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado."
                _state.value = TenantContextState.Error("NEVER_RESOLVE", err)
                Result.failure(SecurityException(err))
            }

            DualReadStatus.MIGRATION_PENDING -> {
                val err = "La membresía se encuentra pendiente de migración a Multi-Tenant."
                _state.value = TenantContextState.Error("MIGRATION_PENDING", err)
                Result.failure(IllegalStateException(err))
            }

            DualReadStatus.AMBIGUOUS -> {
                val err = "La membresía presenta conflicto o ambigüedad de titularidad."
                _state.value = TenantContextState.Error("AMBIGUOUS", err)
                Result.failure(IllegalStateException(err))
            }

            DualReadStatus.INVALID -> {
                val err = "Membresía inválida o con esquema corrupto."
                _state.value = TenantContextState.Error("INVALID", err)
                Result.failure(IllegalStateException(err))
            }
        }
    }

    /**
     * Retorna el contexto activo actual si está en estado Active, o null en cualquier otro caso.
     */
    fun currentContext(): ActiveTenantContext? {
        val s = _state.value
        return if (s is TenantContextState.Active) s.context else null
    }

    /**
     * Retorna el tenantId del contexto activo actual, o null si no hay contexto activo.
     */
    fun currentTenantId(): String? {
        return currentContext()?.tenantId
    }

    /**
     * Limpia completamente el contexto activo al cerrar sesión.
     */
    fun clearOnLogout() {
        _state.value = TenantContextState.LoggedOut
    }

    /**
     * Indica si existe un contexto activo EIAM v3 cargado.
     */
    fun isEiamV3Active(): Boolean {
        return _state.value is TenantContextState.Active
    }
}
