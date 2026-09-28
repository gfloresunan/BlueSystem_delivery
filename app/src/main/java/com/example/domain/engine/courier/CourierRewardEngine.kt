package com.example.domain.engine.courier

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class MissionChallenge(
    val id: String,
    val title: String,
    val description: String,
    val requiredOrderCount: Int,
    val currentOrderCount: Int = 0,
    val bonusRewardAmount: Double,
    val isCompleted: Boolean = false
)

data class CourierRewardState(
    val currentStreakCount: Int = 0,
    val totalBonusEarnedThisWeek: Double = 0.0,
    val activeMissions: List<MissionChallenge> = emptyList(),
    val weeklyRankPosition: Int = 1
)

/**
 * Motor de recompensas, misiones y gamificación (CourierRewardEngine).
 */
class CourierRewardEngine {

    private val _rewardState = MutableStateFlow(CourierRewardState())
    val rewardState: StateFlow<CourierRewardState> = _rewardState.asStateFlow()

    fun recordCompletedOrder() {
        _rewardState.update { state ->
            val newStreak = state.currentStreakCount + 1
            val updatedMissions = state.activeMissions.map { mission ->
                val newProgress = mission.currentOrderCount + 1
                val completed = newProgress >= mission.requiredOrderCount
                mission.copy(currentOrderCount = newProgress, isCompleted = completed)
            }
            state.copy(
                currentStreakCount = newStreak,
                activeMissions = updatedMissions
            )
        }
    }

    fun resetStreak() {
        _rewardState.update { it.copy(currentStreakCount = 0) }
    }

    fun setMissions(missions: List<MissionChallenge>) {
        _rewardState.update { it.copy(activeMissions = missions) }
    }
}
