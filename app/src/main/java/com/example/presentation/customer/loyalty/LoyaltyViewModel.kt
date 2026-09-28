package com.example.presentation.customer.loyalty

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.LoyaltyRepository
import com.example.domain.model.loyalty.*
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed interface RedeemUiState {
    object Idle : RedeemUiState
    object Loading : RedeemUiState
    data class Success(val result: RedeemRewardResult) : RedeemUiState
    data class Error(val errorMessage: String) : RedeemUiState
}

/**
 * BlueSystem Delivery Enterprise — Loyalty ViewModel v1.0
 * Pure reactive state management for Customer Loyalty & Tier progression.
 */
class LoyaltyViewModel(
    private val repository: LoyaltyRepository = LoyaltyRepository(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) : ViewModel() {

    private val currentUserId: String
        get() = auth.currentUser?.uid ?: ""

    val isUserLoggedIn: Boolean
        get() = auth.currentUser != null

    // ── Resumen Global en Tiempo Real ──────────────────────────────────────────
    val globalSummary: StateFlow<LoyaltyGlobalSummary> = repository
        .observeGlobalSummary(currentUserId)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = LoyaltyGlobalSummary(customerId = currentUserId)
        )

    // ── Saldos Comerciales del Cliente ─────────────────────────────────────────
    val merchantBalances: StateFlow<List<MerchantLoyaltyBalance>> = repository
        .observeMerchantBalances(currentUserId)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // ── Ledger Inmutable de Transacciones ─────────────────────────────────────
    val transactions: StateFlow<List<LoyaltyTransactionItem>> = repository
        .observeTransactions(currentUserId)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // ── Catálogo de Recompensas Activas ───────────────────────────────────────
    val activeRewards: StateFlow<List<LoyaltyReward>> = repository
        .observeActiveRewards()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // ── Niveles del Programa de Fidelidad ─────────────────────────────────────
    val levels: StateFlow<List<LoyaltyLevel>> = repository
        .observeLevels()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // ── Cálculo Reactivo del Nivel Actual y Siguiente (basado en lifetimePointsEarned) ──
    val tierProgression = combine(globalSummary, levels) { summary, lvlList ->
        calculateTierProgression(summary.lifetimePointsEarned, lvlList)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = TierProgressionResult()
    )

    // ── Cálculo Reactivo del Próximo Premio Desbloqueable ──────────────────────
    val nextRewardProgression = combine(globalSummary, activeRewards) { summary, rewardList ->
        val currentPoints = summary.globalPointsBalance
        val sortedUnearned = rewardList.filter { it.pointsCost > currentPoints }.sortedBy { it.pointsCost }
        val next = sortedUnearned.firstOrNull() ?: rewardList.sortedByDescending { it.pointsCost }.firstOrNull()

        if (next != null) {
            val needed = Math.max(0, next.pointsCost - currentPoints)
            val progress = if (next.pointsCost > 0) (currentPoints.toFloat() / next.pointsCost.toFloat()).coerceIn(0f, 1f) else 1f
            NextRewardInfo(nextReward = next, pointsRemaining = needed, progress = progress)
        } else {
            NextRewardInfo(nextReward = null, pointsRemaining = 0, progress = 1f)
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = NextRewardInfo()
    )

    // ── Estado de Canje de Premios ────────────────────────────────────────────
    private val _redeemState = MutableStateFlow<RedeemUiState>(RedeemUiState.Idle)
    val redeemState: StateFlow<RedeemUiState> = _redeemState.asStateFlow()

    fun redeemReward(reward: LoyaltyReward) {
        if (!isUserLoggedIn) {
            _redeemState.value = RedeemUiState.Error("Debes iniciar sesión para canjear recompensas.")
            return
        }

        viewModelScope.launch {
            _redeemState.value = RedeemUiState.Loading
            val result = repository.redeemReward(reward.id)
            result.fold(
                onSuccess = { res ->
                    _redeemState.value = RedeemUiState.Success(res)
                },
                onFailure = { error ->
                    val userFriendlyMsg = when {
                        error.message?.contains("Puntos insuficientes", ignoreCase = true) == true ->
                            error.message ?: "Puntos insuficientes para este premio."
                        error.message?.contains("límite", ignoreCase = true) == true ->
                            "Has alcanzado el límite de canjes permitidos."
                        else -> "No pudimos procesar tu canje. Intenta de nuevo."
                    }
                    _redeemState.value = RedeemUiState.Error(userFriendlyMsg)
                }
            )
        }
    }

    fun resetRedeemState() {
        _redeemState.value = RedeemUiState.Idle
    }

    companion object {
        fun calculateTierProgression(lifetimeEarned: Int, levelsList: List<LoyaltyLevel>): TierProgressionResult {
            if (levelsList.isEmpty()) {
                val defaultLvl = LoyaltyLevel("bronce", "Bronce", "Nivel inicial", 0, 499, listOf("Acumula 10 pts por pedido"), "🥉", 1)
                return TierProgressionResult(currentLevel = defaultLvl, nextLevel = null, pointsRemaining = 0, progress = 1f)
            }

            val sorted = levelsList.filter { it.active }.sortedBy { it.sortOrder }
            var current: LoyaltyLevel = sorted[0]
            var next: LoyaltyLevel? = if (sorted.size > 1) sorted[1] else null

            for (i in sorted.indices) {
                val lvl = sorted[i]
                if (lifetimeEarned >= lvl.minPoints && (lvl.maxPoints <= 0 || lifetimeEarned <= lvl.maxPoints)) {
                    current = lvl
                    next = if (i + 1 < sorted.size) sorted[i + 1] else null
                    break
                }
            }

            // Si supera todos los rangos
            if (lifetimeEarned >= sorted.last().minPoints) {
                current = sorted.last()
                next = null
            }

            val pointsRemaining = next?.let { Math.max(0, it.minPoints - lifetimeEarned) } ?: 0
            val progress = next?.let {
                val span = (it.minPoints - current.minPoints).toFloat()
                if (span > 0) ((lifetimeEarned - current.minPoints).toFloat() / span).coerceIn(0f, 1f) else 1f
            } ?: 1f

            return TierProgressionResult(
                currentLevel = current,
                nextLevel = next,
                pointsRemaining = pointsRemaining,
                progress = progress
            )
        }
    }
}

data class TierProgressionResult(
    val currentLevel: LoyaltyLevel = LoyaltyLevel(),
    val nextLevel: LoyaltyLevel? = null,
    val pointsRemaining: Int = 0,
    val progress: Float = 0f
)

data class NextRewardInfo(
    val nextReward: LoyaltyReward? = null,
    val pointsRemaining: Int = 0,
    val progress: Float = 0f
)
