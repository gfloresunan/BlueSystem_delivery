package com.example

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.BusinessInfo
import com.example.data.repository.toBusinessInfoSafely
import com.example.data.repository.ProductRepository
import com.example.domain.model.Product
import com.example.eiam.domain.model.Branch
import com.example.eiam.domain.model.AccountStatus
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class ComercioUiState(
    val isLoading: Boolean = true,
    val isError: Boolean = false,
    val businessInfo: BusinessInfo? = null,
    val products: List<Product> = emptyList(),
    val combos: List<com.example.domain.model.menu.MenuCombo> = emptyList(),
    val branches: List<Branch> = emptyList(),
    val selectedBranch: Branch? = null,
    val promotions: List<BannerPromocional> = emptyList(),
    val reviews: List<CommerceReview> = emptyList(),
    val selectedCategory: String = "TODOS",
    val activeQuickTab: String = "MENU", // "MENU" | "DISCOUNTS" | "TOP_SELLING" | "PRICE_LOW"
    val deliveryMode: String = "DELIVERY", // "DELIVERY" | "PICKUP"
    val searchQuery: String = "",
    val isFavorite: Boolean = false,
    val favoriteProductIds: Set<String> = emptySet(),
    val announcement: CommerceAnnouncement? = null,
    val showReviewsDialog: Boolean = false,
    val showBranchSelectorDialog: Boolean = false,
    val submittingReview: Boolean = false
)

class ComercioDetalleViewModel(
    private val repository: ProductRepository = ProductRepository(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : ViewModel() {

    private val comboRepository by lazy { com.example.data.repository.menu.MenuComboRepositoryImpl(firestore) }

    private val _uiState = MutableStateFlow(ComercioUiState())
    val uiState: StateFlow<ComercioUiState> = _uiState.asStateFlow()

    private var currentBusinessId: String = ""
    private var businessListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var favoriteListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var announcementListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var cachedAnnouncements: List<CommerceAnnouncement> = emptyList()
    private var authStateListener: FirebaseAuth.AuthStateListener? = null

    init {
        authStateListener = FirebaseAuth.AuthStateListener { fa ->
            val uid = fa.currentUser?.uid
            if (uid != null && currentBusinessId.isNotBlank()) {
                loadFavoriteStatus(currentBusinessId, uid)
            }
        }
        FirebaseAuth.getInstance().addAuthStateListener(authStateListener!!)
    }

    fun loadCommerce(businessId: String) {
        if (businessId.isBlank()) return
        currentBusinessId = businessId

        val altBizId = if (businessId.startsWith("biz_")) businessId.removePrefix("biz_").trim() else "biz_${businessId.trim()}"

        businessListener?.remove()
        // Escuchar documento de comercio en tiempo real desde /businesses con parseo resiliente anti-crash
        businessListener = firestore.collection("businesses").document(businessId)
            .addSnapshotListener { doc, err ->
                if (err != null || doc == null || !doc.exists()) {
                    firestore.collection("businesses").document(altBizId).get()
                        .addOnSuccessListener { altDoc ->
                            if (altDoc != null && altDoc.exists()) {
                                val info = parseBusinessDoc(altDoc)
                                _uiState.update { it.copy(businessInfo = info) }
                            } else {
                                // Fallback a colección /users si no existe en /businesses
                                firestore.collection("users").document(businessId).get()
                                    .addOnSuccessListener { userDoc ->
                                        if (userDoc != null && userDoc.exists()) {
                                            val info = parseBusinessDoc(userDoc)
                                            _uiState.update { it.copy(businessInfo = info) }
                                        } else {
                                            firestore.collection("users").document(altBizId).get()
                                                .addOnSuccessListener { altUserDoc ->
                                                    if (altUserDoc != null && altUserDoc.exists()) {
                                                        val info = parseBusinessDoc(altUserDoc)
                                                        _uiState.update { it.copy(businessInfo = info) }
                                                    }
                                                }
                                        }
                                    }
                            }
                        }
                    return@addSnapshotListener
                }

                val info = parseBusinessDoc(doc)
                _uiState.update { it.copy(businessInfo = info) }
            }

        loadFavoriteStatus(businessId)
        loadProducts(businessId)
        loadCombos(businessId)
        loadBranches(businessId)
        loadPromotions(businessId)
        loadReviews(businessId)
        loadAnnouncement(businessId)
    }

    private fun loadFavoriteStatus(businessId: String, targetUid: String? = null) {
        val uid = targetUid ?: FirebaseAuth.getInstance().currentUser?.uid ?: return
        favoriteListener?.remove()
        favoriteListener = firestore.collection("users").document(uid)
            .collection("favorites")
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    Log.w("FAVORITE_SYNC", "Error escuchando estado de favoritos: ${err.message}")
                    return@addSnapshotListener
                }
                if (snap != null) {
                    var isBizFav = false
                    val favProds = mutableSetOf<String>()
                    for (doc in snap.documents) {
                        val type = doc.getString("type") ?: ""
                        val docId = doc.id
                        if (type.equals("product", ignoreCase = true) || docId.startsWith("prod_") || doc.contains("productId")) {
                            val rawPId = doc.getString("productId") ?: doc.getString("targetId") ?: docId.removePrefix("prod_")
                            val cleanPId = rawPId.trim().removePrefix("prod_")
                            if (cleanPId.isNotBlank()) {
                                favProds.add(cleanPId)
                                favProds.add(rawPId.trim())
                                favProds.add("prod_$cleanPId")
                                favProds.add(docId)
                            }
                        } else {
                            val bId = (doc.getString("businessId") ?: doc.getString("targetId") ?: docId.removePrefix("biz_")).trim()
                            if (bId == businessId || docId == businessId || docId == "biz_$businessId") {
                                isBizFav = true
                            }
                        }
                    }
                    _uiState.update { it.copy(isFavorite = isBizFav, favoriteProductIds = favProds) }
                }
            }
    }

    private fun parseBusinessDoc(doc: com.google.firebase.firestore.DocumentSnapshot): BusinessInfo {
        return try {
            val safe = doc.toBusinessInfoSafely()
            val obj = safe ?: doc.toObject(BusinessInfo::class.java)?.copy(id = doc.id) ?: parseBusinessDocManual(doc)
            val locMap = doc.get("location") as? Map<String, Any>
            val coordMap = doc.get("coordenadas") as? Map<String, Any>
            val rawLat = (doc.getDouble("latitude") ?: (locMap?.get("latitude") as? Number)?.toDouble() ?: (locMap?.get("_latitude") as? Number)?.toDouble() ?: doc.getDouble("lat")) ?: 0.0
            val rawLng = (doc.getDouble("longitude") ?: (locMap?.get("longitude") as? Number)?.toDouble() ?: (locMap?.get("_longitude") as? Number)?.toDouble() ?: doc.getDouble("lng")) ?: 0.0

            if (obj.latitude == 0.0 && rawLat != 0.0) {
                obj.copy(
                    latitude = rawLat,
                    longitude = rawLng,
                    lat = rawLat,
                    lng = rawLng,
                    location = locMap ?: obj.location,
                    coordenadas = coordMap ?: obj.coordenadas
                )
            } else {
                obj.copy(
                    location = locMap ?: obj.location,
                    coordenadas = coordMap ?: obj.coordenadas
                )
            }
        } catch (e: Exception) {
            Log.w("ComercioDetalleVM", "Error des-serializando BusinessInfo en ${doc.id}, ejecutando parseo manual resiliente: ${e.message}")
            doc.toBusinessInfoSafely() ?: parseBusinessDocManual(doc)
        }
    }

    private fun parseBusinessDocManual(doc: com.google.firebase.firestore.DocumentSnapshot): BusinessInfo {
        val name = doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("comercioNombre") ?: ""
        val category = doc.getString("category") ?: doc.getString("categoria") ?: "Restaurante"
        val address = doc.getString("address") ?: doc.getString("direccion") ?: "Managua, Nicaragua"
        val logoUrl = doc.getString("logoUrl") ?: doc.getString("photoUrl") ?: doc.getString("avatarUrl") ?: ""
        val bannerUrl = doc.getString("bannerUrl") ?: doc.getString("coverUrl") ?: doc.getString("portadaUrl") ?: ""
        val phone = doc.getString("phone") ?: doc.getString("telefono") ?: ""
        val description = doc.getString("description") ?: doc.getString("descripcion") ?: ""

        val deliveryFee = getDoubleVal(doc, "deliveryFee", "costoEnvio") ?: 45.0
        val minOrder = getDoubleVal(doc, "minOrder", "minimumOrder", "ordenMinima") ?: 100.0
        val rating = getDoubleVal(doc, "rating", "ratingAverage") ?: 4.8
        val ratingCount = getIntVal(doc, "ratingCount", "reviewsCount") ?: 18
        val deliveryTime = doc.getString("deliveryTime") ?: doc.getString("tiempoEntrega") ?: "20-35 min"

        val active = getBoolVal(doc, "active", "isActive") ?: true
        val isOpen = getBoolVal(doc, "isOpen", "abierto") ?: true
        val verified = getBoolVal(doc, "isVerified", "verified") ?: true

        val municipalityName = doc.getString("municipalityName") ?: doc.getString("municipalityId") ?: doc.getString("city") ?: ""
        val departmentName = doc.getString("departmentName") ?: doc.getString("departmentId") ?: ""
        val city = doc.getString("city") ?: municipalityName
        val municipalityId = doc.getString("municipalityId") ?: ""
        val departmentId = doc.getString("departmentId") ?: ""

        val locMap = doc.get("location") as? Map<String, Any>
        val coordMap = doc.get("coordenadas") as? Map<String, Any>
        val locLat = (locMap?.get("latitude") as? Number)?.toDouble() ?: (locMap?.get("_latitude") as? Number)?.toDouble()
        val locLng = (locMap?.get("longitude") as? Number)?.toDouble() ?: (locMap?.get("_longitude") as? Number)?.toDouble()
        val latitude = getDoubleVal(doc, "latitude", "lat") ?: locLat ?: 0.0
        val longitude = getDoubleVal(doc, "longitude", "lng") ?: locLng ?: 0.0

        val schedule = runCatching { doc.getString("schedule") ?: doc.getString("horario") }.getOrNull() ?: ""
        @Suppress("UNCHECKED_CAST")
        val scheduleMap = (doc.get("schedule") as? Map<String, Any>)
            ?: (doc.get("weeklySchedule") as? Map<String, Any>)
            ?: (doc.get("horario") as? Map<String, Any>)

        return BusinessInfo(
            id = doc.id,
            name = name,
            category = category,
            address = address,
            logoUrl = logoUrl,
            bannerUrl = bannerUrl,
            phone = phone,
            description = description,
            deliveryFee = deliveryFee,
            costoEnvio = deliveryFee,
            minOrder = minOrder,
            minimumOrder = minOrder,
            ordenMinima = minOrder,
            rating = rating,
            ratingAverage = rating,
            ratingCount = ratingCount,
            reviewsCount = ratingCount,
            deliveryTime = deliveryTime,
            tiempoEntrega = deliveryTime,
            active = active,
            isActive = active,
            isOpen = isOpen,
            abierto = isOpen,
            isVerified = verified,
            verified = verified,
            municipalityName = municipalityName,
            municipalityId = municipalityId,
            departmentName = departmentName,
            departmentId = departmentId,
            city = city,
            latitude = latitude,
            longitude = longitude,
            lat = latitude,
            lng = longitude,
            location = locMap,
            coordenadas = coordMap,
            schedule = schedule,
            scheduleMap = scheduleMap,
            weeklySchedule = scheduleMap
        )
    }

    private fun getDoubleVal(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Double? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Number -> return valAny.toDouble()
                is String -> valAny.toDoubleOrNull()?.let { return it }
            }
        }
        return null
    }

    private fun getIntVal(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Int? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Number -> return valAny.toInt()
                is String -> valAny.toIntOrNull()?.let { return it }
            }
        }
        return null
    }

    private fun getBoolVal(doc: com.google.firebase.firestore.DocumentSnapshot, vararg fieldNames: String): Boolean? {
        for (f in fieldNames) {
            val valAny = doc.get(f) ?: continue
            when (valAny) {
                is Boolean -> return valAny
                is String -> return valAny.lowercase() == "true" || valAny == "1"
                is Number -> return valAny.toInt() == 1
            }
        }
        return null
    }

    fun loadProducts(businessId: String) {
        viewModelScope.launch {
            repository.getActiveProducts(businessId)
                .onStart { _uiState.update { it.copy(isLoading = true, isError = false) } }
                .catch { _uiState.update { it.copy(isLoading = false, isError = true) } }
                .collect { products ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isError = false,
                            products = products
                        )
                    }
                }
        }
    }

    fun loadCombos(businessId: String) {
        viewModelScope.launch {
            comboRepository.getCombosFlow(businessId)
                .catch { e -> Log.w("ComercioDetalleVM", "Error loading combos: ${e.message}") }
                .collect { combosList ->
                    _uiState.update { it.copy(combos = combosList.filter { c -> c.status == com.example.domain.model.menu.MenuComboStatus.ACTIVE }) }
                }
        }
    }

    private fun loadBranches(businessId: String) {
        firestore.collection("branches")
            .whereEqualTo("businessId", businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val bizInfo = _uiState.value.businessInfo
                val list = snapshot.documents.mapNotNull { doc ->
                    val branchObj = try {
                        doc.toObject(Branch::class.java)?.copy(branchId = doc.id)
                    } catch (e: Exception) {
                        Log.w("ComercioDetalleVM", "Error des-serializando sucursal ${doc.id}, ejecutando parseo manual resiliente: ${e.message}")
                        parseBranchManual(doc)
                    }
                    if (branchObj != null) {
                        val locMap = doc.get("location") as? Map<*, *>
                        val coordMap = doc.get("coordenadas") as? Map<*, *>
                        val docLat = (doc.getDouble("latitude") ?: (locMap?.get("latitude") as? Number)?.toDouble() ?: (locMap?.get("_latitude") as? Number)?.toDouble() ?: doc.getDouble("lat")) ?: 0.0
                        val docLng = (doc.getDouble("longitude") ?: (locMap?.get("longitude") as? Number)?.toDouble() ?: (locMap?.get("_longitude") as? Number)?.toDouble() ?: doc.getDouble("lng")) ?: 0.0

                        var resolved = branchObj
                        if (resolved.latitude == 0.0 && docLat != 0.0) {
                            resolved = resolved.copy(latitude = docLat, longitude = docLng, lat = docLat, lng = docLng)
                        }
                        // Fallback de herencia: si la sucursal no tiene coordenadas, heredar de businessInfo
                        if (!resolved.hasValidCoordinates() && bizInfo != null && bizInfo.hasValidLocation()) {
                            val bLat = bizInfo.getEffectiveLatitude()
                            val bLng = bizInfo.getEffectiveLongitude()
                            resolved = resolved.copy(latitude = bLat, longitude = bLng, lat = bLat, lng = bLng)
                        }
                        // Fallback de herencia de horario: si la sucursal no tiene horario propio, heredar de businessInfo
                        if (resolved.weeklySchedule.isEmpty() && bizInfo != null) {
                            val parentSched = bizInfo.scheduleMap ?: bizInfo.weeklySchedule
                            if (parentSched != null && parentSched.isNotEmpty()) {
                                resolved = resolved.copy(weeklySchedule = parentSched)
                            }
                        }
                        resolved
                    } else null
                }
                _uiState.update { state ->
                    val primaryBranch = list.firstOrNull { it.isPrimary } ?: list.firstOrNull()
                    state.copy(
                        branches = list,
                        selectedBranch = state.selectedBranch ?: primaryBranch
                    )
                }
            }
    }

    private fun parseBranchManual(doc: com.google.firebase.firestore.DocumentSnapshot): Branch {
        val name = doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("branchName") ?: "Sucursal Principal"
        val address = doc.getString("address") ?: doc.getString("direccion") ?: "Managua, Nicaragua"
        val phone = doc.getString("phone") ?: doc.getString("telefono") ?: ""
        val isPrimary = getBoolVal(doc, "isPrimary", "primary", "esPrincipal") ?: false
        val isOpen = getBoolVal(doc, "isOpen", "abierto", "open") ?: true
        val locMap = doc.get("location") as? Map<String, Any>
        val coordMap = doc.get("coordenadas") as? Map<String, Any>
        val locLat = (locMap?.get("latitude") as? Number)?.toDouble() ?: (locMap?.get("_latitude") as? Number)?.toDouble()
        val locLng = (locMap?.get("longitude") as? Number)?.toDouble() ?: (locMap?.get("_longitude") as? Number)?.toDouble()
        val lat = getDoubleVal(doc, "latitude", "lat", "latitud") ?: locLat ?: 12.136389
        val lng = getDoubleVal(doc, "longitude", "lng", "longitud") ?: locLng ?: -86.251389
        val deliveryFee = getDoubleVal(doc, "deliveryFee", "costoEnvio") ?: 45.0
        val prepTime = getIntVal(doc, "prepTimeMinutes", "tiempoEntrega") ?: 20

        @Suppress("UNCHECKED_CAST")
        val weeklySchedule = (doc.get("weeklySchedule") as? Map<String, Any>)
            ?: (doc.get("schedule") as? Map<String, Any>)
            ?: (doc.get("horario") as? Map<String, Any>)
            ?: emptyMap()

        val rawStatus = doc.getString("status")
        val parsedStatus = AccountStatus.fromString(rawStatus, defaultStatus = AccountStatus.ACTIVE)

        return Branch(
            branchId = doc.id,
            businessId = doc.getString("businessId") ?: currentBusinessId,
            name = name,
            address = address,
            phone = phone,
            isPrimary = isPrimary,
            isOpen = isOpen,
            latitude = lat,
            longitude = lng,
            lat = lat,
            lng = lng,
            location = locMap,
            coordenadas = coordMap,
            deliveryFee = deliveryFee,
            prepTimeMinutes = prepTime,
            weeklySchedule = weeklySchedule,
            status = parsedStatus
        )
    }

    private fun loadPromotions(businessId: String) {
        firestore.collection("promotions")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        val active = doc.getBoolean("active") ?: doc.getBoolean("isActive") ?: true
                        val docBiz = doc.getString("businessId") ?: ""
                        if (!active) return@mapNotNull null
                        if (docBiz.isNotBlank() && docBiz != businessId) return@mapNotNull null

                        doc.toObject(BannerPromocional::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        null
                    }
                }
                _uiState.update { it.copy(promotions = list) }
            }
    }

    private fun loadReviews(businessId: String) {
        if (businessId.isBlank()) return
        firestore.collection("businesses").document(businessId)
            .collection("reviews")
            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(CommerceReview::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        null
                    }
                }
                _uiState.update { it.copy(reviews = list) }
            }
    }

    fun selectBranch(branch: Branch) {
        val resolved = resolveActiveAnnouncement(cachedAnnouncements, branch.branchId)
        _uiState.update { it.copy(selectedBranch = branch, announcement = resolved) }
    }

    fun selectCategory(category: String) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun setActiveQuickTab(tab: String) {
        _uiState.update { it.copy(activeQuickTab = tab) }
    }

    fun setDeliveryMode(mode: String) {
        _uiState.update { it.copy(deliveryMode = mode) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun toggleFavorite() {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val bizId = currentBusinessId.ifBlank { return }
        val isCurrentlyFav = _uiState.value.isFavorite
        val bizName = _uiState.value.businessInfo?.getEffectiveName() ?: ""

        // Actualización optimista de UI
        _uiState.update { it.copy(isFavorite = !isCurrentlyFav) }

        viewModelScope.launch {
            try {
                val ref = firestore.collection("users").document(uid)
                    .collection("favorites").document(bizId)
                if (isCurrentlyFav) {
                    ref.delete().await()
                    try { firestore.collection("users").document(uid).collection("favorites").document("biz_$bizId").delete().await() } catch (_: Exception) {}
                    Log.d("FAVORITE_SYNC", "Comercio $bizId eliminado de favoritos para usuario $uid")
                } else {
                    val data = hashMapOf<String, Any>(
                        "type" to "business",
                        "businessId" to bizId,
                        "targetId" to bizId,
                        "addedAt" to com.google.firebase.Timestamp.now()
                    )
                    if (bizName.isNotBlank()) data["name"] = bizName
                    ref.set(data).await()
                    Log.d("FAVORITE_SYNC", "Comercio $bizId agregado a favoritos para usuario $uid")
                }
            } catch (e: Exception) {
                Log.e("FAVORITE_SYNC", "Error actualizando favorito en Firestore", e)
                // Revertir en caso de fallo
                _uiState.update { it.copy(isFavorite = isCurrentlyFav) }
            }
        }
    }

    fun toggleProductFavorite(product: Product) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
        val pId = product.id.ifBlank { return }
        val cleanId = pId.removePrefix("prod_")
        val docKey = "prod_$cleanId"
        val isCurrentlyFav = _uiState.value.favoriteProductIds.contains(cleanId) ||
                _uiState.value.favoriteProductIds.contains(pId) ||
                _uiState.value.favoriteProductIds.contains(docKey) ||
                _uiState.value.favoriteProductIds.contains("prod_$pId")

        val newFavs = if (isCurrentlyFav) {
            _uiState.value.favoriteProductIds - cleanId - pId - docKey - "prod_$pId"
        } else {
            _uiState.value.favoriteProductIds + cleanId + pId + docKey
        }
        _uiState.update { it.copy(favoriteProductIds = newFavs) }

        viewModelScope.launch {
            try {
                val ref = firestore.collection("users").document(uid).collection("favorites").document(docKey)
                if (isCurrentlyFav) {
                    docRefDeleteSafe(ref, uid, pId, cleanId)
                    Log.d("FAVORITE_SYNC", "Producto $cleanId eliminado de favoritos para usuario $uid")
                } else {
                    val bizName = _uiState.value.businessInfo?.getEffectiveName() ?: ""
                    val img = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
                    val data = hashMapOf<String, Any>(
                        "type" to "product",
                        "productId" to cleanId,
                        "targetId" to cleanId,
                        "businessId" to (product.businessId.ifBlank { currentBusinessId }),
                        "businessName" to bizName,
                        "name" to product.name,
                        "price" to product.price,
                        "imageUrl" to img,
                        "category" to product.categoryName.ifBlank { product.category.name },
                        "addedAt" to com.google.firebase.Timestamp.now()
                    )
                    ref.set(data).await()
                    Log.d("FAVORITE_SYNC", "Producto $cleanId agregado a favoritos para usuario $uid")
                }
            } catch (e: Exception) {
                Log.e("FAVORITE_SYNC", "Error actualizando favorito de producto en Firestore", e)
                _uiState.update { it.copy(favoriteProductIds = if (isCurrentlyFav) it.favoriteProductIds + cleanId + pId else it.favoriteProductIds - cleanId - pId) }
            }
        }
    }

    private suspend fun docRefDeleteSafe(ref: com.google.firebase.firestore.DocumentReference, uid: String, pId: String, cleanId: String) {
        ref.delete().await()
        try { firestore.collection("users").document(uid).collection("favorites").document(pId).delete().await() } catch (_: Exception) {}
        try { firestore.collection("users").document(uid).collection("favorites").document("prod_prod_$cleanId").delete().await() } catch (_: Exception) {}
    }

    fun setShowReviewsDialog(show: Boolean) {
        _uiState.update { it.copy(showReviewsDialog = show) }
    }

    fun setShowBranchSelectorDialog(show: Boolean) {
        _uiState.update { it.copy(showBranchSelectorDialog = show) }
    }

    fun submitReview(rating: Double, comment: String, onFinished: (Boolean) -> Unit) {
        if (currentBusinessId.isBlank() || comment.isBlank()) {
            onFinished(false)
            return
        }
        _uiState.update { it.copy(submittingReview = true) }

        viewModelScope.launch {
            try {
                val currentUser = FirebaseAuth.getInstance().currentUser
                val uid = currentUser?.uid ?: ""
                val name = currentUser?.displayName
                    ?: currentUser?.email?.substringBefore("@")
                    ?: "Cliente BlueSystem"
                val photo = currentUser?.photoUrl?.toString() ?: ""

                val reviewId = "rev_" + System.currentTimeMillis() + "_" + (1000..9999).random()

                val newReview = CommerceReview(
                    id = reviewId,
                    businessId = currentBusinessId,
                    branchId = _uiState.value.selectedBranch?.branchId ?: "",
                    uid = uid,
                    userName = name,
                    authorName = name,
                    userPhotoUrl = photo,
                    rating = rating,
                    comment = comment,
                    date = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date()),
                    createdAt = com.google.firebase.Timestamp.now()
                )

                // 1. Guardar en subcolección /businesses/{id}/reviews y esperar confirmación explícita de Firestore
                firestore.collection("businesses").document(currentBusinessId)
                    .collection("reviews")
                    .document(reviewId)
                    .set(newReview)
                    .await()

                // 2. Guardar opcionalmente en colección raíz /reviews para redundancia
                try {
                    firestore.collection("reviews")
                        .document(reviewId)
                        .set(newReview)
                        .await()
                } catch (e: Exception) {
                    Log.w("REVIEW_E2E", "Subcolección guardada OK, aviso en raíz /reviews: ${e.message}")
                }

                Log.d("REVIEW_E2E", "Reseña confirmada en Firestore: id=$reviewId, businessId=$currentBusinessId")

                // 3. SOLO TRAS CONFIRMACIÓN REAL DE FIRESTORE: Actualizar UI y marcar éxito
                _uiState.update { state ->
                    val updatedList = listOf(newReview) + state.reviews.filter { it.id != newReview.id }
                    state.copy(submittingReview = false, reviews = updatedList)
                }
                onFinished(true)
            } catch (e: Exception) {
                Log.e("REVIEW_E2E", "Error confirmando persistencia de reseña en Firestore", e)
                _uiState.update { it.copy(submittingReview = false) }
                onFinished(false)
            }
        }
    }

    // ─── BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001 ───────────────────────
    private fun loadAnnouncement(businessId: String) {
        announcementListener?.remove()
        announcementListener = firestore.collection("businesses").document(businessId)
            .collection("announcements")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("ComercioDetalleVM", "Error cargando anuncios de $businessId: ${error.message}")
                    _uiState.update { it.copy(announcement = null) }
                    return@addSnapshotListener
                }

                if (snapshot == null || snapshot.isEmpty) {
                    _uiState.update { it.copy(announcement = null) }
                    return@addSnapshotListener
                }

                val allAnnouncements = snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(CommerceAnnouncement::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        Log.w("ComercioDetalleVM", "Error parseando anuncio ${doc.id}: ${e.message}")
                        null
                    }
                }

                cachedAnnouncements = allAnnouncements
                val selectedBranchId = _uiState.value.selectedBranch?.branchId
                val resolvedAnnouncement = resolveActiveAnnouncement(allAnnouncements, selectedBranchId)
                _uiState.update { it.copy(announcement = resolvedAnnouncement) }
            }
    }

    private fun resolveActiveAnnouncement(
        announcements: List<CommerceAnnouncement>,
        selectedBranchId: String?
    ): CommerceAnnouncement? {
        val valid = announcements.filter { it.isCurrentlyValid() }
        if (valid.isEmpty()) return null

        // 1. Prioridad: Anuncio específico para la sucursal activa
        if (!selectedBranchId.isNullOrBlank()) {
            val branchSpecific = valid
                .filter { it.branchId.isNotBlank() && it.branchId == selectedBranchId }
                .sortedWith(compareBy<CommerceAnnouncement> { it.displayOrder }.thenByDescending { it.id })
                .firstOrNull()
            if (branchSpecific != null) return branchSpecific
        }

        // 2. Fallback: Anuncio global del comercio (branchId vacío o "ALL")
        return valid
            .filter { it.branchId.isBlank() || it.branchId.equals("ALL", ignoreCase = true) }
            .sortedWith(compareBy<CommerceAnnouncement> { it.displayOrder }.thenByDescending { it.id })
            .firstOrNull()
    }

    override fun onCleared() {
        super.onCleared()
        authStateListener?.let { FirebaseAuth.getInstance().removeAuthStateListener(it) }
        businessListener?.remove()
        favoriteListener?.remove()
        announcementListener?.remove()
    }
}
