package com.example.data.repository

import com.example.domain.model.settings.RestaurantSettings
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Repositorio de Configuración del Restaurante (ADR-003 Compliant)
 * Límite máximo: 2 listeners activos por sesión en Firestore:
 * 1. restaurant_settings/{id} (Configuración operativa)
 * 2. businesses/{id} (Sincronización en tiempo real de campos públicos desde Web)
 */
class RestaurantSettingsRepository(
    private val firestore: FirebaseFirestore? = try { FirebaseFirestore.getInstance() } catch (e: Throwable) { null }
) {
    companion object {
        private const val SETTINGS_COLLECTION = "restaurant_settings"
        private const val BUSINESSES_COLLECTION = "businesses"
    }

    private var cachedSettings: RestaurantSettings? = null

    /**
     * Listener Bidireccional Dual (ADR-003 Compliant: 2 listeners exactos):
     * Escucha en tiempo real tanto restaurant_settings/{id} como businesses/{id}
     * para evitar cualquier desalineación de estado entre la Web y la APK.
     */
    fun getRestaurantSettingsStream(restaurantId: String): Flow<RestaurantSettings> = callbackFlow {
        if (restaurantId.isEmpty() || firestore == null) {
            trySend(cachedSettings ?: RestaurantSettings(restaurantId = restaurantId))
            close()
            return@callbackFlow
        }

        var currentSettings = cachedSettings ?: RestaurantSettings(restaurantId = restaurantId)

        fun emitUpdatedSettings(builder: (RestaurantSettings) -> RestaurantSettings) {
            currentSettings = builder(currentSettings)
            cachedSettings = currentSettings
            trySend(currentSettings)
        }

        // Emit initial value immediately so UI renders without delay
        trySend(computeDynamicReadiness(currentSettings))

        fun safeString(snap: DocumentSnapshot, vararg fields: String): String? {
            for (f in fields) {
                val v = snap.get(f) ?: continue
                when (v) {
                    is String -> if (v.isNotBlank()) return v
                    is Map<*, *> -> {
                        // If it's a weekly schedule map, format a readable summary
                        return "Horario configurado"
                    }
                    else -> return v.toString()
                }
            }
            return null
        }

        fun safeDouble(snap: DocumentSnapshot, vararg fields: String): Double? {
            for (f in fields) {
                val v = snap.get(f) ?: continue
                when (v) {
                    is Number -> return v.toDouble()
                    is String -> v.toDoubleOrNull()?.let { return it }
                }
            }
            return null
        }

        fun safeBoolean(snap: DocumentSnapshot, vararg fields: String): Boolean? {
            for (f in fields) {
                val v = snap.get(f) ?: continue
                when (v) {
                    is Boolean -> return v
                    is String -> v.toBooleanStrictOrNull()?.let { return it }
                    is Number -> return v.toInt() == 1
                }
            }
            return null
        }

        fun safeInt(snap: DocumentSnapshot, vararg fields: String): Int? {
            for (f in fields) {
                val v = snap.get(f) ?: continue
                when (v) {
                    is Number -> return v.toInt()
                    is String -> v.toIntOrNull()?.let { return it }
                }
            }
            return null
        }

        // Listener 1: restaurant_settings/{id} (Campos operativos)
        val settingsRegistration = firestore.collection(SETTINGS_COLLECTION).document(restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null && snapshot.exists()) {
                    val commercialName = safeString(snapshot, "commercialName", "name", "nombre") ?: currentSettings.commercialName
                    val legalName = safeString(snapshot, "legalName") ?: currentSettings.legalName
                    val description = safeString(snapshot, "description", "descripcion") ?: currentSettings.description
                    val category = safeString(snapshot, "category", "categoria") ?: currentSettings.category
                    val phone = safeString(snapshot, "phone", "telefono") ?: currentSettings.phone
                    val whatsapp = safeString(snapshot, "whatsapp") ?: currentSettings.whatsapp
                    val address = safeString(snapshot, "address", "direccion") ?: currentSettings.address
                    val deliveryFee = safeDouble(snapshot, "deliveryFee", "costoEnvio") ?: currentSettings.deliveryFee
                    val minOrder = safeDouble(snapshot, "minimumOrderAmount", "minOrder", "ordenMinima") ?: currentSettings.minimumOrderAmount
                    val deliveryRadius = safeDouble(snapshot, "deliveryRadiusKm", "maxDeliveryRadiusKm") ?: currentSettings.maxDeliveryRadiusKm
                    val freeDelivery = safeDouble(snapshot, "freeDeliveryThreshold") ?: currentSettings.freeDeliveryThreshold
                    val deliveryTime = safeString(snapshot, "deliveryTime", "tiempoEntrega") ?: currentSettings.deliveryTime
                    val isOpen = safeBoolean(snapshot, "isOpen", "abierto") ?: currentSettings.isOpen
                    val scheduleText = safeString(snapshot, "scheduleText", "schedule", "horario") ?: currentSettings.scheduleText
                    val logoUrl = safeString(snapshot, "logoUrl", "photoUrl", "avatarUrl") ?: currentSettings.logoUrl
                    val bannerUrl = safeString(snapshot, "bannerUrl", "coverUrl", "portadaUrl") ?: currentSettings.bannerUrl
                    val acceptCash = safeBoolean(snapshot, "acceptCashPayment") ?: currentSettings.acceptCashPayment
                    val acceptCard = safeBoolean(snapshot, "acceptCardPayment") ?: currentSettings.acceptCardPayment
                    val acceptTransfer = safeBoolean(snapshot, "acceptTransferPayment") ?: currentSettings.acceptTransferPayment
                    val vatTax = safeDouble(snapshot, "vatTaxPercentage") ?: currentSettings.vatTaxPercentage
                    val prepTime = safeInt(snapshot, "prepTimeMinutes") ?: currentSettings.prepTimeMinutes
                    val autoPrint = safeBoolean(snapshot, "autoPrintOrders") ?: currentSettings.autoPrintOrders
                    val version = safeInt(snapshot, "version") ?: currentSettings.version
                    val checksum = safeString(snapshot, "checksumSha256") ?: currentSettings.checksumSha256

                    emitUpdatedSettings { prev ->
                        val updated = prev.copy(
                            commercialName = commercialName,
                            legalName = legalName,
                            description = description,
                            category = category,
                            phone = phone,
                            whatsapp = whatsapp,
                            address = address,
                            deliveryFee = deliveryFee,
                            minimumOrderAmount = minOrder,
                            maxDeliveryRadiusKm = deliveryRadius,
                            freeDeliveryThreshold = freeDelivery,
                            deliveryTime = deliveryTime,
                            isOpen = isOpen,
                            scheduleText = scheduleText,
                            logoUrl = logoUrl,
                            bannerUrl = bannerUrl,
                            acceptCashPayment = acceptCash,
                            acceptCardPayment = acceptCard,
                            acceptTransferPayment = acceptTransfer,
                            vatTaxPercentage = vatTax,
                            prepTimeMinutes = prepTime,
                            autoPrintOrders = autoPrint,
                            version = version,
                            checksumSha256 = checksum
                        )
                        computeDynamicReadiness(updated)
                    }
                }
            }

        // Listener 2: businesses/{id} (Sincronización en tiempo real con cambios Web / Admin)
        val bizRegistration = firestore.collection(BUSINESSES_COLLECTION).document(restaurantId)
            .addSnapshotListener { bizSnap, error ->
                if (error == null && bizSnap != null && bizSnap.exists()) {
                    val name = safeString(bizSnap, "name", "comercioNombre", "nombre") ?: currentSettings.commercialName
                    val description = safeString(bizSnap, "description", "descripcion") ?: currentSettings.description
                    val category = safeString(bizSnap, "category", "categoria") ?: currentSettings.category
                    val phone = safeString(bizSnap, "phone", "telefono") ?: currentSettings.phone
                    val address = safeString(bizSnap, "address", "direccion") ?: currentSettings.address
                    val fee = safeDouble(bizSnap, "deliveryFee", "costoEnvio") ?: currentSettings.deliveryFee
                    val minOrder = safeDouble(bizSnap, "minOrder", "minimumOrder", "ordenMinima") ?: currentSettings.minimumOrderAmount
                    val open = safeBoolean(bizSnap, "isOpen", "abierto") ?: currentSettings.isOpen
                    val radius = safeDouble(bizSnap, "deliveryRadiusKm", "maxDeliveryRadiusKm") ?: currentSettings.maxDeliveryRadiusKm
                    val deliveryTime = safeString(bizSnap, "deliveryTime", "tiempoEntrega") ?: currentSettings.deliveryTime
                    val schedule = safeString(bizSnap, "scheduleText", "schedule", "horario") ?: currentSettings.scheduleText
                    val logoUrl = safeString(bizSnap, "logoUrl", "photoUrl", "avatarUrl") ?: currentSettings.logoUrl
                    val bannerUrl = safeString(bizSnap, "bannerUrl", "coverUrl", "portadaUrl") ?: currentSettings.bannerUrl

                    emitUpdatedSettings { prev ->
                        val updated = prev.copy(
                            commercialName = name,
                            description = description,
                            category = category,
                            phone = phone,
                            address = address,
                            deliveryFee = fee,
                            minimumOrderAmount = minOrder,
                            isOpen = open,
                            maxDeliveryRadiusKm = radius,
                            deliveryTime = deliveryTime,
                            scheduleText = schedule,
                            logoUrl = logoUrl,
                            bannerUrl = bannerUrl
                        )
                        computeDynamicReadiness(updated)
                    }
                }
            }

        awaitClose {
            settingsRegistration.remove()
            bizRegistration.remove()
        }
    }

    private fun computeDynamicReadiness(settings: RestaurantSettings): RestaurantSettings {
        val items = listOf(
            com.example.domain.model.settings.ReadinessItem("check_info", "Nombre y Razón Social", isCompleted = settings.commercialName.isNotBlank(), weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_contact", "Teléfono y Dirección", isCompleted = settings.phone.isNotBlank() && settings.address.isNotBlank(), weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_schedule", "Horario Semanal Definido", isCompleted = settings.scheduleText.isNotBlank(), weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_delivery", "Tarifa y Cobertura Delivery", isCompleted = settings.deliveryFee > 0 && settings.maxDeliveryRadiusKm > 0, weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_payments", "Métodos de Pago Activos", isCompleted = settings.acceptCashPayment || settings.acceptCardPayment || settings.acceptTransferPayment, weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_branding", "Logo y Portada", isCompleted = settings.logoUrl.isNotBlank() || settings.bannerUrl.isNotBlank(), weight = 15),
            com.example.domain.model.settings.ReadinessItem("check_kds", "Cocina y Tiempos de Prep", isCompleted = settings.prepTimeMinutes > 0, weight = 10)
        )
        return settings.copy(readiness = com.example.domain.model.settings.ReadinessChecklist(items = items))
    }

    suspend fun saveRestaurantSettings(settings: RestaurantSettings): Result<Unit> {
        if (settings.restaurantId.isBlank()) return Result.failure(IllegalArgumentException("restaurantId no puede estar vacío"))
        val db = firestore ?: FirebaseFirestore.getInstance()
        return try {
            val settingsUpdates = mapOf(
                "restaurantId" to settings.restaurantId,
                "commercialName" to settings.commercialName,
                "legalName" to settings.legalName,
                "description" to settings.description,
                "category" to settings.category,
                "phone" to settings.phone,
                "whatsapp" to settings.whatsapp,
                "address" to settings.address,
                "deliveryFee" to settings.deliveryFee,
                "minimumOrderAmount" to settings.minimumOrderAmount,
                "deliveryRadiusKm" to settings.maxDeliveryRadiusKm,
                "freeDeliveryThreshold" to settings.freeDeliveryThreshold,
                "deliveryTime" to settings.deliveryTime,
                "isOpen" to settings.isOpen,
                "scheduleText" to settings.scheduleText,
                "logoUrl" to settings.logoUrl,
                "bannerUrl" to settings.bannerUrl,
                "acceptCashPayment" to settings.acceptCashPayment,
                "acceptCardPayment" to settings.acceptCardPayment,
                "acceptTransferPayment" to settings.acceptTransferPayment,
                "vatTaxPercentage" to settings.vatTaxPercentage,
                "prepTimeMinutes" to settings.prepTimeMinutes,
                "autoPrintOrders" to settings.autoPrintOrders,
                "version" to settings.version,
                "checksumSha256" to settings.checksumSha256,
                "updatedAt" to com.google.firebase.Timestamp.now()
            )

            val businessUpdates = mapOf(
                "name" to settings.commercialName,
                "nombre" to settings.commercialName,
                "comercioNombre" to settings.commercialName,
                "description" to settings.description,
                "descripcion" to settings.description,
                "category" to settings.category,
                "categoria" to settings.category,
                "phone" to settings.phone,
                "telefono" to settings.phone,
                "address" to settings.address,
                "direccion" to settings.address,
                "deliveryFee" to settings.deliveryFee,
                "costoEnvio" to settings.deliveryFee,
                "minOrder" to settings.minimumOrderAmount,
                "minimumOrder" to settings.minimumOrderAmount,
                "ordenMinima" to settings.minimumOrderAmount,
                "isOpen" to settings.isOpen,
                "abierto" to settings.isOpen,
                "deliveryRadiusKm" to settings.maxDeliveryRadiusKm,
                "deliveryTime" to settings.deliveryTime,
                "tiempoEntrega" to settings.deliveryTime,
                "schedule" to settings.scheduleText,
                "horario" to settings.scheduleText,
                "logoUrl" to settings.logoUrl,
                "photoUrl" to settings.logoUrl,
                "bannerUrl" to settings.bannerUrl,
                "coverUrl" to settings.bannerUrl,
                "portadaUrl" to settings.bannerUrl,
                "updatedAt" to com.google.firebase.Timestamp.now()
            )

            // 1. Escribir configuración operativa completa en /restaurant_settings/{id}
            db.collection(SETTINGS_COLLECTION).document(settings.restaurantId)
                .set(settingsUpdates, com.google.firebase.firestore.SetOptions.merge())
                .await()

            // 2. Proyectar/Sincronizar campos canónicos en /businesses/{id}
            db.collection(BUSINESSES_COLLECTION).document(settings.restaurantId)
                .set(businessUpdates, com.google.firebase.firestore.SetOptions.merge())
                .await()

            cachedSettings = computeDynamicReadiness(settings)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

