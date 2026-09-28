package com.example.presentation.customer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.CartManager
import com.example.data.CartItem
import com.example.toAddressSafely
import com.example.toAppUserSafely
import com.example.toPedidoSafely
import com.example.data.repository.BusinessInfo
import com.example.data.repository.toBusinessInfoSafely
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class CustomerHomeViewModel : ViewModel() {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _isLoadingCategories = MutableStateFlow(true)
    val isLoadingCategories: StateFlow<Boolean> = _isLoadingCategories.asStateFlow()

    val cartItemCount: StateFlow<Int> = CartManager.cartItemCount
    val cartItems: StateFlow<List<CartItem>> = CartManager.cartItems

    // Estado para favoritos (Comercios y Platos/Productos - Protocolo BSD-CUSTOMER-FAVORITES-UPGRADE-001)
    private val _favoriteIds = MutableStateFlow<Set<String>>(emptySet())
    val favoriteIds: StateFlow<Set<String>> = _favoriteIds.asStateFlow()

    private val _favoriteBusinessIds = MutableStateFlow<Set<String>>(emptySet())
    val favoriteBusinessIds: StateFlow<Set<String>> = _favoriteBusinessIds.asStateFlow()

    private val _favoriteProductIds = MutableStateFlow<Set<String>>(emptySet())
    val favoriteProductIds: StateFlow<Set<String>> = _favoriteProductIds.asStateFlow()

    private val _favoriteProducts = MutableStateFlow<List<com.example.presentation.customer.favorites.FavoriteProductItem>>(emptyList())
    val favoriteProducts: StateFlow<List<com.example.presentation.customer.favorites.FavoriteProductItem>> = _favoriteProducts.asStateFlow()

    // Estado de creación de pedido
    private val _orderPlaced = MutableStateFlow<String?>(null)   // orderId cuando se crea exitosamente
    val orderPlaced: StateFlow<String?> = _orderPlaced.asStateFlow()

    private val _orderErrorMessage = MutableStateFlow<String?>(null)
    val orderErrorMessage: StateFlow<String?> = _orderErrorMessage.asStateFlow()

    private val _isPlacingOrder = MutableStateFlow(false)
    val isPlacingOrder: StateFlow<Boolean> = _isPlacingOrder.asStateFlow()

    private var favoritesListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var profileListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var addressesListener: com.google.firebase.firestore.ListenerRegistration? = null

    // State Flows de Perfil y Dirección Real (MER 18.0)
    private val _currentUserProfile = MutableStateFlow<com.example.AppUser?>(null)
    val currentUserProfile: StateFlow<com.example.AppUser?> = _currentUserProfile.asStateFlow()

    // Recent orders for Quick Reorder (BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001 Phase 5)
    private val _recentOrders = MutableStateFlow<List<com.example.Pedido>>(emptyList())
    val recentOrders: StateFlow<List<com.example.Pedido>> = _recentOrders.asStateFlow()
    private var recentOrdersListener: com.google.firebase.firestore.ListenerRegistration? = null

    private val _addresses = MutableStateFlow<List<com.example.Address>>(emptyList())
    val addresses: StateFlow<List<com.example.Address>> = _addresses.asStateFlow()

    private val _defaultAddress = MutableStateFlow<com.example.Address?>(null)
    val defaultAddress: StateFlow<com.example.Address?> = _defaultAddress.asStateFlow()

    private val _promotions = MutableStateFlow<List<com.example.domain.model.Promotion>>(emptyList())
    val promotions: StateFlow<List<com.example.domain.model.Promotion>> = _promotions.asStateFlow()

    // State Flows del Dashboard Dinámico (Sprint 15)
    private val _publicBusinesses = MutableStateFlow<List<com.example.data.repository.BusinessInfo>>(emptyList())
    val publicBusinesses: StateFlow<List<com.example.data.repository.BusinessInfo>> = _publicBusinesses.asStateFlow()

    private val _allProducts = MutableStateFlow<List<com.example.domain.model.Product>>(emptyList())
    val allProducts: StateFlow<List<com.example.domain.model.Product>> = _allProducts.asStateFlow()

    private val _combos = MutableStateFlow<List<com.example.domain.model.menu.MenuCombo>>(emptyList())
    val combos: StateFlow<List<com.example.domain.model.menu.MenuCombo>> = _combos.asStateFlow()

    // Global Search Engine Flows
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedSearchFilter = MutableStateFlow("TODOS")
    val selectedSearchFilter: StateFlow<String> = _selectedSearchFilter.asStateFlow()

    private val _searchResults = MutableStateFlow(com.example.domain.engine.intelligence.CustomerSearchResults())
    val searchResults: StateFlow<com.example.domain.engine.intelligence.CustomerSearchResults> = _searchResults.asStateFlow()

    private val _dashboardConfig = MutableStateFlow(com.example.DashboardConfig())
    val dashboardConfig: StateFlow<com.example.DashboardConfig> = _dashboardConfig.asStateFlow()

    private val _featuredProducts = MutableStateFlow<List<com.example.FeaturedProduct>>(emptyList())
    val featuredProducts: StateFlow<List<com.example.FeaturedProduct>> = _featuredProducts.asStateFlow()

    private val _flashDeals = MutableStateFlow<List<com.example.FlashDeal>>(emptyList())
    val flashDeals: StateFlow<List<com.example.FlashDeal>> = _flashDeals.asStateFlow()

    private val _discountedProducts = MutableStateFlow<List<com.example.FeaturedProduct>>(emptyList())
    val discountedProducts: StateFlow<List<com.example.FeaturedProduct>> = _discountedProducts.asStateFlow()

    private val _branches = MutableStateFlow<List<com.example.BranchItem>>(emptyList())
    val branches: StateFlow<List<com.example.BranchItem>> = _branches.asStateFlow()

    // State Flows de Personalización y Tendencias (Sprint 15.1)
    private val _recommendedBusinesses = MutableStateFlow<List<com.example.Usuario>>(emptyList())
    val recommendedBusinesses: StateFlow<List<com.example.Usuario>> = _recommendedBusinesses.asStateFlow()

    private val _trendingBusinesses = MutableStateFlow<List<com.example.Usuario>>(emptyList())
    val trendingBusinesses: StateFlow<List<com.example.Usuario>> = _trendingBusinesses.asStateFlow()

    init {
        loadData()
        loadFavorites()
        listenToUserData()
        listenToDashboardData()
        setupGlobalSearchEngine()
        setupAuthListener()
    }

    private var authStateListener: com.google.firebase.auth.FirebaseAuth.AuthStateListener? = null

    private fun setupAuthListener() {
        authStateListener = com.google.firebase.auth.FirebaseAuth.AuthStateListener { firebaseAuth ->
            val uid = firebaseAuth.currentUser?.uid
            if (uid != null) {
                android.util.Log.d("FAVORITE_SYNC", "AuthStateListener activado para uid=$uid, sincronizando datos...")
                loadFavorites(uid)
                listenToUserData(uid)
                listenToRecentOrders(uid)
            } else {
                favoritesListener?.remove()
                favoritesListener = null
                profileListener?.remove()
                profileListener = null
                addressesListener?.remove()
                addressesListener = null
                recentOrdersListener?.remove()
                recentOrdersListener = null
                _recentOrders.value = emptyList()
                _favoriteBusinessIds.value = emptySet()
                _favoriteProductIds.value = emptySet()
                _favoriteProducts.value = emptyList()
                _favoriteIds.value = emptySet()
            }
        }
        auth.addAuthStateListener(authStateListener!!)
    }

    private fun listenToRecentOrders(uid: String) {
        recentOrdersListener?.remove()
        recentOrdersListener = db.collection("orders")
            .whereEqualTo("customerId", uid)
            .limit(10)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    android.util.Log.w("CUSTOMER_HOME", "Error cargando pedidos recientes de $uid: ${err.message}")
                    return@addSnapshotListener
                }
                val list = snap?.documents?.mapNotNull { doc ->
                    doc.toPedidoSafely()
                }?.sortedByDescending { it.createdAt?.seconds ?: 0L } ?: emptyList()
                _recentOrders.value = list
            }
    }

    private fun setupGlobalSearchEngine() {
        viewModelScope.launch {
            kotlinx.coroutines.flow.combine(
                _searchQuery,
                _publicBusinesses,
                _allProducts,
                _combos,
                _promotions
            ) { query, bizList, prodList, comboList, promoList ->
                if (query.isBlank()) {
                    com.example.domain.engine.intelligence.CustomerSearchResults(query = "")
                } else {
                    com.example.domain.engine.intelligence.EnterpriseSearchEngine.searchCatalog(
                        query = query,
                        businesses = bizList,
                        products = prodList,
                        combos = comboList,
                        promotions = promoList
                    )
                }
            }.collect { results ->
                _searchResults.value = results
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _searchQuery.value = query
    }

    fun onSearchFilterSelected(filter: String) {
        _selectedSearchFilter.value = filter
    }

    private fun listenToUserData(targetUid: String? = null) {
        val uid = targetUid ?: auth.currentUser?.uid ?: return
        profileListener?.remove()
        
        // Listener en tiempo real a /users/{uid} (Perfil)
        profileListener = db.collection("users").document(uid)
            .addSnapshotListener { snap, error ->
                if (error != null) {
                    android.util.Log.e("CustomerHomeVM", "Error en listener de usuario $uid: ${error.message}", error)
                    return@addSnapshotListener
                }
                if (snap != null && snap.exists()) {
                    try {
                        val user = snap.toAppUserSafely()
                        _currentUserProfile.value = user
                    } catch (e: Exception) {
                        android.util.Log.e("CustomerHomeVM", "Error procesando perfil de usuario $uid: ${e.message}", e)
                    }
                }
            }

        addressesListener?.remove()
        // Listener en tiempo real a /users/{uid}/addresses (Direcciones)
        addressesListener = db.collection("users").document(uid).collection("addresses")
            .addSnapshotListener { snap, error ->
                if (snap != null) {
                    val list = snap.documents.mapNotNull { it.toAddressSafely() }
                    _addresses.value = list
                    val def = list.find { it.isDefault } ?: list.firstOrNull()
                    _defaultAddress.value = def
                    android.util.Log.d("CART_DEBUG", "[VM] ADDRESSES_LOADED | count=${list.size} | default='${def?.fullAddress}' (lat=${def?.latitude}, lng=${def?.longitude})")
                }
            }
    }

    private fun listenToDashboardData() {
        viewModelScope.launch {
            val fm = com.example.FirebaseManager()
            val promoRepo = com.example.data.repository.PromotionRepository()
            promoRepo.startListening()
            launch { promoRepo.promotions.collect { _promotions.value = it } }
            launch {
                _currentUserProfile.collect { user ->
                    val tenantId = user?.tenantId
                    fm.listenToDashboardConfig(tenantId).collect { _dashboardConfig.value = it }
                }
            }
            launch { fm.listenToFeaturedProducts().collect { _featuredProducts.value = it } }
            launch { fm.listenToFlashDeals().collect { _flashDeals.value = it } }
            launch { fm.listenToDiscountedProducts().collect { _discountedProducts.value = it } }
            launch { fm.listenToBranches().collect { _branches.value = it } }
            launch { fm.listenToPublicCatalogBusinesses().collect { _publicBusinesses.value = it } }
            launch { fm.listenToAllActiveProducts().collect { _allProducts.value = it } }
            launch { fm.listenToActiveCombos().collect { _combos.value = it } }
        }
    }

    private fun loadData() {
        viewModelScope.launch {
            _isLoadingCategories.value = true
            _isLoadingCategories.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            _isLoadingCategories.value = true
            _isLoadingCategories.value = false
            _isRefreshing.value = false
        }
    }

    // ─── Favoritos (Comercios y Platos/Productos) ──────────────────────────

    private fun loadFavorites(targetUid: String? = null) {
        val uid = targetUid ?: auth.currentUser?.uid ?: return
        favoritesListener?.remove()
        favoritesListener = db.collection("users").document(uid)
            .collection("favorites")
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    android.util.Log.e("FAVORITE_SYNC", "Error escuchando favoritos de usuario $uid: ${err.message}", err)
                    return@addSnapshotListener
                }
                if (snap != null) {
                    val rawIds = snap.documents.map { it.id }.toSet()
                    val bizIds = mutableSetOf<String>()
                    val prodIds = mutableSetOf<String>()
                    val prods = mutableListOf<com.example.presentation.customer.favorites.FavoriteProductItem>()

                    for (doc in snap.documents) {
                        try {
                            val type = doc.getString("type") ?: ""
                            val docId = doc.id
                            if (type.equals("product", ignoreCase = true) || docId.startsWith("prod_") || doc.contains("productId")) {
                                val rawPId = doc.getString("productId") ?: doc.getString("targetId") ?: docId.removePrefix("prod_")
                                val cleanPId = rawPId.trim().removePrefix("prod_")
                                val pId = cleanPId.ifBlank { rawPId.trim() }

                                val rawPrice = doc.get("price")
                                val priceVal = when (rawPrice) {
                                    is Number -> rawPrice.toDouble()
                                    is String -> rawPrice.toDoubleOrNull() ?: 0.0
                                    else -> 0.0
                                }

                                if (pId.isNotBlank()) {
                                    prodIds.add(pId)
                                    prodIds.add(docId)
                                    prodIds.add("prod_$pId")
                                    prodIds.add("prod_prod_$pId")
                                    prods.add(
                                        com.example.presentation.customer.favorites.FavoriteProductItem(
                                            productId = pId,
                                            businessId = doc.getString("businessId") ?: "",
                                            businessName = doc.getString("businessName") ?: "",
                                            name = doc.getString("name") ?: doc.getString("productName") ?: "Plato Favorito",
                                            price = priceVal,
                                            imageUrl = doc.getString("imageUrl") ?: doc.getString("photoUrl") ?: "",
                                            category = doc.getString("category") ?: "",
                                            addedAt = doc.getTimestamp("addedAt")
                                        )
                                    )
                                }
                            } else {
                                // Se trata de un comercio
                                val bId = (doc.getString("businessId") ?: doc.getString("targetId") ?: docId.removePrefix("biz_")).trim()
                                if (bId.isNotBlank()) {
                                    bizIds.add(bId)
                                    bizIds.add(docId)
                                }
                            }
                        } catch (docEx: Exception) {
                            android.util.Log.w("FAVORITE_SYNC", "Error parseando documento favorito ${doc.id}: ${docEx.message}")
                        }
                    }

                    _favoriteBusinessIds.value = bizIds
                    _favoriteProductIds.value = prodIds
                    _favoriteProducts.value = prods
                    _favoriteIds.value = rawIds + bizIds + prodIds
                    android.util.Log.d("FAVORITE_SYNC", "Favoritos cargados: ${bizIds.size} comercios, ${prods.size} platos/productos para usuario $uid")
                }
            }
    }

    fun toggleFavorite(businessId: String) {
        toggleFavoriteBusiness(businessId)
    }

    fun toggleFavoriteBusiness(businessId: String, businessName: String = "") {
        val uid = auth.currentUser?.uid ?: return
        if (businessId.isBlank()) return

        val isCurrentlyFav = _favoriteBusinessIds.value.contains(businessId) || _favoriteIds.value.contains(businessId)
        // Actualización optimista inmediata en UI
        if (isCurrentlyFav) {
            _favoriteBusinessIds.value = _favoriteBusinessIds.value - businessId
            _favoriteIds.value = _favoriteIds.value - businessId - "biz_$businessId"
        } else {
            _favoriteBusinessIds.value = _favoriteBusinessIds.value + businessId
            _favoriteIds.value = _favoriteIds.value + businessId
        }

        viewModelScope.launch {
            try {
                val docRef = db.collection("users").document(uid).collection("favorites").document(businessId)
                if (isCurrentlyFav) {
                    docRef.delete().await()
                    try { db.collection("users").document(uid).collection("favorites").document("biz_$businessId").delete().await() } catch (_: Exception) {}
                    android.util.Log.d("FAVORITE_SYNC", "Comercio $businessId eliminado de favoritos para $uid")
                } else {
                    val data = hashMapOf<String, Any>(
                        "type" to "business",
                        "businessId" to businessId,
                        "targetId" to businessId,
                        "addedAt" to Timestamp.now()
                    )
                    if (businessName.isNotBlank()) data["name"] = businessName
                    docRef.set(data).await()
                    android.util.Log.d("FAVORITE_SYNC", "Comercio $businessId agregado a favoritos para $uid")
                }
            } catch (e: Exception) {
                android.util.Log.e("FAVORITE_SYNC", "Error sincronizando favorito comercio $businessId", e)
                // Revertir estado en caso de error
                if (isCurrentlyFav) {
                    _favoriteBusinessIds.value = _favoriteBusinessIds.value + businessId
                    _favoriteIds.value = _favoriteIds.value + businessId
                } else {
                    _favoriteBusinessIds.value = _favoriteBusinessIds.value - businessId
                    _favoriteIds.value = _favoriteIds.value - businessId
                }
            }
        }
    }

    fun toggleFavoriteProduct(product: com.example.domain.model.Product, businessName: String = "") {
        val uid = auth.currentUser?.uid ?: return
        val pId = product.id.ifBlank { return }
        val cleanId = pId.removePrefix("prod_")
        val docKey = "prod_$cleanId"
        val isCurrentlyFav = _favoriteProductIds.value.contains(cleanId) || _favoriteProductIds.value.contains(pId) || _favoriteProductIds.value.contains(docKey)

        if (isCurrentlyFav) {
            _favoriteProductIds.value = _favoriteProductIds.value - cleanId - pId - docKey
            _favoriteProducts.value = _favoriteProducts.value.filter { it.productId != cleanId && it.productId != pId }
        } else {
            _favoriteProductIds.value = _favoriteProductIds.value + cleanId + pId + docKey
        }

        viewModelScope.launch {
            try {
                val docRef = db.collection("users").document(uid).collection("favorites").document(docKey)
                if (isCurrentlyFav) {
                    docRef.delete().await()
                    try { db.collection("users").document(uid).collection("favorites").document(pId).delete().await() } catch (_: Exception) {}
                    try { db.collection("users").document(uid).collection("favorites").document("prod_prod_$cleanId").delete().await() } catch (_: Exception) {}
                    android.util.Log.d("FAVORITE_SYNC", "Producto $cleanId eliminado de favoritos para $uid")
                } else {
                    val img = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
                    val data = hashMapOf<String, Any>(
                        "type" to "product",
                        "productId" to cleanId,
                        "targetId" to cleanId,
                        "businessId" to product.businessId,
                        "businessName" to businessName,
                        "name" to product.name,
                        "price" to product.price,
                        "imageUrl" to img,
                        "category" to product.categoryName.ifBlank { product.category.name },
                        "addedAt" to Timestamp.now()
                    )
                    docRef.set(data).await()
                    android.util.Log.d("FAVORITE_SYNC", "Producto $cleanId agregado a favoritos para $uid")
                }
            } catch (e: Exception) {
                android.util.Log.e("FAVORITE_SYNC", "Error sincronizando favorito producto $cleanId", e)
            }
        }
    }

    fun toggleFavoriteProductById(
        productId: String,
        productName: String,
        price: Double,
        businessId: String,
        businessName: String,
        imageUrl: String = "",
        category: String = ""
    ) {
        val uid = auth.currentUser?.uid ?: return
        if (productId.isBlank()) return
        val cleanId = productId.removePrefix("prod_")
        val docKey = "prod_$cleanId"
        val isCurrentlyFav = _favoriteProductIds.value.contains(cleanId) || _favoriteProductIds.value.contains(productId) || _favoriteProductIds.value.contains(docKey)

        if (isCurrentlyFav) {
            _favoriteProductIds.value = _favoriteProductIds.value - cleanId - productId - docKey
            _favoriteProducts.value = _favoriteProducts.value.filter { it.productId != cleanId && it.productId != productId }
        } else {
            _favoriteProductIds.value = _favoriteProductIds.value + cleanId + productId + docKey
        }

        viewModelScope.launch {
            try {
                val docRef = db.collection("users").document(uid).collection("favorites").document(docKey)
                if (isCurrentlyFav) {
                    docRef.delete().await()
                    try { db.collection("users").document(uid).collection("favorites").document(productId).delete().await() } catch (_: Exception) {}
                    try { db.collection("users").document(uid).collection("favorites").document("prod_prod_$cleanId").delete().await() } catch (_: Exception) {}
                    android.util.Log.d("FAVORITE_SYNC", "Producto $cleanId eliminado de favoritos para $uid")
                } else {
                    val data = hashMapOf<String, Any>(
                        "type" to "product",
                        "productId" to cleanId,
                        "targetId" to cleanId,
                        "businessId" to businessId,
                        "businessName" to businessName,
                        "name" to productName,
                        "price" to price,
                        "imageUrl" to imageUrl,
                        "addedAt" to Timestamp.now()
                    )
                    if (category.isNotBlank()) {
                        data["category"] = category
                    }
                    docRef.set(data).await()
                    android.util.Log.d("FAVORITE_SYNC", "Producto $cleanId agregado a favoritos para $uid")
                }
            } catch (e: Exception) {
                android.util.Log.e("FAVORITE_SYNC", "Error sincronizando favorito producto $cleanId", e)
            }
        }
    }

    // ─── Creación de Pedido en Firestore (CRÍTICO #1) ─────────────────────

    fun placeOrder(
        deliveryAddress: String,
        deliveryFee: Double,
        paymentMethod: String = "efectivo",
        addressId: String? = null,
        latitude: Double = 0.0,
        longitude: Double = 0.0,
        fullAddress: String = "",
        instructions: String = "",
        couponCode: String? = null,
        couponDiscount: Double = 0.0,
        promotionDiscount: Double = 0.0,
        couponSnapshot: Map<String, Any?>? = null,
        tipAmount: Double = 0.0,
        tipSelectionType: String = "NONE",
        additionalChargeAmount: Double = 0.0,
        additionalChargePolicyId: String = "global_delivery_charge",
        additionalChargePolicyVersion: Int = 1,
        deliveryNote: String = ""
    ) {
        val uid = auth.currentUser?.uid
        val items = CartManager.cartItems.value
        android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] CONFIRM_CLICK | uid=$uid | itemsCount=${items.size} | address='$deliveryAddress' | coupon=$couponCode | discount=$couponDiscount | tip=$tipAmount | addCharge=$additionalChargeAmount | note='$deliveryNote'")
        if (uid == null || items.isEmpty()) {
            android.util.Log.w("ORDER_DEBUG", "[ORDER_DEBUG] placeOrder() BLOCKED: uid=$uid, itemsIsEmpty=${items.isEmpty()}")
            return
        }

        viewModelScope.launch {
            _isPlacingOrder.value = true
            try {
                // Validación de Payment Activation Gate
                val isCardRequested = paymentMethod.equals("tarjeta", ignoreCase = true) || paymentMethod.equals("card", ignoreCase = true)
                val isCardGateOpen = false // Payment Activation Gate baseline: cerrado hasta certificación bancaria
                if (isCardRequested && !isCardGateOpen) {
                    android.util.Log.e("PAYMENT_GATE", "[PAYMENT_GATE] Intento de pedido con tarjeta rechazado: Payment Activation Gate inactivo.")
                    _isPlacingOrder.value = false
                    return@launch
                }

                android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] Fetching user profile for uid=$uid...")
                val userDoc = db.collection("users").document(uid).get().await()
                val customerName = userDoc.getString("nombre") ?: userDoc.getString("displayName") ?: userDoc.getString("name") ?: "Cliente"
                val customerPhone = userDoc.getString("telefono") ?: userDoc.getString("phone") ?: ""

                // ── RESOLUCIÓN DE COORDENADAS & REGLA DE INTEGRIDAD GEOGRÁFICA ──
                var effectiveLat = latitude
                var effectiveLng = longitude

                if ((effectiveLat == 0.0 || effectiveLng == 0.0) && !addressId.isNullOrBlank()) {
                    try {
                        val addrDoc = db.collection("users").document(uid).collection("addresses").document(addressId).get().await()
                        val parsedAddr = addrDoc.toAddressSafely()
                        if (parsedAddr != null && parsedAddr.latitude != 0.0 && parsedAddr.longitude != 0.0) {
                            effectiveLat = parsedAddr.latitude
                            effectiveLng = parsedAddr.longitude
                            android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] Coordenadas resueltas desde addressId=$addressId: ($effectiveLat, $effectiveLng)")
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("ORDER_DEBUG", "[ORDER_DEBUG] Fallback fetch addressId=$addressId falló: ${e.message}")
                    }
                }

                // Regla de Integridad Geográfica (ADR-015 / BSD-CUSTOMER-CHECKOUT-DESTINATION-GEOLOCATION-FORENSIC-001)
                val isCoordinatesValid = effectiveLat != 0.0 && effectiveLng != 0.0 &&
                        !effectiveLat.isNaN() && !effectiveLng.isNaN() &&
                        effectiveLat in -90.0..90.0 && effectiveLng in -180.0..180.0

                if (!isCoordinatesValid) {
                    android.util.Log.e("ORDER_DEBUG", "[ORDER_DEBUG] REGLA DE INTEGRIDAD GEOGRÁFICA VIOLADA: lat=$effectiveLat, lng=$effectiveLng. Creación de orden bloqueada.")
                    _orderErrorMessage.value = "Ubicación geográfica no válida. Por favor selecciona o confirma tu dirección con ubicación precisa en el mapa para calcular la entrega."
                    _isPlacingOrder.value = false
                    return@launch
                }

                val effectiveAddress = if (deliveryAddress.isNotBlank() && deliveryAddress != "Seleccionar dirección 📍") deliveryAddress else (_defaultAddress.value?.fullAddress ?: "Dirección de entrega")
                val effectiveNote = deliveryNote.ifBlank { instructions }
                val groupedItems = items.groupBy { if (it.businessId.isNotBlank()) it.businessId else CartManager.currentBusinessId }
                var lastOrderCreatedId: String? = null

                android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] GROUPING_BY_BUSINESS | totalOrders=${groupedItems.size}")

                val customerMuni = (_defaultAddress.value?.municipalityId ?: "").trim().uppercase()

                for ((bizId, bizItems) in groupedItems) {
                    val bizInfo: BusinessInfo? = publicBusinesses.value.find { it.id == bizId }
                        ?: runCatching { db.collection("businesses").document(bizId).get().await().toBusinessInfoSafely() }.getOrNull()
                    val bizName = bizItems.firstOrNull { it.businessName.isNotBlank() }?.businessName ?: bizInfo?.getEffectiveName() ?: CartManager.currentBusinessName
                    val bizDeliveryFee = bizInfo?.getEffectiveDeliveryFee() ?: deliveryFee
                    val branchId = bizItems.firstOrNull { it.branchId.isNotBlank() }?.branchId ?: ""
                    val branchInfo = branches.value.find { it.id == branchId }

                    // BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001: Validación de Horario de Apertura y Disponibilidad
                    val isStoreOpen = bizInfo?.getEffectiveIsOpen() ?: true
                    if (!isStoreOpen) {
                        android.util.Log.e("ORDER_DEBUG", "[ORDER_DEBUG] REGLA DE DISPONIBILIDAD VIOLADA: Comercio $bizName cerrado en este horario.")
                        _orderErrorMessage.value = "El comercio \"$bizName\" se encuentra actualmente cerrado y no recibe pedidos en este momento."
                        _isPlacingOrder.value = false
                        return@launch
                    }

                    val originMuni = (branchInfo?.municipalityId?.ifBlank { null }
                        ?: bizInfo?.municipalityId?.ifBlank { null }
                        ?: bizInfo?.cityId ?: "").trim().uppercase()

                    if (customerMuni.isNotBlank() && originMuni.isNotBlank() && customerMuni != originMuni) {
                        android.util.Log.e("ORDER_DEBUG", "[ORDER_DEBUG] REGLA DE AISLAMIENTO MUNICIPAL VIOLADA: customerMuni=$customerMuni != originMuni=$originMuni. Creación de orden bloqueada.")
                        _orderErrorMessage.value = "No es posible realizar envíos comerciales entre diferentes municipios ($originMuni a $customerMuni). Utilice el servicio de encomiendas X→Y."
                        _isPlacingOrder.value = false
                        return@launch
                    }

                    val effectiveOriginMuni = originMuni.ifBlank { customerMuni }
                    val effectiveTenantId = branchInfo?.tenantId?.ifBlank { null } ?: bizInfo?.tenantId ?: ""
                    val effectiveDeptId = branchInfo?.departmentId?.ifBlank { null } ?: bizInfo?.departmentId ?: ""
                    val effectiveDeptName = branchInfo?.departmentName?.ifBlank { null } ?: bizInfo?.departmentName ?: ""
                    val effectiveMuniName = branchInfo?.municipalityName?.ifBlank { null } ?: bizInfo?.municipalityName ?: effectiveOriginMuni

                    val subtotal = bizItems.sumOf { it.unitPriceWithExtras * it.quantity }
                    val totalDiscount = couponDiscount + promotionDiscount
                    val total = kotlin.math.max(0.0, subtotal - totalDiscount + bizDeliveryFee + additionalChargeAmount + tipAmount)

                    val orderItems = bizItems.map { item ->
                        mapOf(
                            "productId" to item.productId,
                            "productName" to item.productName,
                            "price" to item.unitPriceWithExtras,
                            "basePrice" to item.price,
                            "quantity" to item.quantity,
                            "subtotal" to (item.unitPriceWithExtras * item.quantity),
                            "imageUrl" to item.imageUrl,
                            "selectedOptions" to item.selectedOptions.map { opt ->
                                mapOf(
                                    "optionGroupId" to opt.optionGroupId,
                                    "optionGroupName" to opt.optionGroupName,
                                    "optionId" to opt.optionId,
                                    "optionName" to opt.optionName,
                                    "additionalPrice" to opt.additionalPrice,
                                    "isFreeOption" to opt.isFreeOption,
                                    "finalPrice" to opt.finalPrice
                                )
                            }
                        )
                    }

                    val orderRef = db.collection("orders").document()
                    android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] ORDER_CREATE | orderId=${orderRef.id} | businessId=$bizId | branchId=$branchId | muni=$effectiveOriginMuni | subtotal=$subtotal | couponDisc=$couponDiscount | tip=$tipAmount | addCharge=$additionalChargeAmount | total=$total | lat=$effectiveLat | lng=$effectiveLng")

                    val canonicalMethod = if (paymentMethod.isBlank()) "efectivo" else paymentMethod
                    val merchantGross = maxOf(0.0, subtotal - totalDiscount)
                    val bizLat = if (branchInfo != null && branchInfo.latitude != 0.0) branchInfo.latitude else (bizInfo?.latitude ?: 0.0)
                    val bizLng = if (branchInfo != null && branchInfo.longitude != 0.0) branchInfo.longitude else (bizInfo?.longitude ?: 0.0)
                    val bizAddr = if (branchInfo != null && branchInfo.address.isNotBlank()) branchInfo.address else (bizInfo?.getEffectiveAddress() ?: "")

                    // BSD-COURIER-EARNINGS-DISTANCE-FORENSIC-001: Estimación canónica de distancia al crear orden
                    // COURIER-RATE-SSOT-REMEDIATION-004: Distance estimation only (geometric, NOT financial authority).
                    // Courier financial fields (courierRatePerKmApplied, courierDistanceEarnings, courierTotalEarnings)
                    // are NO LONGER sent by the client. The backend is the sole authority via system_config/global.
                    val calculatedDistanceMeters = if (bizLat != 0.0 && bizLng != 0.0 && effectiveLat != 0.0 && effectiveLng != 0.0) {
                        val straightLineKm = com.example.GeoUtils.calculateDistance(bizLat, bizLng, effectiveLat, effectiveLng)
                        kotlin.math.round(straightLineKm * 1.28 * 1000.0).toLong()
                    } else {
                        0L
                    }
                    val calculatedDistanceKm = kotlin.math.round((calculatedDistanceMeters / 1000.0) * 100.0) / 100.0
                    val words = bizName.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
                    val cleanPrefix = when {
                        words.size >= 3 -> words.take(3).map { it.first().uppercaseChar() }.joinToString("")
                        words.size == 2 -> (words[0].take(2) + words[1].take(1)).uppercase()
                        words.size == 1 -> words[0].take(4).uppercase()
                        else -> "ORD"
                    }.filter { it.isLetterOrDigit() }.padEnd(3, 'X').take(4)
                    val initialShortCode = orderRef.id.takeLast(4).uppercase()
                    val initialOrderCode = "$cleanPrefix$initialShortCode"

                    val orderData = hashMapOf(
                        "pedidoId" to orderRef.id,
                        "orderCode" to initialOrderCode,
                        "orderShortCode" to initialShortCode,
                        "orderCodePrefix" to cleanPrefix,
                        "customerId" to uid,
                        "clienteId" to uid,
                        "userId" to uid,
                        "uid" to uid,
                        "customerName" to customerName,
                        "customerPhone" to customerPhone,
                        "businessId" to bizId,
                        "businessName" to bizName,
                        "branchId" to branchId,
                        "commercialMunicipalityId" to effectiveOriginMuni,
                        "originMunicipalityId" to effectiveOriginMuni,
                        "originBranchId" to branchId.ifBlank { null },
                        "commercialTenantId" to effectiveTenantId,
                        "destinationMunicipalityId" to customerMuni.ifBlank { effectiveOriginMuni },
                        "tenantId" to effectiveTenantId,
                        "departmentId" to effectiveDeptId,
                        "departmentName" to effectiveDeptName,
                        "municipalityId" to effectiveOriginMuni,
                        "municipalityName" to effectiveMuniName,
                        "cityId" to effectiveOriginMuni,
                        "city" to effectiveMuniName,
                        "cityName" to effectiveMuniName,
                        "routeDistanceMeters" to calculatedDistanceMeters,
                        "routeDistanceKm" to calculatedDistanceKm,
                        "distanceKm" to calculatedDistanceKm,
                        "distanceSource" to "FALLBACK_ESTIMATED",
                        "routingProvider" to "FALLBACK_ESTIMATED",
                        // CR-001 CLOSED: No courier financial fields sent by client.
                        // Backend stamps authoritative values from system_config/global.
                        "items" to orderItems,
                        "subtotal" to subtotal,
                        "merchantGrossSales" to merchantGross,
                        "deliveryFee" to bizDeliveryFee,
                        "discountAmount" to totalDiscount,
                        "couponCode" to (couponCode ?: ""),
                        "couponDiscount" to couponDiscount,
                        "promotionDiscount" to promotionDiscount,
                        "totalDiscount" to totalDiscount,
                        "coupon" to (couponSnapshot ?: emptyMap<String, Any?>()),
                        "additionalChargeAmount" to additionalChargeAmount,
                        "additionalCharge" to additionalChargeAmount,
                        "additionalChargePolicyId" to additionalChargePolicyId,
                        "additionalChargePolicyVersion" to additionalChargePolicyVersion,
                        "tipAmount" to tipAmount,
                        "tip" to tipAmount,
                        "tipSelectionType" to tipSelectionType,
                        "deliveryNote" to effectiveNote,
                        "notes" to effectiveNote,
                        "instructions" to effectiveNote,
                        "deliveryInstructions" to effectiveNote,
                        "total" to total,
                        "customerTotal" to total,
                        "valoresMonetarios" to mapOf(
                            "subtotal" to subtotal,
                            "merchantGrossSales" to merchantGross,
                            "costoEnvio" to bizDeliveryFee,
                            "cargoAdicional" to additionalChargeAmount,
                            "propina" to tipAmount,
                            "descuento" to totalDiscount,
                            "total" to total,
                            "customerTotal" to total,
                            "metodoPago" to canonicalMethod
                        ),
                        "status" to "pending",
                        "estado" to "pendiente",
                        "paymentMethod" to canonicalMethod,
                        "paymentStatus" to "pending",
                        "paymentVerified" to false,
                        "addressId" to (addressId ?: ""),
                        "address" to effectiveAddress,
                        "deliveryAddress" to effectiveAddress,
                        "destinationAddress" to effectiveAddress,
                        "fullAddress" to fullAddress.ifBlank { effectiveAddress },
                        // BSD-CUSTOMER-CHECKOUT-DESTINATION-GEOLOCATION-FORENSIC-001: Contrato Geográfico Canónico
                        "latitude" to effectiveLat,
                        "longitude" to effectiveLng,
                        "destinationLatitude" to effectiveLat,
                        "destinationLongitude" to effectiveLng,
                        "destino" to mapOf(
                            "direccion" to effectiveAddress,
                            "coordenadas" to mapOf(
                                "latitud" to effectiveLat,
                                "longitud" to effectiveLng
                            )
                        ),
                        "destination" to mapOf(
                            "address" to effectiveAddress,
                            "latitude" to effectiveLat,
                            "longitude" to effectiveLng
                        ),
                        "origen" to mapOf(
                            "nombreComercio" to bizName,
                            "direccion" to bizAddr,
                            "coordenadas" to mapOf(
                                "latitud" to bizLat,
                                "longitud" to bizLng
                            )
                        ),
                        "origin" to mapOf(
                            "businessName" to bizName,
                            "address" to bizAddr,
                            "latitude" to bizLat,
                            "longitude" to bizLng
                        ),
                        "createdAt" to Timestamp.now(),
                        "creadoEl" to Timestamp.now().toString(),
                        "platform" to "ANDROID",
                        "courierPhase" to 1,
                        "hasBeenRated" to false
                    )

                    orderRef.set(orderData).await()
                    android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] FIRESTORE_WRITE_SUCCESS | orderId=${orderRef.id}")

                    lastOrderCreatedId = orderRef.id
                }

                CartManager.clear()
                _orderPlaced.value = lastOrderCreatedId
                android.util.Log.d("ORDER_DEBUG", "[ORDER_DEBUG] ALL_ORDERS_CREATED | clearedCart=true | lastOrder=$lastOrderCreatedId")
            } catch (e: Exception) {
                android.util.Log.e("ORDER_DEBUG", "[ORDER_DEBUG] FATAL_ERROR_CREATING_ORDER: ${e.message}", e)
                _orderErrorMessage.value = "Error al crear el pedido: ${e.message ?: "Intente nuevamente"}"
            } finally {
                _isPlacingOrder.value = false
            }
        }
    }

    fun clearOrderPlaced() {
        _orderPlaced.value = null
    }

    fun clearOrderErrorMessage() {
        _orderErrorMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        authStateListener?.let { auth.removeAuthStateListener(it) }
        favoritesListener?.remove()
        profileListener?.remove()
        addressesListener?.remove()
        recentOrdersListener?.remove()
        recentOrdersListener = null
    }
}

