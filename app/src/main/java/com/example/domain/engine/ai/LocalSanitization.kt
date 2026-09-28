package com.example.domain.engine.ai

import com.example.data.CartItem
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.NearbyMerchantEngine
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.domain.model.ai.AIBusinessCard
import com.example.domain.model.ai.AIProductCard

/**
 * Capa de Sanitización y Reducción de Contexto Local (v2.2 Enterprise)
 *
 * INVARIANTE ABSOLUTA:
 * RAW INTERNAL OBJECT ≠ TOOL RESULT ≠ LLM CONTEXT
 *
 * Elimina:
 * - Costos, márgenes, códigos de impuestos internos
 * - Cuentas bancarias, taxId, configuraciones privadas de comercios
 * - Coordenadas GPS crudas (lat/lng)
 * - PII privada
 */
object LocalSanitization {

    fun sanitizeProductToCard(product: Product, businessName: String = ""): AIProductCard {
        val origPrice = product.originalPrice?.let { if (it > product.price) it else null }
        val resolvedImg = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
        val resolvedBizName = businessName.ifBlank { product.businessId }
        return AIProductCard(
            productId = product.id,
            businessId = product.businessId,
            businessName = resolvedBizName,
            name = product.name,
            description = product.description.take(200),
            price = product.price,
            originalPrice = origPrice,
            discountPercentage = product.discountPercentage,
            imageUrl = resolvedImg,
            rating = product.rating,
            isAvailable = product.status == ProductStatus.ACTIVE && !product.isHidden,
            hasRequiredOptions = product.optionGroups.any { it.isRequired }
        )
    }

    fun sanitizeBusinessToCard(biz: BusinessInfo): AIBusinessCard {
        val resolvedLogo = biz.getEffectiveLogoUrl().ifBlank { biz.getEffectiveBannerUrl() }
        return AIBusinessCard(
            businessId = biz.id,
            name = biz.getEffectiveName(),
            category = biz.getEffectiveCategory(),
            logoUrl = resolvedLogo,
            rating = biz.getEffectiveRating(),
            deliveryFee = biz.getEffectiveDeliveryFee(),
            isOpen = biz.getEffectiveIsOpen()
        )
    }

    // Keywords non-food compartidas entre helpers
    private val nonFoodQueryTerms = listOf(
        "laptop", "computadora", "ordenador", "pc ", " pc", "tablet", "ipad",
        "celular", "telefono", "smartphone", "iphone", "samsung", "android",
        "pantalla", "monitor", "teclado", "mouse", "audifonos", "auricular",
        "cargador", "cable", "memoria", "disco", "impresora", "router",
        "camara", "television", " tv ", "smart tv", "electrodomestico",
        "lavadora", "refrigeradora", "microondas", "licuadora", "plancha",
        "ropa", "camisa", "pantalon", "vestido", "zapato", "tenis", "zapatilla",
        "bolso", "cartera", "mochila", "accesorio", "joyeria", "reloj",
        "farmacia", "medicamento", "pastilla", "vitamina", "medicina",
        "ferreteria", "tornillo", "pintura", "cemento", "herramienta",
        "mueble", "sofa", "cama", "escritorio", "silla", "decoracion",
        "mascota", "perro", "gato"
    )

    /**
     * Detecta si la query original es de una categoría non-food.
     * PRIORITARIO: si la QUERY es non-food, el contexto siempre es neutro
     * aunque el upsell haya devuelto productos de comida.
     */
    private fun isQueryNonFood(query: String): Boolean {
        val q = query.lowercase().trim()
        val words = q.split("\\s+".toRegex()).filter { it.isNotBlank() }
        val exactMatchTerms = setOf("pc", "tv", "aio", "dell", "hp", "lenovo", "asus", "mac", "ram", "ssd")
        if (words.any { it in exactMatchTerms }) return true
        return nonFoodQueryTerms.any { q.contains(it) }
    }

    /**
     * Determina el label de ítem según la categoría de los resultados O la query.
     * La query tiene prioridad: si el usuario preguntó por "laptop", usamos
     * lenguaje neutro aunque los resultados de upsell sean de comida.
     */
    private fun resolveItemLabel(query: String = "", results: List<CustomerSearchResult>): String {
        // 1. La query manda — si es non-food, lenguaje neutro
        if (query.isNotBlank() && isQueryNonFood(query)) return "productos"

        // 2. Si no hay query clara, revisamos la categoría de los resultados
        val nonFoodResultKeywords = listOf(
            "tecnolog", "tech", "electr", "computad", "celular", "laptop", "tablet",
            "ropa", "moda", "telas", "calzado", "zapatos", "accesori",
            "farmacia", "medicament", "salud", "drogueria",
            "ferreteria", "herramienta", "construcci",
            "librer", "papeler", "escolar",
            "hogar", "mueble", "decoraci", "mascota", "veterinar"
        )
        val categories = results.mapNotNull {
            (it.rawItem as? BusinessInfo)?.getEffectiveCategory()
        }.map { it.lowercase() }
        val subtitles = results.map { it.subtitle.lowercase() }
        val combined = (categories + subtitles).joinToString(" ")
        return if (nonFoodResultKeywords.any { kw -> combined.contains(kw) }) "productos" else "platos"
    }

    fun sanitizeSearchResultsToContext(
        results: List<CustomerSearchResult>,
        query: String = "",
        maxItems: Int = 6,
        introOverride: String? = null
    ): String {
        if (results.isEmpty()) return "No encontré productos o comercios disponibles que coincidan con tu búsqueda en BlueSystem."
        val topResults = results.take(maxItems)

        val singleBusiness = topResults.map { it.businessName }.filter { it.isNotBlank() }.distinct()
        val hasDiscounts = topResults.any { it.discountTag != null || (it.originalPrice != null && it.originalPrice > (it.price ?: 0.0)) }
        val isBusinessList = topResults.all { it.type == CustomerSearchResultType.BUSINESS }
        val itemLabel = resolveItemLabel(query, topResults)

        val intro = introOverride ?: when {
            isBusinessList -> "Encontré estos comercios disponibles cerca de ti:"
            singleBusiness.size == 1 -> "Estos son los $itemLabel disponibles en ${singleBusiness.first()}:"
            hasDiscounts -> "Estas son las ofertas destacadas que encontré hoy 🔥:"
            else -> "Encontré estas opciones disponibles para ti:"
        }

        return buildString {
            append("$intro\n\n")
            topResults.forEach { res ->
                append("• ${res.title}")
                if (res.price != null && res.price > 0) {
                    append(" — C$ ${String.format(java.util.Locale.US, "%.2f", res.price)}")
                    if (res.originalPrice != null && res.originalPrice > res.price) {
                        val disc = (((res.originalPrice - res.price) / res.originalPrice) * 100).toInt()
                        append(" ($disc% off)")
                    } else if (!res.discountTag.isNullOrBlank()) {
                        append(" (${res.discountTag})")
                    }
                }
                if (singleBusiness.size > 1 && res.businessName.isNotBlank()) {
                    append(" (${res.businessName})")
                } else if (res.type == CustomerSearchResultType.BUSINESS) {
                    val statusStr = if (res.isAvailable) "Abierto" else "Cerrado"
                    append(" (${res.subtitle} • $statusStr)")
                }
                append("\n")
            }
            append("\nSi quieres, toca cualquiera de las opciones para ver más detalles o pedir directamente.")
        }.trimEnd()
    }

    /**
     * Construye un contexto comercial proactivo cuando el usuario consulta por un producto
     * o categoría que no existe directamente en el catálogo, guiándolo hacia productos
     * afines, combos y promociones activas (Upselling Ético).
     */
    fun sanitizeUpsellResultsToContext(
        query: String,
        results: List<CustomerSearchResult>,
        isCategoryAffinity: Boolean = false,
        maxItems: Int = 6
    ): String {
        val cleanQuery = query.trim()
        if (results.isEmpty()) {
            return "No encontré \"$cleanQuery\" disponibles en este momento en BlueSystem Delivery."
        }

        val topResults = results.take(maxItems)
        val singleBusiness = topResults.map { it.businessName }.filter { it.isNotBlank() }.distinct()
        // La QUERY tiene prioridad sobre los resultados para determinar el tono
        val queryIsNonFood = isQueryNonFood(cleanQuery)

        val intro = if (isCategoryAffinity) {
            if (!queryIsNonFood) {
                "Por el momento no encontré \"$cleanQuery\" directamente, pero te sugiero estas opciones similares que te van a encantar 😋:"
            } else {
                "Por el momento no encontré \"$cleanQuery\" en nuestros comercios, pero aquí tienes lo que tenemos disponible hoy:"
            }
        } else {
            if (!queryIsNonFood) {
                "En este momento no contamos con \"$cleanQuery\" disponible.\n\n¡Pero no te quedes con las ganas! Échale un vistazo a las mejores opciones y promociones activas hoy en BlueSystem Delivery 🔥:"
            } else {
                "En este momento no encontramos \"$cleanQuery\" en nuestros comercios afiliados.\n\nAquí tienes lo que está disponible hoy en BlueSystem Delivery:"
            }
        }

        return buildString {
            append("$intro\n\n")
            topResults.forEach { res ->
                append("• ${res.title}")
                if (res.price != null && res.price > 0) {
                    append(" — C$ ${String.format(java.util.Locale.US, "%.2f", res.price)}")
                    if (res.originalPrice != null && res.originalPrice > res.price) {
                        val disc = (((res.originalPrice - res.price) / res.originalPrice) * 100).toInt()
                        append(" ($disc% off)")
                    } else if (!res.discountTag.isNullOrBlank()) {
                        append(" (${res.discountTag})")
                    }
                }
                if (singleBusiness.size > 1 && res.businessName.isNotBlank()) {
                    append(" (${res.businessName})")
                }
                append("\n")
            }
            append("\nSi quieres, toca cualquiera de las opciones para ver más detalles o pedir directamente.")
        }.trimEnd()
    }

    fun sanitizeNearbyMerchantsToContext(
        nearbyList: List<NearbyMerchantEngine.NearbyBusinessItem>,
        maxItems: Int = 5
    ): String {
        if (nearbyList.isEmpty()) return "No hay comercios cercanos disponibles en el radio de cobertura."
        val topNearby = nearbyList.take(maxItems)
        return buildString {
            append("Comercios cercanos disponibles (${topNearby.size}):\n\n")
            topNearby.forEach { item ->
                append("• ${item.business.getEffectiveName()}")
                append(" a ${String.format(java.util.Locale.US, "%.1f", item.distanceKm)} km")
                if (item.business.getEffectiveDeliveryFee() > 0) {
                    append(" (Envío C$ ${item.business.getEffectiveDeliveryFee().toInt()})")
                } else {
                    append(" (Envío Gratis)")
                }
                append("\n")
            }
        }.trimEnd()
    }

    fun sanitizeCartToContext(
        cartItems: List<CartItem>,
        subtotal: Double
    ): String {
        if (cartItems.isEmpty()) return "Tu carrito de compras está vacío."
        return buildString {
            append("Estado de tu carrito (${cartItems.size} ítems, Subtotal C$ ${String.format(java.util.Locale.US, "%.2f", subtotal)}):\n\n")
            cartItems.forEach { item ->
                append("• ${item.quantity}x ${item.productName} — C$ ${String.format(java.util.Locale.US, "%.2f", item.unitPriceWithExtras * item.quantity)}")
                if (item.selectedOptions.isNotEmpty()) {
                    append(" (${item.selectedOptions.size} opciones seleccionadas)")
                }
                append("\n")
            }
        }.trimEnd()
    }
}
