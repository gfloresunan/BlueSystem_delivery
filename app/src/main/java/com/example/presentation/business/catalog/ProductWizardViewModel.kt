package com.example.presentation.business.catalog

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.data.repository.ProductDraftRepository
import com.example.data.repository.ProductRepository
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.domain.model.catalog.ProductDraft
import com.example.domain.model.catalog.ProductWizardFeatureState
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuOption
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class ProductWizardUiState(
    val currentStep: Int = 1, // 1 a 6
    val isEditing: Boolean = false,
    val productId: String = "",
    val businessId: String = "",
    
    // Paso 1: Información
    val name: String = "",
    val shortDescription: String = "",
    val longDescription: String = "",
    val categoryId: String = "",
    val subCategoryId: String = "",
    val categoryName: String = "Platos Principales",
    val subCategoryName: String = "",
    val availableGlobalCategories: List<com.example.domain.model.Category> = emptyList(),
    val availableSubCategories: List<com.example.domain.model.Category> = emptyList(),
    val tagsText: String = "",
    val isPopular: Boolean = false,
    val isNew: Boolean = false,
    val isTopSeller: Boolean = false,
    val isRecommended: Boolean = false,
    val isVegetarian: Boolean = false,
    val isSpicy: Boolean = false,
    val spicyLevel: Int = 0,
    val cuisineType: String = "",
    val prepTimeMinutes: Int = 15,

    // Paso 2: Precios e Impuestos
    val priceText: String = "",
    val originalPriceText: String = "",
    val estimatedCostText: String = "",
    val taxPercentageText: String = "15",

    // Paso 3: Galería
    val photosList: List<String> = emptyList(), // Base64 o URLs
    val coverImageIndex: Int = 0,
    val isUploadingPhotos: Boolean = false,

    // Paso 4: Opciones y Extras (Persistencia Total)
    val optionGroups: List<MenuOptionGroup> = emptyList(),

    // Paso 5: Inventario
    val isAvailable: Boolean = true,
    val stockQuantityText: String = "",
    val minStockAlertText: String = "5",
    val autoHideOnZeroStock: Boolean = true,
    val selectedAvailabilityDays: List<Int> = listOf(1, 2, 3, 4, 5, 6, 7),

    // Paso 6: Preview & Opciones UI
    val previewDarkMode: Boolean = false,
    val isTabletPreview: Boolean = false,

    // Estado Operacional y Validaciones
    val featureFlags: ProductWizardFeatureState = ProductWizardFeatureState(),
    val validationErrors: List<String> = emptyList(),
    val priceError: String? = null,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val hasDraft: Boolean = false,
    val uploadProgressPercent: Int = 0,
    val uploadStatusMessage: String? = null,
    val uploadError: String? = null,
    val statusMessage: String? = null
)

class ProductWizardViewModel(
    private val productRepository: ProductRepository = ProductRepository(),
    private val categoryRepository: com.example.data.repository.CategoryRepository? = null,
    private val draftRepository: ProductDraftRepository? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductWizardUiState())
    val uiState: StateFlow<ProductWizardUiState> = _uiState.asStateFlow()

    private var autoSaveJob: Job? = null
    private var rawExistingProduct: Product? = null

    init {
        startAutoSaveTimer()
    }

    fun initWizard(existingProduct: Product?, businessId: String) {
        rawExistingProduct = existingProduct

        // Cargar Categorías Globales y Subcategorías del Comercio si Firebase está disponible
        val catRepo = categoryRepository ?: try { com.example.data.repository.CategoryRepository() } catch (e: Exception) { null }
        if (catRepo != null) {
            viewModelScope.launch {
                try {
                    catRepo.getProductCategoriesFlow().collect { cats ->
                        val fallbackList = if (cats.isEmpty()) {
                            listOf(
                                com.example.domain.model.Category(id = "cat_restaurantes", name = "Restaurantes", type = "PRODUCT"),
                                com.example.domain.model.Category(id = "cat_fritanga", name = "Fritanga NICA", type = "PRODUCT"),
                                com.example.domain.model.Category(id = "cat_platos", name = "Platos Principales", type = "PRODUCT"),
                                com.example.domain.model.Category(id = "cat_postres", name = "Bebidas y Postres", type = "PRODUCT"),
                                com.example.domain.model.Category(id = "cat_combos", name = "Combos y Promociones", type = "PRODUCT")
                            )
                        } else cats
                        _uiState.update { it.copy(availableGlobalCategories = fallbackList) }
                    }
                } catch (e: Exception) {
                    // Ignore Firebase exception in offline unit tests
                }
            }

            val effectiveBusinessId = businessId.ifBlank {
                com.example.eiam.domain.resolver.MerchantIdentityResolver.getCachedContext()?.businessId ?: ""
            }
            if (effectiveBusinessId.isNotBlank()) {
                viewModelScope.launch {
                    try {
                        catRepo.getMerchantSubCategoriesFlow(effectiveBusinessId).collect { subCats ->
                            Log.d("SUBCATEGORY_SOURCE_FORENSIC", """
                                [SUBCATEGORY_SOURCE_FORENSIC]
                                BUSINESS_ID   = $effectiveBusinessId
                                RESULT_COUNT  = ${subCats.size}
                                SOURCE        = Firestore
                            """.trimIndent())
                            _uiState.update { it.copy(availableSubCategories = subCats) }
                        }
                    } catch (e: Exception) {
                        // Ignore Firebase exception in offline unit tests
                    }
                }
            }
        }

        if (existingProduct != null) {
            _uiState.update {
                it.copy(
                    isEditing = true,
                    productId = existingProduct.id,
                    businessId = businessId,
                    name = existingProduct.name,
                    shortDescription = existingProduct.shortDescription.ifBlank { existingProduct.description },
                    longDescription = existingProduct.longDescription,
                    categoryId = existingProduct.categoryId,
                    subCategoryId = existingProduct.subCategoryId,
                    categoryName = existingProduct.categoryName.ifBlank { existingProduct.category.name },
                    subCategoryName = existingProduct.subCategoryName,
                    priceText = if (existingProduct.price > 0) String.format(java.util.Locale.US, "%.2f", existingProduct.price) else "",
                    originalPriceText = existingProduct.originalPrice?.let { p -> String.format(java.util.Locale.US, "%.2f", p) } ?: "",
                    estimatedCostText = existingProduct.estimatedCost?.let { c -> String.format(java.util.Locale.US, "%.2f", c) } ?: "",
                    taxPercentageText = if (existingProduct.taxPercentage > 0) String.format(java.util.Locale.US, "%.0f", existingProduct.taxPercentage) else "15",
                    prepTimeMinutes = existingProduct.preparationTimeMinutes,
                    isPopular = existingProduct.isPopular,
                    isNew = existingProduct.isNew,
                    isTopSeller = existingProduct.isTopSeller,
                    isRecommended = existingProduct.isRecommended,
                    isVegetarian = existingProduct.isVegetarian,
                    isSpicy = existingProduct.isSpicy || existingProduct.spicyLevel > 0,
                    spicyLevel = existingProduct.spicyLevel,
                    cuisineType = existingProduct.cuisineType,
                    tagsText = existingProduct.tags.joinToString(", "),
                    photosList = if (existingProduct.images.isNotEmpty()) existingProduct.images else listOfNotNull(existingProduct.imageUrl.ifBlank { null }),
                    optionGroups = existingProduct.optionGroups,
                    isAvailable = existingProduct.status != ProductStatus.OUT_OF_STOCK,
                    stockQuantityText = existingProduct.stockQuantity?.toString() ?: "",
                    minStockAlertText = existingProduct.minStockAlert?.toString() ?: "5",
                    autoHideOnZeroStock = existingProduct.autoHideOnZeroStock,
                    selectedAvailabilityDays = existingProduct.availabilityDays
                )
            }
        } else {
            _uiState.update { it.copy(businessId = businessId) }
            checkDraft()
        }
        validateStepRealtime()
    }

    // ─── NAVEGACIÓN Y AUTO-SAVE ───
    fun setStep(step: Int) {
        if (step in 1..6) {
            _uiState.update { it.copy(currentStep = step) }
            validateStepRealtime()
        }
    }

    fun nextStep() {
        if (_uiState.value.currentStep < 6) {
            setStep(_uiState.value.currentStep + 1)
        }
    }

    fun prevStep() {
        if (_uiState.value.currentStep > 1) {
            setStep(_uiState.value.currentStep - 1)
        }
    }

    private fun startAutoSaveTimer() {
        autoSaveJob?.cancel()
        autoSaveJob = viewModelScope.launch {
            while (true) {
                delay(15000L) // 15 segundos
                if (_uiState.value.name.isNotBlank() && _uiState.value.featureFlags.enableDraftRecovery) {
                    val currentProd = buildProductFromState()
                    draftRepository?.saveDraft(
                        ProductDraft(
                            step = _uiState.value.currentStep,
                            product = currentProd,
                            lastSavedAt = System.currentTimeMillis()
                        )
                    )
                }
            }
        }
    }

    private fun checkDraft() {
        val draft = draftRepository?.getDraft()
        if (draft != null && draft.product.name.isNotBlank()) {
            _uiState.update { it.copy(hasDraft = true) }
        }
    }

    fun restoreDraft() {
        val draft = draftRepository?.getDraft() ?: return
        initWizard(draft.product, draft.product.businessId)
        _uiState.update { it.copy(currentStep = draft.step, hasDraft = false, statusMessage = "Borrador restaurado con éxito") }
    }

    fun discardDraft() {
        draftRepository?.clearDraft()
        _uiState.update { it.copy(hasDraft = false) }
    }

    // ─── PASO 1: INFORMACIÓN ───
    fun updateName(v: String) { _uiState.update { it.copy(name = v) }; validateStepRealtime() }
    fun updateShortDescription(v: String) { _uiState.update { it.copy(shortDescription = v) } }
    fun updateLongDescription(v: String) { _uiState.update { it.copy(longDescription = v) } }
    fun updateCategoryName(v: String) { _uiState.update { it.copy(categoryName = v) }; validateStepRealtime() }
    fun updateSubCategoryName(v: String) { _uiState.update { it.copy(subCategoryName = v) } }
    fun selectCategory(cat: com.example.domain.model.Category) {
        _uiState.update { it.copy(categoryId = cat.id, categoryName = cat.name) }
        validateStepRealtime()
    }
    fun selectSubCategory(subCat: com.example.domain.model.Category) {
        _uiState.update { it.copy(subCategoryId = subCat.id, subCategoryName = subCat.name) }
    }
    fun updateTagsText(v: String) { _uiState.update { it.copy(tagsText = v) } }
    fun toggleIsPopular() { _uiState.update { it.copy(isPopular = !it.isPopular) } }
    fun toggleIsNew() { _uiState.update { it.copy(isNew = !it.isNew) } }
    fun toggleIsTopSeller() { _uiState.update { it.copy(isTopSeller = !it.isTopSeller) } }
    fun toggleIsRecommended() { _uiState.update { it.copy(isRecommended = !it.isRecommended) } }
    fun toggleIsVegetarian() { _uiState.update { it.copy(isVegetarian = !it.isVegetarian) } }
    fun toggleIsSpicy() { 
        _uiState.update { 
            val newSpicy = !it.isSpicy
            val newLevel = if (newSpicy && it.spicyLevel == 0) 1 else if (!newSpicy) 0 else it.spicyLevel
            it.copy(isSpicy = newSpicy, spicyLevel = newLevel)
        } 
    }
    fun setSpicyLevel(level: Int) { 
        _uiState.update { 
            it.copy(spicyLevel = level, isSpicy = level > 0) 
        } 
    }
    fun createMissingSubCategory(name: String, onComplete: (com.example.domain.model.Category?) -> Unit = {}) {
        val bId = _uiState.value.businessId.ifBlank {
            com.example.eiam.domain.resolver.MerchantIdentityResolver.getCachedContext()?.businessId ?: ""
        }
        if (bId.isBlank() || name.isBlank()) return
        viewModelScope.launch {
            try {
                val catRepo = categoryRepository ?: com.example.data.repository.CategoryRepository()
                val res = catRepo.addMerchantSubCategory(businessId = bId, name = name, description = "Creada desde asistente de producto", active = true)
                val createdCategory = res.getOrNull()
                if (createdCategory != null) {
                    selectSubCategory(createdCategory)
                    onComplete(createdCategory)
                } else {
                    onComplete(null)
                }
            } catch (e: Exception) {
                onComplete(null)
            }
        }
    }
    fun setPrepTime(time: Int) { _uiState.update { it.copy(prepTimeMinutes = time) } }

    // ─── PASO 2: PRECIOS ───
    fun updatePriceText(v: String) { _uiState.update { it.copy(priceText = v) }; validateStepRealtime() }
    fun updateOriginalPriceText(v: String) { _uiState.update { it.copy(originalPriceText = v) }; validateStepRealtime() }
    fun updateEstimatedCostText(v: String) { _uiState.update { it.copy(estimatedCostText = v) } }
    fun updateTaxPercentageText(v: String) { _uiState.update { it.copy(taxPercentageText = v) } }

    // ─── PASO 3: GALERÍA ───
    fun addPhoto(photoData: String) {
        _uiState.update { it.copy(photosList = it.photosList + photoData) }
    }
    fun removePhoto(index: Int) {
        _uiState.update {
            val list = it.photosList.toMutableList()
            if (index in list.indices) list.removeAt(index)
            it.copy(photosList = list, coverImageIndex = 0)
        }
    }
    fun setCoverImage(index: Int) {
        _uiState.update { it.copy(coverImageIndex = index) }
    }

    // ─── PASO 4: OPCIONES Y EXTRAS (PERSISTENCIA TOTAL) ───
    fun addOptionGroup(name: String, isRequired: Boolean, minSel: Int = 1, maxSel: Int = 1) {
        val newGroup = MenuOptionGroup(
            id = "og_${UUID.randomUUID().toString().take(8)}",
            name = name,
            isRequired = isRequired,
            minSelection = minSel,
            maxSelection = maxSel
        )
        _uiState.update { it.copy(optionGroups = it.optionGroups + newGroup) }
    }

    fun addOptionItem(groupId: String, optionName: String, extraPrice: Double) {
        val newItem = MenuOption(
            id = "opt_${UUID.randomUUID().toString().take(8)}",
            groupId = groupId,
            name = optionName,
            additionalPrice = extraPrice
        )
        _uiState.update { state ->
            val updatedGroups = state.optionGroups.map { g ->
                if (g.id == groupId) {
                    g.copy(options = g.options + newItem)
                } else g
            }
            state.copy(optionGroups = updatedGroups)
        }
    }

    fun removeOptionGroup(groupId: String) {
        _uiState.update { state -> state.copy(optionGroups = state.optionGroups.filter { it.id != groupId }) }
    }

    fun removeOptionItem(groupId: String, optionId: String) {
        _uiState.update { state ->
            val updated = state.optionGroups.map { group ->
                if (group.id == groupId) group.copy(options = group.options.filter { it.id != optionId }) else group
            }
            state.copy(optionGroups = updated)
        }
    }

    // ─── PASO 5: INVENTARIO ───
    fun updateIsAvailable(v: Boolean) { _uiState.update { it.copy(isAvailable = v) } }
    fun updateStockQuantityText(v: String) { _uiState.update { it.copy(stockQuantityText = v) }; validateStepRealtime() }
    fun updateMinStockAlertText(v: String) { _uiState.update { it.copy(minStockAlertText = v) } }
    fun toggleAutoHideOnZeroStock() { _uiState.update { it.copy(autoHideOnZeroStock = !it.autoHideOnZeroStock) } }

    // ─── PASO 6: PREVIEW TOGGLES ───
    fun togglePreviewDarkMode() { _uiState.update { it.copy(previewDarkMode = !it.previewDarkMode) } }

    // ─── VALIDACIONES EN TIEMPO REAL ───
    fun validateStepRealtime() {
        val state = _uiState.value
        val errors = mutableListOf<String>()
        var pError: String? = null

        if (state.name.isBlank()) errors.add("El nombre del producto es obligatorio")
        if (state.categoryName.isBlank() && state.categoryId.isBlank()) {
            _uiState.update { it.copy(categoryName = "General") }
        }

        val price = state.priceText.replace(',', '.').toDoubleOrNull()
        if (price == null || price <= 0.0) {
            errors.add("El precio debe ser un número mayor a cero")
        }

        val origPrice = state.originalPriceText.replace(',', '.').toDoubleOrNull()
        if (origPrice != null && price != null && origPrice < price) {
            pError = "El precio anterior no puede ser menor que el precio actual"
            errors.add(pError)
        }

        val stock = state.stockQuantityText.toIntOrNull()
        if (state.stockQuantityText.isNotBlank() && stock != null && stock < 0) {
            errors.add("El stock no puede ser negativo")
        }

        _uiState.update { it.copy(validationErrors = errors, priceError = pError) }
    }

    // ─── GUARDADO FINAL REFACTORIZADO (FASE 3) ───
    fun saveProduct(context: Context, onComplete: () -> Unit) {
        validateStepRealtime()
        val currentErrors = _uiState.value.validationErrors
        if (currentErrors.isNotEmpty()) {
            android.widget.Toast.makeText(context, "⚠️ ${currentErrors.first()}", android.widget.Toast.LENGTH_LONG).show()
            Log.w("ProductWizardVM", "Validación falló al intentar guardar: $currentErrors")
            return
        }

        _uiState.update {
            it.copy(
                isSaving = true,
                uploadError = null,
                statusMessage = "Iniciando guardado del producto..."
            )
        }

        viewModelScope.launch {
            val currentState = _uiState.value
            val productId = currentState.productId.ifBlank { "prod_${UUID.randomUUID().toString().take(8)}" }

            val authUser = try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser } catch (e: Exception) { null }
            Log.d("PRODUCT_STORAGE_DEBUG", """
                [PRODUCT_STORAGE_DEBUG]
                AUTH UID       = ${authUser?.uid ?: "NOT_LOGGED_IN"}
                BUSINESS ID    = ${currentState.businessId}
                COMERCIO ID    = ${currentState.businessId}
                RESTAURANT ID  = ${currentState.businessId}
                PRODUCT ID     = $productId
                STORAGE BUCKET = bluesystem-7c9af.firebasestorage.app
                STORAGE PATH   = media/products/${currentState.businessId}/$productId/original_1200.webp
            """.trimIndent())

            var finalImageUrl = ""
            var finalThumbnailUrl = ""
            var finalStoragePath = ""
            var finalMimeType = "image/webp"
            var finalWidth = 0
            var finalHeight = 0
            var finalSizeBytes = 0L
            var finalVariantsMap: Map<String, String> = emptyMap()
            val finalImagesList = mutableListOf<String>()

            // 1. Procesar Galería / Imagen de portada a través de Firebase Storage
            val primaryPhotoUri = currentState.photosList.getOrNull(currentState.coverImageIndex)
                ?: currentState.photosList.firstOrNull()

            if (!primaryPhotoUri.isNullOrBlank()) {
                if (primaryPhotoUri.startsWith("http://") || primaryPhotoUri.startsWith("https://")) {
                    // Imagen remota existente ya persistida en servidor (Firebase Storage / CDN)
                    finalImageUrl = primaryPhotoUri
                    finalThumbnailUrl = primaryPhotoUri
                    finalImagesList.add(primaryPhotoUri)
                    Log.d("IMAGE_FLOW_DEBUG", """
                        [IMAGE_FLOW_DEBUG]
                        EXISTING PRESERVED REMOTE IMAGE = $primaryPhotoUri
                        UPLOAD REQUIRED                 = FALSE
                    """.trimIndent())
                } else {
                    // Nueva foto de galería o archivo local -> Subir a Firebase Storage mediante MediaUploadEngine
                    _uiState.update {
                        it.copy(
                            isUploadingPhotos = true,
                            uploadStatusMessage = "Optimizando imagen del producto..."
                        )
                    }

                    try {
                        val localUri = android.net.Uri.parse(primaryPhotoUri)
                        Log.d("IMAGE_FLOW_DEBUG", """
                            [IMAGE_FLOW_DEBUG]
                            NEW LOCAL/GALLERY IMAGE = $primaryPhotoUri
                            UPLOAD PATH             = media/products/${currentState.businessId}/$productId/
                        """.trimIndent())

                        val uploadResult = productRepository.uploadProductImage(
                            context = context,
                            productId = productId,
                            localImageUri = localUri,
                            businessId = currentState.businessId
                        )

                        if (uploadResult.isSuccess) {
                            val res = uploadResult.getOrThrow()
                            finalImageUrl = res.imageUrl
                            finalThumbnailUrl = res.thumbnailUrl
                            finalStoragePath = res.storagePath
                            finalMimeType = res.mimeType
                            finalWidth = res.width
                            finalHeight = res.height
                            finalSizeBytes = res.sizeBytes
                            finalVariantsMap = res.imageVariants
                            finalImagesList.add(res.imageUrl)
                        } else {
                            val err = uploadResult.exceptionOrNull()
                            val errDetails = when {
                                err is com.google.firebase.storage.StorageException ->
                                    "Aviso Storage [Código ${(err as com.google.firebase.storage.StorageException).errorCode}]: ${err.localizedMessage}"
                                err != null && err.message?.contains("permission", ignoreCase = true) == true ->
                                    "Aviso Storage: Permiso denegado en Storage"
                                err != null ->
                                    "Aviso Storage [${err.javaClass.simpleName}]: ${err.message}"
                                else -> "Aviso: No fue posible subir la imagen"
                            }
                            Log.w("ProductWizardVM", "Subida de foto a Storage falló ($errDetails). Encolando para sincronización offline...")
                            AuditLogger.logEvent("STORAGE_UPLOAD_WARNING", mapOf("error" to errDetails))

                            try {
                                val productsDir = java.io.File(context.filesDir, "products").apply { mkdirs() }
                                val localTarget = java.io.File(productsDir, "${productId}_cover.webp")
                                context.contentResolver.openInputStream(localUri)?.use { input ->
                                    localTarget.outputStream().use { output -> input.copyTo(output) }
                                }
                                val persistentLocalUri = android.net.Uri.fromFile(localTarget).toString()
                                
                                // Directiva de Integridad: NUNCA guardar rutas locales en Firestore
                                // Si había una imagen remota previa en la lista, se mantiene; si es nuevo, queda "" hasta que suba la cola
                                val previousRemoteUrl = currentState.photosList.firstOrNull { it.startsWith("http://") || it.startsWith("https://") }.orEmpty()
                                finalImageUrl = previousRemoteUrl
                                finalThumbnailUrl = previousRemoteUrl

                                com.example.data.queue.ProductUploadQueueManager.enqueueUpload(
                                    product = buildProductFromState(
                                        productId = productId,
                                        imageUrl = finalImageUrl,
                                        thumbnailUrl = finalThumbnailUrl,
                                        storagePath = finalStoragePath,
                                        mimeType = finalMimeType,
                                        width = finalWidth,
                                        height = finalHeight,
                                        sizeBytes = finalSizeBytes,
                                        imageVariants = finalVariantsMap,
                                        images = if (finalImageUrl.isNotBlank()) listOf(finalImageUrl) else emptyList()
                                    ),
                                    localUriString = persistentLocalUri,
                                    isEdit = currentState.isEditing
                                )
                            } catch (copyEx: Exception) {
                                Log.e("ProductWizardVM", "Error guardando copia local de imagen para cola", copyEx)
                                val previousRemoteUrl = currentState.photosList.firstOrNull { it.startsWith("http://") || it.startsWith("https://") }.orEmpty()
                                finalImageUrl = previousRemoteUrl
                                finalThumbnailUrl = previousRemoteUrl
                            }
                        }
                    } catch (e: Exception) {
                        val catchDetails = "Fallo al acceder a URI [${e.javaClass.simpleName}]: ${e.localizedMessage ?: e.message}"
                        Log.w("ProductWizardVM", "$catchDetails. Omitiendo ruta local...")
                        val previousRemoteUrl = currentState.photosList.firstOrNull { it.startsWith("http://") || it.startsWith("https://") }.orEmpty()
                        finalImageUrl = previousRemoteUrl
                        finalThumbnailUrl = previousRemoteUrl
                    }
                }
            }

            _uiState.update {
                it.copy(
                    isUploadingPhotos = false,
                    uploadStatusMessage = "Guardando producto en Firestore..."
                )
            }

            // 2. Construir objeto Product libre de Base64 con URLs HTTPS, Metadata y Mapa Multi-Resolución
            val productToSave = buildProductFromState(
                productId = productId,
                imageUrl = finalImageUrl,
                thumbnailUrl = finalThumbnailUrl,
                storagePath = finalStoragePath,
                mimeType = finalMimeType,
                width = finalWidth,
                height = finalHeight,
                sizeBytes = finalSizeBytes,
                imageVariants = finalVariantsMap,
                images = if (finalImagesList.isNotEmpty()) finalImagesList else listOfNotNull(finalImageUrl.ifBlank { null })
            )

            // 3. Guardado final en Firestore
            val result = if (currentState.isEditing) {
                productRepository.updateProduct(
                    productToSave.id,
                    mapOf(
                        "name" to productToSave.name,
                        "description" to productToSave.description,
                        "shortDescription" to productToSave.shortDescription,
                        "longDescription" to productToSave.longDescription,
                        "subCategoryName" to productToSave.subCategoryName,
                        "price" to productToSave.price,
                        "originalPrice" to (productToSave.originalPrice ?: 0.0),
                        "estimatedCost" to (productToSave.estimatedCost ?: 0.0),
                        "taxPercentage" to productToSave.taxPercentage,
                        "categoryName" to productToSave.categoryName,
                        "categoryId" to productToSave.categoryId,
                        "subCategoryId" to productToSave.subCategoryId,
                        "imageUrl" to productToSave.imageUrl,
                        "thumbnailUrl" to productToSave.thumbnailUrl,
                        "storagePath" to productToSave.storagePath,
                        "mimeType" to productToSave.mimeType,
                        "width" to productToSave.width,
                        "height" to productToSave.height,
                        "sizeBytes" to productToSave.sizeBytes,
                        "images" to productToSave.images,
                        "preparationTimeMinutes" to productToSave.preparationTimeMinutes,
                        "isPopular" to productToSave.isPopular,
                        "isVegetarian" to productToSave.isVegetarian,
                        "isSpicy" to productToSave.isSpicy,
                        "isNew" to productToSave.isNew,
                        "isTopSeller" to productToSave.isTopSeller,
                        "isRecommended" to productToSave.isRecommended,
                        "spicyLevel" to productToSave.spicyLevel,
                        "cuisineType" to productToSave.cuisineType,
                        "tags" to productToSave.tags,
                        "optionGroups" to productToSave.optionGroups,
                        "stockQuantity" to (productToSave.stockQuantity ?: -1),
                        "minStockAlert" to (productToSave.minStockAlert ?: 5),
                        "autoHideOnZeroStock" to productToSave.autoHideOnZeroStock,
                        "status" to productToSave.status.name
                    )
                )
            } else {
                productRepository.addProduct(productToSave)
            }

            Log.d("PRODUCT_SAVE_FORENSIC", """
                [PRODUCT_SAVE_FORENSIC]
                ACTION                  = ${if (currentState.isEditing) "UPDATE" else "NEW"}
                PRODUCT_ID              = $productId
                BUSINESS_ID             = ${currentState.businessId}
                BUTTON_CLICKED          = TRUE
                VALIDATION              = PASSED
                UPLOAD_REQUIRED         = ${currentState.photosList.any { !it.startsWith("http") }}
                UPLOAD_RESULT           = ${if (currentState.uploadError == null) "SUCCESS" else "ERROR"}
                FIRESTORE_WRITE_STARTED = TRUE
                FIRESTORE_WRITE_RESULT  = PENDING
                FINAL_RESULT            = PENDING
            """.trimIndent())

            Log.d("PRODUCT_SAVE_DEBUG", """
                [PRODUCT_SAVE_DEBUG]
                ACTION          = ${if (currentState.isEditing) "UPDATE_PRODUCT" else "CREATE_PRODUCT"}
                PRODUCT_ID      = $productId
                BUSINESS_ID     = ${currentState.businessId}
                IS_NEW          = ${!currentState.isEditing}
                IS_EDIT         = ${currentState.isEditing}
                VALIDATION      = SUCCESS
                SAVE_STARTED    = TRUE
                FIRESTORE_WRITE = PENDING
                SAVE_RESULT     = STARTED
            """.trimIndent())

            Log.d("SPICY_DEBUG", """
                [SPICY_DEBUG]
                PRODUCT_ID       = $productId
                SELECTED_LEVEL   = ${productToSave.spicyLevel}
                STATE_UPDATED    = TRUE
                SAVE_VALUE       = ${productToSave.spicyLevel}
                IS_SPICY         = ${productToSave.isSpicy}
            """.trimIndent())

            Log.d("BADGE_DEBUG", """
                [BADGE_DEBUG]
                PRODUCT_ID  = $productId
                POPULAR     = ${productToSave.isPopular}
                NEW         = ${productToSave.isNew}
                TOP_SELLER  = ${productToSave.isTopSeller}
                RECOMMENDED = ${productToSave.isRecommended}
                VEGETARIAN  = ${productToSave.isVegetarian}
                SPICY       = ${productToSave.isSpicy}
            """.trimIndent())

            Log.d("SUBCATEGORY_DEBUG", """
                [SUBCATEGORY_DEBUG]
                BUSINESS_ID              = ${currentState.businessId}
                PRODUCT_ID               = $productId
                PRODUCT_SUBCATEGORY_ID   = ${productToSave.subCategoryId}
                PRODUCT_SUBCATEGORY_NAME = ${productToSave.subCategoryName}
            """.trimIndent())

            result.onSuccess {
                Log.d("PRODUCT_SAVE_FORENSIC", """
                    [PRODUCT_SAVE_FORENSIC]
                    ACTION                 = ${if (currentState.isEditing) "UPDATE" else "NEW"}
                    PRODUCT_ID             = $productId
                    FIRESTORE_WRITE_RESULT = SUCCESS
                    FINAL_RESULT           = SUCCESS
                """.trimIndent())
                Log.d("PRODUCT_SAVE_DEBUG", "[PRODUCT_SAVE_DEBUG] FIRESTORE_WRITE = SUCCESS, SAVE_RESULT = SUCCESS (ID=$productId)")
                draftRepository?.clearDraft()
                AuditLogger.logEvent(
                    "PRODUCT_WIZARD_SAVE_SUCCESS",
                    mapOf("product" to productToSave.name, "imageUrl" to productToSave.imageUrl)
                )
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        saveSuccess = true,
                        statusMessage = "¡Producto guardado exitosamente!",
                        uploadError = null
                    )
                }
                onComplete()
            }.onFailure { err ->
                Log.e("PRODUCT_SAVE_FORENSIC", """
                    [PRODUCT_SAVE_FORENSIC]
                    ACTION                 = ${if (currentState.isEditing) "UPDATE" else "NEW"}
                    PRODUCT_ID             = $productId
                    FIRESTORE_WRITE_RESULT = FAILED
                    FINAL_RESULT           = ERROR: ${err.message}
                """.trimIndent())
                Log.e("PRODUCT_SAVE_DEBUG", "[PRODUCT_SAVE_DEBUG] FIRESTORE_WRITE = FAILED, SAVE_RESULT = ERROR: ${err.message}")
                AuditLogger.logEvent("PRODUCT_WIZARD_SAVE_ERROR", mapOf("error" to (err.message ?: "Error en Firestore")))
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        uploadError = "No fue posible guardar el producto en Firestore.",
                        statusMessage = err.message
                    )
                }
            }
        }
    }

    private fun isLocalPath(path: String?): Boolean {
        if (path.isNullOrBlank()) return false
        val p = path.trim()
        return p.startsWith("file://") ||
                p.startsWith("/data/user/") ||
                p.startsWith("/data/data/") ||
                p.startsWith("/storage/emulated/") ||
                p.startsWith("content://")
    }

    private fun buildProductFromState(
        productId: String = _uiState.value.productId.ifBlank { UUID.randomUUID().toString() },
        imageUrl: String = _uiState.value.photosList.firstOrNull { it.startsWith("http") } ?: "",
        thumbnailUrl: String = _uiState.value.photosList.firstOrNull { it.startsWith("http") } ?: "",
        storagePath: String = "",
        mimeType: String = "image/webp",
        width: Int = 0,
        height: Int = 0,
        sizeBytes: Long = 0L,
        imageVariants: Map<String, String> = emptyMap(),
        images: List<String> = _uiState.value.photosList.filter { it.startsWith("http") }
    ): Product {
        val s = _uiState.value
        val price = s.priceText.replace(',', '.').toDoubleOrNull() ?: 0.0
        val origPrice = s.originalPriceText.replace(',', '.').toDoubleOrNull()
        val estCost = s.estimatedCostText.replace(',', '.').toDoubleOrNull()
        val tax = s.taxPercentageText.replace(',', '.').toDoubleOrNull() ?: 15.0
        val stock = s.stockQuantityText.toIntOrNull()
        val minStock = s.minStockAlertText.toIntOrNull()

        val base = rawExistingProduct ?: Product()
        val safeBaseImg = base.imageUrl.takeIf { !isLocalPath(it) }.orEmpty()
        val safeBaseThumb = base.thumbnailUrl.takeIf { !isLocalPath(it) }.orEmpty()
        val safeBaseImages = base.images.filter { !isLocalPath(it) }

        return base.copy(
            id = productId,
            businessId = s.businessId.ifBlank { base.businessId },
            name = s.name,
            description = s.shortDescription.ifBlank { s.longDescription },
            shortDescription = s.shortDescription,
            longDescription = s.longDescription,
            categoryId = s.categoryId,
            subCategoryId = s.subCategoryId,
            categoryName = s.categoryName,
            subCategoryName = s.subCategoryName,
            price = price,
            originalPrice = if (origPrice != null && origPrice > price) origPrice else null,
            estimatedCost = estCost,
            taxPercentage = tax,
            imageUrl = imageUrl.takeIf { !isLocalPath(it) }?.ifBlank { safeBaseImg } ?: safeBaseImg,
            thumbnailUrl = thumbnailUrl.takeIf { !isLocalPath(it) }?.ifBlank { safeBaseThumb } ?: safeBaseThumb,
            storagePath = storagePath.ifBlank { base.storagePath },
            mimeType = if (mimeType != "image/webp") mimeType else base.mimeType,
            width = if (width > 0) width else base.width,
            height = if (height > 0) height else base.height,
            sizeBytes = if (sizeBytes > 0) sizeBytes else base.sizeBytes,
            imageVariants = if (imageVariants.isNotEmpty()) imageVariants else base.imageVariants,
            images = if (images.isNotEmpty()) images.filter { !isLocalPath(it) } else safeBaseImages,
            preparationTimeMinutes = s.prepTimeMinutes,
            isPopular = s.isPopular,
            isNew = s.isNew,
            isTopSeller = s.isTopSeller,
            isRecommended = s.isRecommended,
            isVegetarian = s.isVegetarian,
            isSpicy = s.isSpicy || s.spicyLevel > 0,
            spicyLevel = s.spicyLevel,
            cuisineType = s.cuisineType,
            tags = s.tagsText.split(",").map { it.trim() }.filter { it.isNotBlank() },
            optionGroups = s.optionGroups,
            stockQuantity = stock,
            minStockAlert = minStock,
            autoHideOnZeroStock = s.autoHideOnZeroStock,
            status = if (s.isAvailable && (stock == null || stock > 0)) ProductStatus.ACTIVE else ProductStatus.OUT_OF_STOCK
        )
    }

    private fun buildProductFromState(): Product {
        val s = _uiState.value
        val productId = s.productId.ifBlank { "prod_${UUID.randomUUID().toString().take(8)}" }
        val primaryPhoto = s.photosList.getOrNull(s.coverImageIndex) ?: s.photosList.firstOrNull() ?: ""
        return buildProductFromState(
            productId = productId,
            imageUrl = primaryPhoto,
            thumbnailUrl = primaryPhoto,
            storagePath = "",
            mimeType = "image/webp",
            width = 0,
            height = 0,
            sizeBytes = 0L,
            images = s.photosList
        )
    }
}
