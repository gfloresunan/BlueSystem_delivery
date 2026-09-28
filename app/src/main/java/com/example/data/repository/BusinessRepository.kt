package com.example.data.repository

import android.util.Log
import com.example.AppUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.channels.awaitClose

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName
import com.example.domain.engine.business.OperatingHoursResolver

@IgnoreExtraProperties
data class BusinessInfo(
    var id: String = "",
    var name: String = "",
    var nombre: String = "",
    var comercioNombre: String = "",
    var category: String = "",
    var categoria: String = "",
    var categoryId: String = "",
    var categorySlug: String = "",
    var address: String = "",
    var direccion: String = "",
    var logoUrl: String = "",
    var photoUrl: String = "",
    var avatarUrl: String = "",
    var bannerUrl: String = "",
    var coverUrl: String = "",
    var portadaUrl: String = "",
    @get:PropertyName("isOpen")
    @set:PropertyName("isOpen")
    var isOpen: Boolean = true,
    @get:PropertyName("abierto")
    @set:PropertyName("abierto")
    var abierto: Boolean = true,
    var deliveryFee: Double = 45.0,
    var costoEnvio: Double = 45.0,
    var minOrder: Double = 100.0,
    var minimumOrder: Double = 100.0,
    var ordenMinima: Double = 100.0,
    var deliveryTime: String = "20-35 min",
    var tiempoEntrega: String = "20-35 min",
    @get:PropertyName("isFeatured")
    @set:PropertyName("isFeatured")
    @set:JvmName("setIsFeatured")
    var isFeatured: Boolean = false,
    @get:PropertyName("featured")
    @set:PropertyName("featured")
    var featured: Boolean = false,
    @get:PropertyName("isVerified")
    @set:PropertyName("isVerified")
    @set:JvmName("setIsVerifiedField")
    var isVerified: Boolean = true,
    @get:PropertyName("verified")
    @set:PropertyName("verified")
    var verified: Boolean = true,
    @get:PropertyName("isActive")
    @set:PropertyName("isActive")
    @set:JvmName("setIsActive")
    var isActive: Boolean = true,
    @get:PropertyName("active")
    @set:PropertyName("active")
    var active: Boolean = true,
    var status: String = "ACTIVE",
    var lifecycleStatus: String = "ACTIVE",
    @get:PropertyName("isDeleted")
    @set:PropertyName("isDeleted")
    var isDeleted: Boolean = false,
    var schedule: Any? = null,
    var horario: String = "",
    var scheduleMap: Map<String, Any>? = null,
    var weeklySchedule: Map<String, Any>? = null,
    var rating: Double = 4.8,
    var ratingAverage: Double = 4.8,
    var ratingCount: Int = 18,
    var reviewsCount: Int = 18,
    var phone: String = "",
    var telefono: String = "",
    var description: String = "",
    var descripcion: String = "",
    var tenantId: String = "",
    var departmentId: String = "",
    var departmentName: String = "",
    var municipalityId: String = "",
    var municipalityName: String = "",
    var cityId: String = "",
    var city: String = "",
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var lat: Double = 0.0,
    var lng: Double = 0.0,
    var location: Map<String, Any>? = null,
    var coordenadas: Map<String, Any>? = null,
    // --- C2D CUSTOMER DASHBOARD CANONICAL ATTRIBUTES ---
    var unitsSold30d: Int = 0,
    var priceParityVerified: Boolean = false,
    var priceParityVerifiedAt: com.google.firebase.Timestamp? = null,
    var activatedAt: com.google.firebase.Timestamp? = null,
    var approvedAt: com.google.firebase.Timestamp? = null,
    var createdAt: com.google.firebase.Timestamp? = null
) {
    fun getEffectiveName(): String = name.ifBlank { comercioNombre.ifBlank { nombre } }
    fun getEffectiveCategory(): String = category.ifBlank { categoria.ifBlank { "Restaurante" } }
    fun getEffectiveAddress(): String = address.ifBlank { direccion.ifBlank { "Managua, Nicaragua" } }
    fun getEffectiveLogoUrl(): String = logoUrl.ifBlank { photoUrl.ifBlank { avatarUrl } }
    fun getEffectiveBannerUrl(): String = bannerUrl.ifBlank { coverUrl.ifBlank { portadaUrl } }
    fun getEffectiveIsOpen(timezone: String = "America/Managua"): Boolean {
        val manualOpen = isOpen && abierto
        val sched = scheduleMap ?: weeklySchedule ?: (schedule as? Map<*, *>) ?: schedule ?: horario
        return OperatingHoursResolver.isStoreOpen(
            schedule = sched,
            manualOpen = manualOpen,
            timezone = timezone
        )
    }
    fun getEffectiveIsActive(): Boolean {
        if (isDeleted) return false
        val s = status.trim().uppercase()
        if (s == "DELETED" || s == "DEPROVISIONED" || s == "SUSPENDED" || s == "INACTIVE") return false
        val ls = lifecycleStatus.trim().uppercase()
        if (ls == "DELETED" || ls == "DEPROVISIONED" || ls == "SUSPENDED" || ls == "INACTIVE") return false
        if (!isActive || !active) return false
        return true
    }
    fun getEffectiveIsFeatured(): Boolean = isFeatured || featured
    fun getEffectiveDeliveryFee(): Double = if (deliveryFee > 0.0) deliveryFee else (if (costoEnvio > 0.0) costoEnvio else 45.0)
    fun getEffectiveDeliveryTime(): String = deliveryTime.ifBlank { tiempoEntrega.ifBlank { "20-35 min" } }
    fun getEffectiveMinOrder(): Double = if (minOrder > 0.0) minOrder else (if (minimumOrder > 0.0) minimumOrder else (if (ordenMinima > 0.0) ordenMinima else 100.0))
    fun getEffectiveRating(): Double = if (rating > 0.0) rating else (if (ratingAverage > 0.0) ratingAverage else 4.8)
    fun getEffectiveRatingCount(): Int = if (ratingCount > 0) ratingCount else (if (reviewsCount > 0) reviewsCount else 18)
    fun getEffectiveIsVerified(): Boolean = isVerified || verified
    fun getEffectivePhone(): String = phone.ifBlank { telefono }
    fun getEffectiveDescription(): String = description.ifBlank { descripcion }

    fun getEffectiveLatitude(branches: List<com.example.BranchItem> = emptyList()): Double {
        if (latitude in -90.0..90.0 && latitude != 0.0) return latitude
        if (lat in -90.0..90.0 && lat != 0.0) return lat
        val locLat = (location?.get("latitude") as? Number)?.toDouble()
            ?: (location?.get("_latitude") as? Number)?.toDouble()
            ?: (location?.get("lat") as? Number)?.toDouble()
        if (locLat != null && locLat in -90.0..90.0 && locLat != 0.0) return locLat
        val coordLat = (coordenadas?.get("latitud") as? Number)?.toDouble()
            ?: (coordenadas?.get("lat") as? Number)?.toDouble()
            ?: (coordenadas?.get("latitude") as? Number)?.toDouble()
        if (coordLat != null && coordLat in -90.0..90.0 && coordLat != 0.0) return coordLat
        return 0.0
    }

    fun getEffectiveLongitude(branches: List<com.example.BranchItem> = emptyList()): Double {
        if (longitude in -180.0..180.0 && longitude != 0.0) return longitude
        if (lng in -180.0..180.0 && lng != 0.0) return lng
        val locLng = (location?.get("longitude") as? Number)?.toDouble()
            ?: (location?.get("_longitude") as? Number)?.toDouble()
            ?: (location?.get("lng") as? Number)?.toDouble()
        if (locLng != null && locLng in -180.0..180.0 && locLng != 0.0) return locLng
        val coordLng = (coordenadas?.get("longitud") as? Number)?.toDouble()
            ?: (coordenadas?.get("lng") as? Number)?.toDouble()
            ?: (coordenadas?.get("longitude") as? Number)?.toDouble()
        if (coordLng != null && coordLng in -180.0..180.0 && coordLng != 0.0) return coordLng
        return 0.0
    }

    fun hasValidLocation(branches: List<com.example.BranchItem> = emptyList()): Boolean {
        val latVal = getEffectiveLatitude(branches)
        val lngVal = getEffectiveLongitude(branches)
        return latVal != 0.0 && lngVal != 0.0 && latVal in -90.0..90.0 && lngVal in -180.0..180.0 && !latVal.isNaN() && !lngVal.isNaN()
    }

    fun isValidPublicCatalogItem(): Boolean {
        return getEffectiveIsActive() &&
                getEffectiveName().isNotBlank()
    }
}

class BusinessRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _publicBusinesses = MutableStateFlow<List<BusinessInfo>>(emptyList())
    val publicBusinesses: StateFlow<List<BusinessInfo>> = _publicBusinesses.asStateFlow()

    private val _featuredBusinesses = MutableStateFlow<List<BusinessInfo>>(emptyList())
    val featuredBusinesses: StateFlow<List<BusinessInfo>> = _featuredBusinesses.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening() {
        if (listenerRegistration != null) return

        // 1. Carga instantánea desde el caché local de Firestore (0 milisegundos)
        firestore.collection("businesses")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    val cachedList = cacheSnap.documents.mapNotNull { doc ->
                        val parsed = doc.toBusinessInfoSafely()
                        if (parsed != null && parsed.isValidPublicCatalogItem()) parsed else null
                    }
                    if (cachedList.isNotEmpty()) {
                        _publicBusinesses.value = cachedList
                        _featuredBusinesses.value = cachedList.filter { it.getEffectiveIsFeatured() }
                        Log.d("BusinessRepo", "CACHE HIT: Loaded ${cachedList.size} public businesses instantly")
                    }
                }
            }

        // 2. Listener continuo de actualización en vivo
        Log.d("BusinessRepo", "PUBLIC BUSINESSES QUERY: listening to /businesses collection")
        listenerRegistration = firestore.collection("businesses")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("BusinessRepo", "Error listening to businesses collection", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val parsed = doc.toBusinessInfoSafely()
                        if (parsed != null && parsed.isValidPublicCatalogItem()) {
                            parsed
                        } else null
                    }
                    _publicBusinesses.value = list
                    _featuredBusinesses.value = list.filter { it.getEffectiveIsFeatured() }
                    Log.d("BusinessRepo", "Public catalog businesses updated: total=${list.size}, featured=${_featuredBusinesses.value.size}")
                }
            }
    }

    fun stopListening() {
        listenerRegistration?.remove()
        listenerRegistration = null
        _publicBusinesses.value = emptyList()
        _featuredBusinesses.value = emptyList()
    }

    fun getBusinessFlow(businessId: String): kotlinx.coroutines.flow.Flow<BusinessInfo?> = kotlinx.coroutines.flow.callbackFlow {
        if (businessId.isBlank()) {
            trySend(null)
            close()
            return@callbackFlow
        }
        val listener = firestore.collection("businesses").document(businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(null)
                    return@addSnapshotListener
                }
                val info = snapshot?.toBusinessInfoSafely()
                trySend(info)
            }
        awaitClose { listener.remove() }
    }
}

/**
 * Conversión ultra-resiliente de DocumentSnapshot a BusinessInfo.
 * Previene fallas de deserialización de Firestore SDK por diferencias de tipos numéricos (Long vs Double),
 * GeoPoints, booleanos en string/número, y esquemas heterogéneos en /businesses.
 */
fun com.google.firebase.firestore.DocumentSnapshot.toBusinessInfoSafely(): BusinessInfo? {
    try {
        val direct = this.toObject(BusinessInfo::class.java)
        if (direct != null && direct.getEffectiveName().isNotBlank()) {
            @Suppress("UNCHECKED_CAST")
            val schedMap = (this.get("schedule") as? Map<String, Any>)
                ?: (this.get("weeklySchedule") as? Map<String, Any>)
                ?: (this.get("horario") as? Map<String, Any>)
                ?: (direct.schedule as? Map<String, Any>)
            return direct.copy(
                id = this.id,
                scheduleMap = schedMap ?: direct.scheduleMap,
                weeklySchedule = schedMap ?: direct.weeklySchedule
            )
        }
    } catch (e: Exception) {
        // Fallback al parseo manual resiliente
    }

    return try {
        val docId = this.id
        val name = this.getString("name") ?: this.getString("nombre") ?: this.getString("comercioNombre")
            ?: this.getString("businessName") ?: this.getString("storeName") ?: this.getString("restaurantName") ?: ""
        val category = this.getString("category") ?: this.getString("categoria") ?: ""
        val categoryId = this.getString("categoryId") ?: ""
        val categorySlug = this.getString("categorySlug") ?: ""
        val address = this.getString("address") ?: this.getString("direccion") ?: ""
        val logoUrl = this.getString("logoUrl") ?: this.getString("photoUrl") ?: this.getString("avatarUrl") ?: ""
        val bannerUrl = this.getString("bannerUrl") ?: this.getString("coverUrl") ?: this.getString("portadaUrl") ?: ""
        val deliveryTime = this.getString("deliveryTime") ?: this.getString("tiempoEntrega") ?: "20-35 min"
        val schedule = runCatching { this.getString("schedule") ?: this.getString("horario") }.getOrNull() ?: ""
        @Suppress("UNCHECKED_CAST")
        val scheduleMap = (this.get("schedule") as? Map<String, Any>)
            ?: (this.get("weeklySchedule") as? Map<String, Any>)
            ?: (this.get("horario") as? Map<String, Any>)
        val phone = this.getString("phone") ?: this.getString("telefono") ?: ""
        val description = this.getString("description") ?: this.getString("descripcion") ?: ""
        val tenantId = this.getString("tenantId") ?: ""
        val departmentId = this.getString("departmentId") ?: ""
        val departmentName = this.getString("departmentName") ?: ""
        val municipalityId = this.getString("municipalityId") ?: ""
        val municipalityName = this.getString("municipalityName") ?: ""
        val cityId = this.getString("cityId") ?: ""
        val city = this.getString("city") ?: ""

        val parseBool: (Any?, Boolean) -> Boolean = { any, defaultVal ->
            when (any) {
                is Boolean -> any
                is String -> any.equals("true", ignoreCase = true)
                is Number -> any.toInt() == 1
                else -> defaultVal
            }
        }

        val parseDouble: (Any?, Double) -> Double = { any, defaultVal ->
            when (any) {
                is Number -> any.toDouble()
                is String -> any.toDoubleOrNull() ?: defaultVal
                else -> defaultVal
            }
        }

        val parseInt: (Any?, Int) -> Int = { any, defaultVal ->
            when (any) {
                is Number -> any.toInt()
                is String -> any.toIntOrNull() ?: defaultVal
                else -> defaultVal
            }
        }

        val isOpen = parseBool(this.get("isOpen") ?: this.get("abierto"), true)
        val abierto = parseBool(this.get("abierto") ?: this.get("isOpen"), true)
        val isActive = parseBool(this.get("isActive") ?: this.get("active") ?: this.get("activo"), true)
        val active = parseBool(this.get("active") ?: this.get("isActive") ?: this.get("activo"), true)
        val isFeatured = parseBool(this.get("isFeatured") ?: this.get("featured") ?: this.get("destacado"), false)
        val featured = parseBool(this.get("featured") ?: this.get("isFeatured") ?: this.get("destacado"), false)
        val isVerified = parseBool(this.get("isVerified") ?: this.get("verified"), true)
        val verified = parseBool(this.get("verified") ?: this.get("isVerified"), true)
        val isDeleted = parseBool(this.get("isDeleted") ?: this.get("deleted") ?: this.get("eliminado"), false)

        val statusStr = (this.getString("status") ?: this.getString("lifecycleStatus") ?: this.getString("estado") ?: "ACTIVE").uppercase()
        val lifecycleStatusStr = (this.getString("lifecycleStatus") ?: this.getString("status") ?: "ACTIVE").uppercase()

        val deliveryFeeVal = parseDouble(this.get("deliveryFee") ?: this.get("costoEnvio"), 45.0)
        val minOrderVal = parseDouble(this.get("minOrder") ?: this.get("minimumOrder") ?: this.get("ordenMinima"), 100.0)
        val ratingVal = parseDouble(this.get("rating") ?: this.get("ratingAverage"), 4.8)
        val ratingCountVal = parseInt(this.get("ratingCount") ?: this.get("reviewsCount"), 18)

        // Parseo de coordenadas GPS ultra-resiliente (campos primitivos, GeoPoint o Map)
        var parsedLat = parseDouble(this.get("latitude") ?: this.get("lat") ?: this.get("latitud"), 0.0)
        var parsedLng = parseDouble(this.get("longitude") ?: this.get("lng") ?: this.get("longitud"), 0.0)

        val locAny = this.get("location") ?: this.get("coordenadas")
        if (locAny is com.google.firebase.firestore.GeoPoint) {
            parsedLat = locAny.latitude
            parsedLng = locAny.longitude
        } else if (locAny is Map<*, *>) {
            val mLat = parseDouble(locAny["latitude"] ?: locAny["_latitude"] ?: locAny["lat"] ?: locAny["latitud"], 0.0)
            val mLng = parseDouble(locAny["longitude"] ?: locAny["_longitude"] ?: locAny["lng"] ?: locAny["longitud"], 0.0)
            if (parsedLat == 0.0 && mLat != 0.0) parsedLat = mLat
            if (parsedLng == 0.0 && mLng != 0.0) parsedLng = mLng
        }

        val unitsSold30dVal = parseInt(this.get("unitsSold30d") ?: this.get("unidadesVendidas30d"), 0)
        val priceParityVerifiedVal = parseBool(this.get("priceParityVerified") ?: this.get("mismoPrecioVerificado"), false)
        val priceParityVerifiedAtVal = this.getTimestamp("priceParityVerifiedAt")
        val activatedAtVal = this.getTimestamp("activatedAt") ?: this.getTimestamp("createdAt")
        val approvedAtVal = this.getTimestamp("approvedAt")
        val createdAtVal = this.getTimestamp("createdAt")

        BusinessInfo(
            id = docId,
            name = name,
            nombre = name,
            comercioNombre = name,
            category = category,
            categoria = category,
            categoryId = categoryId,
            categorySlug = categorySlug,
            address = address,
            direccion = address,
            logoUrl = logoUrl,
            photoUrl = logoUrl,
            avatarUrl = logoUrl,
            bannerUrl = bannerUrl,
            coverUrl = bannerUrl,
            portadaUrl = bannerUrl,
            isOpen = isOpen,
            abierto = abierto,
            deliveryFee = deliveryFeeVal,
            costoEnvio = deliveryFeeVal,
            minOrder = minOrderVal,
            minimumOrder = minOrderVal,
            ordenMinima = minOrderVal,
            deliveryTime = deliveryTime,
            tiempoEntrega = deliveryTime,
            isFeatured = isFeatured,
            featured = featured,
            isVerified = isVerified,
            verified = verified,
            isActive = isActive,
            active = active,
            status = statusStr,
            lifecycleStatus = lifecycleStatusStr,
            isDeleted = isDeleted,
            schedule = schedule,
            horario = schedule,
            scheduleMap = scheduleMap,
            weeklySchedule = scheduleMap,
            rating = ratingVal,
            ratingAverage = ratingVal,
            ratingCount = ratingCountVal,
            reviewsCount = ratingCountVal,
            phone = phone,
            telefono = phone,
            description = description,
            descripcion = description,
            tenantId = tenantId,
            departmentId = departmentId,
            departmentName = departmentName,
            municipalityId = municipalityId,
            municipalityName = municipalityName,
            cityId = cityId,
            city = city,
            latitude = parsedLat,
            longitude = parsedLng,
            lat = parsedLat,
            lng = parsedLng,
            unitsSold30d = unitsSold30dVal,
            priceParityVerified = priceParityVerifiedVal,
            priceParityVerifiedAt = priceParityVerifiedAtVal,
            activatedAt = activatedAtVal,
            approvedAt = approvedAtVal,
            createdAt = createdAtVal
        )
    } catch (e: Exception) {
        Log.e("BusinessRepo", "Error parsing business doc ${this.id}", e)
        null
    }
}
