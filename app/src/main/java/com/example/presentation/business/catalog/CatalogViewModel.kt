package com.example.presentation.business.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.ProductRepository
import com.example.domain.model.CatalogSection
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CatalogViewModel(
    private val productRepository: ProductRepository = ProductRepository(),
    private val categoryRepository: com.example.data.repository.CategoryRepository = com.example.data.repository.CategoryRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogUiState())
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()

    val categories: StateFlow<List<com.example.domain.model.Category>> = categoryRepository.categories

    fun loadProducts(businessId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            productRepository.getProductsByBusiness(businessId)
                .catch { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = "No se pudo cargar el catálogo. Verifica tu conexión."
                        )
                    }
                }
                .collect { products ->
                    _uiState.update {
                        it.copy(
                            products = products,
                            isLoading = false,
                            sections = groupByCategory(products)
                        )
                    }
                }
        }
    }

    fun addProduct(product: Product, imageBytes: ByteArray?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            
            val result = productRepository.addProduct(product, imageBytes)
            
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        successMessage = "Producto agregado exitosamente",
                        showAddDialog = false
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        errorMessage = error.message ?: "Error al guardar"
                    )
                }
            }
        }
    }

    fun updateProduct(productId: String, updates: Map<String, Any>, imageBytes: ByteArray? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            
            val result = productRepository.updateProduct(productId, updates, imageBytes)
            
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        successMessage = "Producto actualizado",
                        editingProduct = null,
                        showAddDialog = false
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        errorMessage = error.message ?: "Error al actualizar"
                    )
                }
            }
        }
    }

    fun toggleProductStatus(productId: String, currentStatus: ProductStatus) {
        viewModelScope.launch {
            val result = productRepository.toggleProductStatus(productId, currentStatus)
            result.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Error al cambiar estado")
                }
            }
        }
    }

    fun deleteProduct(productId: String) {
        viewModelScope.launch {
            val result = productRepository.deleteProduct(productId)
            result.onFailure { error ->
                _uiState.update {
                    it.copy(errorMessage = error.message ?: "Error al eliminar")
                }
            }
        }
    }

    fun startListeningCategories(businessId: String? = null) {
        categoryRepository.startListening(businessId)
    }


    fun addCategory(name: String, icon: String = "📁", businessId: String = "") {
        viewModelScope.launch {
            val result = categoryRepository.addCategory(name, icon, businessId)
            result.onFailure { error ->
                _uiState.update { it.copy(errorMessage = error.message ?: "Error al agregar categoría") }
            }
        }
    }

    fun updateCategory(categoryId: String, newName: String, icon: String = "📁") {
        viewModelScope.launch {
            val result = categoryRepository.updateCategory(categoryId, newName, icon)
            result.onFailure { error ->
                _uiState.update { it.copy(errorMessage = error.message ?: "Error al actualizar categoría") }
            }
        }
    }

    fun deleteCategory(categoryId: String) {
        viewModelScope.launch {
            val result = categoryRepository.deleteCategory(categoryId)
            result.onFailure { error ->
                _uiState.update { it.copy(errorMessage = error.message ?: "Error al eliminar categoría") }
            }
        }
    }

    fun updateCategoryOrder(categoryIds: List<String>) {
        viewModelScope.launch {
            val result = categoryRepository.updateCategoryOrder(categoryIds)
            result.onFailure { error ->
                _uiState.update { it.copy(errorMessage = error.message ?: "Error al reordenar categorías") }
            }
        }
    }

    fun reorderProducts(productIds: List<String>) {
        viewModelScope.launch {
            productRepository.reorderProducts(productIds)
        }
    }


    fun onSearchQueryChange(query: String) {
        _uiState.update { 
            it.copy(
                searchQuery = query,
                filteredProducts = filterProducts(it.products, query)
            )
        }
    }

    fun showAddDialog() {
        _uiState.update { it.copy(showAddDialog = true, errorMessage = null) }
    }

    fun dismissAddDialog() {
        _uiState.update { it.copy(showAddDialog = false, editingProduct = null) }
    }

    fun editProduct(product: Product) {
        _uiState.update { it.copy(editingProduct = product, showAddDialog = true) }
    }

    fun dismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun dismissSuccess() {
        _uiState.update { it.copy(successMessage = null) }
    }

    private fun groupByCategory(products: List<Product>): List<CatalogSection> {
        return products
            .filter { it.status != ProductStatus.INACTIVE }
            .groupBy { it.category }
            .map { (category, items) ->
                CatalogSection(
                    category = category,
                    title = category.getDisplayName(),
                    products = items.sortedBy { it.order }
                )
            }
            .sortedBy { it.category.ordinal }
    }

    private fun filterProducts(products: List<Product>, query: String): List<Product> {
        if (query.isBlank()) return products
        return products.filter {
            it.name.contains(query, ignoreCase = true) ||
            it.description.contains(query, ignoreCase = true)
        }
    }
}

data class CatalogUiState(
    val products: List<Product> = emptyList(),
    val filteredProducts: List<Product> = emptyList(),
    val sections: List<CatalogSection> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val showAddDialog: Boolean = false,
    val editingProduct: Product? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

fun ProductCategory.getDisplayName(): String = when (this) {
    ProductCategory.MAIN_COURSE -> "Platos Principales"
    ProductCategory.APPETIZER -> "Entradas"
    ProductCategory.DESSERT -> "Postres"
    ProductCategory.BEVERAGE -> "Bebidas"
    ProductCategory.COMBO -> "Combos"
    ProductCategory.SPECIAL -> "Especiales"
    else -> "General"
}
