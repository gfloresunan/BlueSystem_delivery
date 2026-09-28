package com.example.presentation.business.promotions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.PromotionRepository
import com.example.domain.model.Promotion
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

sealed interface PromotionUiState {
    object Loading : PromotionUiState
    data class Success(val promotions: List<Promotion>) : PromotionUiState
    data class Error(val message: String) : PromotionUiState
}

class PromotionViewModel(
    private val repository: PromotionRepository = PromotionRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<PromotionUiState>(PromotionUiState.Loading)
    val uiState: StateFlow<PromotionUiState> = _uiState.asStateFlow()

    private val _promotions = MutableStateFlow<List<Promotion>>(emptyList())
    val promotions: StateFlow<List<Promotion>> = _promotions.asStateFlow()

    fun loadPromotions(businessId: String) {
        viewModelScope.launch {
            _uiState.value = PromotionUiState.Loading
            repository.getPromotionsFlow(businessId)
                .catch { e ->
                    _uiState.value = PromotionUiState.Error(e.message ?: "Error al cargar promociones")
                }
                .collect { list ->
                    _promotions.value = list
                    _uiState.value = PromotionUiState.Success(list)
                }
        }
    }

    fun savePromotion(
        id: String,
        businessId: String,
        title: String,
        description: String,
        discountPercentage: Double,
        couponCode: String,
        minOrderAmount: Double,
        active: Boolean,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            val promo = Promotion(
                id = id,
                businessId = businessId,
                title = title,
                description = description,
                discountPercentage = discountPercentage,
                couponCode = couponCode,
                minOrderAmount = minOrderAmount,
                active = active,
                priority = 1
            )

            val result = repository.addPromotion(promo)
            if (result.isSuccess) {
                onSuccess()
            } else {
                onError(result.exceptionOrNull()?.message ?: "Error al guardar promoción")
            }
        }
    }

    fun togglePromotionActive(promotionId: String, currentActive: Boolean, onError: (String) -> Unit = {}) {
        viewModelScope.launch {
            val result = repository.togglePromotionActive(promotionId, currentActive)
            if (result.isFailure) {
                onError(result.exceptionOrNull()?.message ?: "Error al cambiar estado de promoción")
            }
        }
    }

    fun deletePromotion(promotionId: String, onSuccess: () -> Unit = {}, onError: (String) -> Unit = {}) {
        viewModelScope.launch {
            val result = repository.deletePromotion(promotionId)
            if (result.isSuccess) {
                onSuccess()
            } else {
                onError(result.exceptionOrNull()?.message ?: "Error al eliminar promoción")
            }
        }
    }
}
