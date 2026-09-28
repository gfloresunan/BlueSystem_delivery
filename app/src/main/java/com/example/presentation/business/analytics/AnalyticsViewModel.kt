package com.example.presentation.business.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.AnalyticsRepository
import com.example.domain.model.BusinessAnalytics
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AnalyticsViewModel(
    private val analyticsRepository: AnalyticsRepository = AnalyticsRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnalyticsUiState())
    val uiState: StateFlow<AnalyticsUiState> = _uiState.asStateFlow()

    fun loadAnalytics(businessId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            analyticsRepository.getBusinessAnalytics(businessId)
                .collect { analytics ->
                    _uiState.update {
                        it.copy(
                            analytics = analytics,
                            isLoading = false,
                            hasData = analytics != null && analytics.todayOrders > 0
                        )
                    }
                }
        }
    }
}

data class AnalyticsUiState(
    val analytics: BusinessAnalytics? = null,
    val isLoading: Boolean = false,
    val hasData: Boolean = false,
    val selectedPeriod: TimePeriod = TimePeriod.TODAY
)

enum class TimePeriod {
    TODAY, WEEK, MONTH
}
