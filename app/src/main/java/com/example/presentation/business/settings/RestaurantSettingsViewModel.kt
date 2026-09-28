package com.example.presentation.business.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.data.repository.RestaurantSettingsRepository
import com.example.domain.engine.settings.RestaurantSettingsEngine
import com.example.domain.model.settings.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class SettingsCategory(val title: String, val iconName: String, val description: String) {
    RESTAURANT("Restaurante 🏬", "Storefront", "Nombre comercial, razón social, teléfono, WhatsApp, dirección física y categoría"),
    BRANCHES("Sucursales 📍", "Place", "Dirección física y teléfono operativo de sucursales"),
    SCHEDULE("Horarios 📅", "Schedule", "Horario de atención editable y estado de apertura en tiempo real")
}

data class RestaurantSettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val restaurantId: String = "",
    val settings: RestaurantSettings = RestaurantSettings(),
    val selectedCategory: SettingsCategory = SettingsCategory.RESTAURANT,
    val isSetupWizardOpen: Boolean = false,
    val setupWizardStep: Int = 1,
    val isDrawerEditorOpen: Boolean = false,
    val exportedJsonString: String? = null,
    val successMessage: String? = null,
    val errorMessage: String? = null
)

class RestaurantSettingsViewModel(
    repositorySupplier: (() -> RestaurantSettingsRepository)? = null
) : ViewModel() {

    private val repository by lazy { repositorySupplier?.invoke() ?: RestaurantSettingsRepository() }

    private val _uiState = MutableStateFlow(RestaurantSettingsUiState())
    val uiState: StateFlow<RestaurantSettingsUiState> = _uiState.asStateFlow()

    fun startSettingsCenter(restaurantId: String) {
        _uiState.update { it.copy(restaurantId = restaurantId, isLoading = true, errorMessage = null) }

        viewModelScope.launch {
            repository.getRestaurantSettingsStream(restaurantId)
                .catch { e ->
                    _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
                }
                .collect { settings ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            settings = settings
                        )
                    }
                }
        }
    }

    fun selectCategory(category: SettingsCategory) {
        _uiState.update { it.copy(selectedCategory = category, isDrawerEditorOpen = true) }
    }

    fun closeDrawerEditor() {
        _uiState.update { it.copy(isDrawerEditorOpen = false) }
    }

    fun openSetupWizard() {
        _uiState.update { it.copy(isSetupWizardOpen = true, setupWizardStep = 1) }
    }

    fun closeSetupWizard() {
        _uiState.update { it.copy(isSetupWizardOpen = false) }
    }

    fun nextWizardStep() {
        _uiState.update { state ->
            val next = (state.setupWizardStep + 1).coerceAtMost(8)
            state.copy(setupWizardStep = next)
        }
    }

    fun prevWizardStep() {
        _uiState.update { state ->
            val prev = (state.setupWizardStep - 1).coerceAtLeast(1)
            state.copy(setupWizardStep = prev)
        }
    }

    fun updateSettingsState(newSettings: RestaurantSettings) {
        _uiState.update { it.copy(settings = newSettings) }
    }

    fun saveSettings(updatedSettings: RestaurantSettings? = null) {
        val target = updatedSettings ?: _uiState.value.settings

        // Basic Validation
        if (target.commercialName.isBlank()) {
            _uiState.update { it.copy(errorMessage = "El nombre comercial no puede estar vacío.") }
            return
        }
        if (target.deliveryFee < 0.0) {
            _uiState.update { it.copy(errorMessage = "La tarifa de delivery no puede ser negativa.") }
            return
        }

        _uiState.update { it.copy(isSaving = true, errorMessage = null) }

        viewModelScope.launch {
            try {
                val incremented = RestaurantSettingsEngine.applyVersionIncrement(target)
                _uiState.update { it.copy(settings = incremented, isDrawerEditorOpen = false, isSaving = false, successMessage = "Configuración guardada exitosamente.") }

                repository.saveRestaurantSettings(incremented)
                AuditLogger.logEvent("RSC_SAVE_SETTINGS", mapOf("restaurantId" to target.restaurantId, "version" to incremented.version, "checksum" to incremented.checksumSha256))
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, errorMessage = "Error al guardar: ${e.localizedMessage}") }
            }
        }
    }

    fun clearFeedbackMessages() {
        _uiState.update { it.copy(errorMessage = null, successMessage = null) }
    }

    fun exportConfiguration() {
        val current = _uiState.value.settings
        val json = RestaurantSettingsEngine.exportToJsonString(current)
        _uiState.update { it.copy(exportedJsonString = json) }
    }

    fun closeExportDialog() {
        _uiState.update { it.copy(exportedJsonString = null) }
    }
}
