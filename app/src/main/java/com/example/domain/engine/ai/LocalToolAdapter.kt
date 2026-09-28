package com.example.domain.engine.ai

import com.example.BranchItem
import com.example.data.CartManager
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.NearbyMerchantEngine
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.engine.intelligence.EnterpriseSearchEngine
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.domain.model.Promotion
import com.example.domain.model.ai.*
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.SelectedOption

/**
 * Proveedor de Datos de Catálogo en Memoria/Caché para Herramientas Locales
 */
interface CatalogDataProvider {
    fun getProducts(): List<Product>
    fun getCombos(): List<MenuCombo> = emptyList()
    fun getPromotions(): List<Promotion> = emptyList()
    fun getProductById(productId: String): Product? = getProducts().firstOrNull { it.id == productId }
}

/**
 * Proveedor de Datos de Comercios en Memoria/Caché para Herramientas Locales
 */
interface BusinessDataProvider {
    fun getBusinesses(): List<BusinessInfo>
    fun getBranches(): List<BranchItem> = emptyList()
    fun getBusinessById(businessId: String): BusinessInfo? = getBusinesses().firstOrNull { it.id == businessId }
}

/**
 * Interfaz Base para Adaptadores de Herramientas Locales (v2.2 Enterprise)
 */
sealed interface LocalToolAdapter {
    val toolId: String
    suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult
}

// 1. tool_search_products
class SearchProductsAdapter(
    private val searchEngine: EnterpriseSearchEngine = EnterpriseSearchEngine,
    private val catalogProvider: CatalogDataProvider,
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_search_products"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val query = parameters["query"]?.toString().orEmpty()
        if (query.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Debe proporcionar un término de búsqueda.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "Término de búsqueda vacío")
            )
        }

        val allResults = searchEngine.searchCatalog(
            query = query,
            businesses = businessProvider.getBusinesses(),
            products = catalogProvider.getProducts(),
            combos = catalogProvider.getCombos(),
            promotions = catalogProvider.getPromotions()
        )

        val productResults = allResults.products
        val directResults = if (productResults.isNotEmpty()) {
            productResults
        } else {
            allResults.businesses
        }

        val isFallback: Boolean
        val effectiveResults: List<CustomerSearchResult>
        val introOverride: String?

        val allowFallback = parameters["allowFallback"]?.toString().equals("true", ignoreCase = true)

        if (directResults.isNotEmpty()) {
            isFallback = false
            effectiveResults = directResults
            introOverride = null
        } else if (!allowFallback) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.COMPLETED,
                success = true,
                sanitizedLlmContext = "No encontré productos o comercios disponibles que coincidan con tu búsqueda \"$query\".",
                rawOutputSummary = "0 coincidencias para '$query'",
                cards = emptyList(),
                uiPayload = mapOf("count" to "0", "query" to query)
            )
        } else {
            isFallback = true
            // 1. Intentar búsqueda por afinidad de categoría
            val affinityQuery = findCategoryAffinityQuery(query)
            val affinityResults = if (!affinityQuery.isNullOrBlank()) {
                val affSearch = searchEngine.searchCatalog(
                    query = affinityQuery,
                    businesses = businessProvider.getBusinesses(),
                    products = catalogProvider.getProducts(),
                    combos = catalogProvider.getCombos(),
                    promotions = catalogProvider.getPromotions()
                )
                if (affSearch.products.isNotEmpty()) affSearch.products else affSearch.businesses
            } else emptyList()

            if (affinityResults.isNotEmpty()) {
                effectiveResults = affinityResults
                val qNorm = EnterpriseSearchEngine.normalizeForSearch(query)
                val isTech = qNorm.contains("laptop") || qNorm.contains("comput") || qNorm.contains("pc") || qNorm.contains("tecnolog")
                introOverride = if (isTech) {
                    "No encontré \"$query\" en este momento, pero te recomiendo estas opciones afines de tecnología en BlueSystem:"
                } else {
                    "No encontré \"$query\" en este momento, pero te recomiendo estas opciones afines disponibles en BlueSystem:"
                }
            } else {
                // 2. Regla Maestra: Si no hay nada similar, enviar ofertas o productos destacados (NUNCA DEJAR SIN PRODUCTOS)
                val upsellResults = getUpsellRecommendations(catalogProvider, businessProvider, limit = 6)
                effectiveResults = upsellResults
                val qNorm = EnterpriseSearchEngine.normalizeForSearch(query)
                val isTech = qNorm.contains("laptop") || qNorm.contains("comput") || qNorm.contains("pc") || qNorm.contains("tecnolog")
                introOverride = if (isTech) {
                    "No encontré \"$query\" disponible en catálogo, pero aquí tienes las mejores ofertas y productos disponibles en BlueSystem:"
                } else {
                    "No encontré \"$query\" en este momento, pero te recomiendo estas deliciosas ofertas y productos disponibles en BlueSystem:"
                }
            }
        }

        if (effectiveResults.isEmpty()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.COMPLETED,
                success = true,
                sanitizedLlmContext = "No encontré productos o comercios disponibles que coincidan con tu búsqueda \"$query\".",
                rawOutputSummary = "0 coincidencias para '$query'",
                cards = emptyList(),
                uiPayload = mapOf("count" to "0", "query" to query)
            )
        }

        val sanitizedContext = LocalSanitization.sanitizeSearchResultsToContext(
            results = effectiveResults,
            query = query,
            introOverride = introOverride
        )
        val cards: List<AICard> = effectiveResults.take(6).mapNotNull { res ->
            when (val raw = res.rawItem) {
                is Product -> LocalSanitization.sanitizeProductToCard(raw, res.businessName)
                is BusinessInfo -> LocalSanitization.sanitizeBusinessToCard(raw)
                else -> null
            }
        }

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = if (isFallback) "Recomendaciones afines/ofertas para '$query'" else "Encontrados ${directResults.size} resultados",
            cards = cards,
            uiPayload = mapOf("count" to effectiveResults.size.toString(), "query" to query, "isFallback" to isFallback.toString())
        )
    }

    private fun findCategoryAffinityQuery(query: String): String? {
        val q = EnterpriseSearchEngine.normalizeForSearch(query)

        // GUARD: Si la query es claramente NON-FOOD, no sugerir afinidades de comida.
        // El upsell genérico mostrará los productos activos del catálogo real.
        val nonFoodTerms = listOf(
            "laptop", "computadora", "pc", "tablet", "celular", "telefono", "smartphone",
            "pantalla", "monitor", "teclado", "mouse", "audifonos", "auricular", "cargador",
            "cable", "memoria", "disco", "impresora", "router", "camara", "television", "tv",
            "electrodomestico", "lavadora", "refrigeradora", "microondas",
            "ropa", "camisa", "pantalon", "vestido", "zapato", "tenis", "zapatilla", "bolso",
            "farmacia", "medicamento", "pastilla", "vitamina",
            "ferreteria", "tornillo", "pintura", "cemento",
            "mueble", "sofa", "cama", "escritorio", "silla",
            "mascota", "perro", "gato", "alimento_mascota"
        )
        if (nonFoodTerms.any { q.contains(it) }) return null

        return when {
            q.contains("pan") || q.contains("baguette") || q.contains("tostad") -> "desayuno postre hamburguesa"
            q.contains("frijol") || q.contains("pinto") || q.contains("nacatamal") -> "cerdo res tipica tradicional"
            q.contains("carne") || q.contains("asado") || q.contains("parrill") -> "res cerdo mixto asado"
            q.contains("dulce") || q.contains("postre") || q.contains("pastel") || q.contains("helad") -> "postre batido refresco"
            q.contains("cafe") || q.contains("te") || q.contains("jugo") || q.contains("gaseos") || q.contains("soda") -> "bebida refresco batido"
            q.contains("pescad") || q.contains("marisc") || q.contains("camaron") -> "almuerzo cena plato"
            q.contains("sushi") || q.contains("ramen") -> "arroz mixto"
            q.contains("pizza") || q.contains("calzone") -> "queso comida rapida"
            q.contains("hamburgues") || q.contains("burger") -> "combo frito tacos"
            q.contains("taco") || q.contains("burrito") -> "fritanga tacos mixto"
            q.contains("pollo") || q.contains("alitas") -> "frito mixto almuerzo"
            else -> null
        }
    }

    private fun getUpsellRecommendations(
        catalogProvider: CatalogDataProvider,
        businessProvider: BusinessDataProvider,
        limit: Int = 6
    ): List<CustomerSearchResult> {
        val businesses = businessProvider.getBusinesses().filter { it.getEffectiveIsActive() }
        val bizMap = businesses.associateBy { it.id }
        val products = catalogProvider.getProducts().filter {
            it.businessId in bizMap.keys && it.status == ProductStatus.ACTIVE && !it.isHidden
        }

        // 1. Productos con descuento activo (los más atractivos para el cliente)
        val deals = products.filter {
            (it.discountPercentage > 0) || ((it.originalPrice ?: 0.0) > it.price)
        }.sortedWith(
            compareByDescending<Product> {
                if (it.discountPercentage > 0) it.discountPercentage
                else if ((it.originalPrice ?: 0.0) > it.price) (((it.originalPrice!! - it.price) / it.originalPrice!!) * 100.0)
                else 0.0
            }.thenByDescending { it.rating }
        )

        // 2. Productos populares / más vendidos / recomendados
        val popular = products.filter {
            it.isTopSeller || it.isPopular || it.isRecommended
        }.sortedByDescending { it.rating }

        // 3. Productos activos generales ordenados por rating
        val general = products.sortedWith(
            compareByDescending<Product> { it.rating }.thenBy { it.price }
        )

        val selected = (deals + popular + general).distinctBy { it.id }.take(limit)

        return selected.map { prod ->
            val biz = bizMap[prod.businessId]
            val bizName = biz?.getEffectiveName()?.ifBlank { "Comercio" } ?: "Comercio"
            val discTag = if (prod.discountPercentage > 0) "-${prod.discountPercentage.toInt()}%"
            else if ((prod.originalPrice ?: 0.0) > prod.price) {
                val pct = (((prod.originalPrice!! - prod.price) / prod.originalPrice!!) * 100).toInt()
                "-$pct%"
            } else null

            CustomerSearchResult(
                id = prod.id,
                type = CustomerSearchResultType.PRODUCT,
                title = prod.name,
                subtitle = bizName,
                description = prod.description.ifBlank { prod.shortDescription },
                imageUrl = prod.getMainImage(),
                price = prod.price,
                originalPrice = prod.originalPrice,
                discountTag = discTag,
                businessId = prod.businessId,
                businessName = bizName,
                rating = prod.rating,
                isAvailable = true,
                rawItem = prod
            )
        }
    }
}

// 2. tool_search_businesses
class SearchBusinessesAdapter(
    private val searchEngine: EnterpriseSearchEngine = EnterpriseSearchEngine,
    private val businessProvider: BusinessDataProvider,
    private val catalogProvider: CatalogDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_search_businesses"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val query = parameters["query"]?.toString().orEmpty()
        if (query.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Debe proporcionar un nombre o categoría de comercio.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "Término de búsqueda vacío")
            )
        }

        val allResults = searchEngine.searchCatalog(
            query = query,
            businesses = businessProvider.getBusinesses(),
            products = catalogProvider.getProducts(),
            combos = catalogProvider.getCombos(),
            promotions = catalogProvider.getPromotions()
        )

        val businessResults = allResults.businesses
        val directResults = if (businessResults.isNotEmpty()) {
            businessResults
        } else {
            allResults.products
        }

        if (directResults.isEmpty()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.COMPLETED,
                success = true,
                sanitizedLlmContext = "No encontré comercios o restaurantes disponibles que coincidan con tu búsqueda \"$query\".",
                rawOutputSummary = "0 coincidencias para '$query'",
                cards = emptyList(),
                uiPayload = mapOf("count" to "0", "query" to query)
            )
        }

        val sanitizedContext = LocalSanitization.sanitizeSearchResultsToContext(directResults)
        val cards: List<AICard> = directResults.take(6).mapNotNull { res ->
            when (val raw = res.rawItem) {
                is BusinessInfo -> LocalSanitization.sanitizeBusinessToCard(raw)
                is Product -> LocalSanitization.sanitizeProductToCard(raw, res.businessName)
                else -> null
            }
        }

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Encontrados ${directResults.size} resultados",
            cards = cards,
            uiPayload = mapOf("count" to directResults.size.toString(), "query" to query)
        )
    }
}

// 3. tool_resolve_catalog_entity
class ResolveCatalogEntityAdapter(
    private val searchEngine: EnterpriseSearchEngine = EnterpriseSearchEngine,
    private val catalogProvider: CatalogDataProvider,
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_resolve_catalog_entity"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val entityName = parameters["entityName"]?.toString().orEmpty()
        if (entityName.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Nombre de entidad no especificado para resolver.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "Entidad vacía")
            )
        }

        val allResults = searchEngine.searchCatalog(
            query = entityName,
            businesses = businessProvider.getBusinesses(),
            products = catalogProvider.getProducts(),
            combos = catalogProvider.getCombos(),
            promotions = catalogProvider.getPromotions()
        )

        val topMatch = allResults.allUnified.firstOrNull()
        if (topMatch == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "No se pudo resolver ninguna entidad para: '$entityName'.",
                error = AIError(AIErrorCode.PRODUCT_NOT_FOUND, "Entidad no encontrada")
            )
        }

        val typeStr = topMatch.type.name
        val sanitizedContext = "Entidad resuelta: [${topMatch.typeLabel}] ${topMatch.title} (ID: ${topMatch.id}, Comercio: ${topMatch.businessName})"

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Resuelto a ${topMatch.id}",
            uiPayload = mapOf(
                "resolvedId" to topMatch.id,
                "type" to typeStr,
                "title" to topMatch.title,
                "businessId" to topMatch.businessId
            )
        )
    }
}

// 4. tool_get_product_detail
class GetProductDetailAdapter(
    private val catalogProvider: CatalogDataProvider,
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_get_product_detail"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val productId = parameters["productId"]?.toString().orEmpty()
        if (productId.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "ID de producto requerido.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "productId faltante")
            )
        }

        val product = catalogProvider.getProductById(productId)
        if (product == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Producto no encontrado en catálogo (ID: $productId).",
                error = AIError(AIErrorCode.PRODUCT_NOT_FOUND, "Producto no existe")
            )
        }

        val biz = businessProvider.getBusinessById(product.businessId)
        val card = LocalSanitization.sanitizeProductToCard(product, biz?.getEffectiveName().orEmpty())
        val optionsSummary = if (product.optionGroups.isNotEmpty()) {
            "Opciones: " + product.optionGroups.joinToString("; ") { grp ->
                "${grp.name}${if (grp.isRequired) " (Obligatorio)" else ""}: [${grp.options.joinToString { it.name }}]"
            }
        } else "Sin opciones configurables."

        val sanitizedContext = "Detalle de Producto:\n- Nombre: ${card.name}\n- Precio: C$ ${card.price.toInt()}\n- Comercio: ${card.businessName}\n- Disponible: ${if (card.isAvailable) "Sí" else "No"}\n- $optionsSummary"

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Producto $productId recuperado",
            cards = listOf(card),
            uiPayload = mapOf("productId" to card.productId, "businessId" to card.businessId, "price" to card.price.toString())
        )
    }
}

// 5. tool_get_business_detail
class GetBusinessDetailAdapter(
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_get_business_detail"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val businessId = parameters["businessId"]?.toString().orEmpty()
        if (businessId.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "ID de comercio requerido.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "businessId faltante")
            )
        }

        val biz = businessProvider.getBusinessById(businessId)
        if (biz == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Comercio no encontrado (ID: $businessId).",
                error = AIError(AIErrorCode.BUSINESS_NOT_FOUND, "Comercio no existe")
            )
        }

        val card = LocalSanitization.sanitizeBusinessToCard(biz)
        val sanitizedContext = "Detalle del Comercio:\n- Nombre: ${card.name}\n- Categoría: ${card.category}\n- Calificación: ${card.rating}⭐\n- Tarifa de Entrega: C$ ${card.deliveryFee.toInt()}\n- Estado: ${if (card.isOpen) "Abierto" else "Cerrado"}"

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Comercio $businessId recuperado",
            cards = listOf(card),
            uiPayload = mapOf("businessId" to card.businessId, "isOpen" to card.isOpen.toString())
        )
    }
}

// 6. tool_get_nearby_businesses
class GetNearbyBusinessesAdapter(
    private val nearbyEngine: NearbyMerchantEngine = NearbyMerchantEngine,
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_get_nearby_businesses"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val lat = (parameters["lat"] as? Number)?.toDouble() ?: context.customerLat
        val lng = (parameters["lng"] as? Number)?.toDouble() ?: context.customerLng

        if (lat == null || lng == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "No se dispone de coordenadas para calcular comercios cercanos.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "Ubicación del cliente no disponible")
            )
        }

        val result = nearbyEngine.findNearbyMerchants(
            customerLat = lat,
            customerLng = lng,
            businesses = businessProvider.getBusinesses(),
            branches = businessProvider.getBranches()
        )

        val sanitizedContext = LocalSanitization.sanitizeNearbyMerchantsToContext(result.items)
        val cards = result.items.take(6).map { LocalSanitization.sanitizeBusinessToCard(it.business) }

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Encontrados ${result.items.size} comercios en radio ${result.activeRadiusKm}km",
            cards = cards,
            uiPayload = mapOf("count" to result.items.size.toString(), "radiusKm" to result.activeRadiusKm.toString())
        )
    }
}

// 7. tool_get_cart
class GetCartAdapter(
    private val cartManager: CartManager = CartManager
) : LocalToolAdapter {
    override val toolId: String = "tool_get_cart"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val items = cartManager.cartItems.value
        val subtotal = cartManager.subtotal
        val sanitizedContext = LocalSanitization.sanitizeCartToContext(items, subtotal)

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Carrito con ${items.size} ítems, subtotal C$ ${subtotal.toInt()}",
            uiPayload = mapOf("itemCount" to items.size.toString(), "subtotal" to subtotal.toString())
        )
    }
}

// 8. tool_add_to_cart
class AddToCartAdapter(
    private val cartManager: CartManager = CartManager,
    private val catalogProvider: CatalogDataProvider,
    private val businessProvider: BusinessDataProvider
) : LocalToolAdapter {
    override val toolId: String = "tool_add_to_cart"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val productId = parameters["productId"]?.toString().orEmpty()
        val quantity = (parameters["quantity"] as? Number)?.toInt() ?: 1

        if (productId.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "ID de producto requerido para agregar al carrito.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "productId faltante")
            )
        }

        val product = catalogProvider.getProductById(productId)
        if (product == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "Producto no encontrado en el catálogo (ID: $productId).",
                error = AIError(AIErrorCode.PRODUCT_NOT_FOUND, "Producto no existe")
            )
        }

        // Validación de opciones requeridas
        if (product.optionGroups.any { it.isRequired }) {
            // Requiere desambiguación si no vienen opciones
            val hasOptions = parameters["selectedOptions"] != null
            if (!hasOptions) {
                return ToolResult(
                    toolId = toolId,
                    status = ToolResultStatus.REQUIRES_DISAMBIGUATION,
                    success = false,
                    sanitizedLlmContext = "El producto '${product.name}' tiene opciones obligatorias que deben seleccionarse antes de agregar al carrito.",
                    error = AIError(AIErrorCode.REQUIRED_OPTIONS_MISSING, "Opciones obligatorias pendientes", requiresClarification = true)
                )
            }
        }

        val biz = businessProvider.getBusinessById(product.businessId)

        // Invoca mutación atómica autoritativa en CartManager
        cartManager.addToCart(
            productId = product.id,
            productName = product.name,
            price = product.price, // Precio AUTORITATIVO del catálogo, nunca del LLM
            quantity = quantity.coerceAtLeast(1),
            businessId = product.businessId,
            businessName = biz?.getEffectiveName().orEmpty(),
            imageUrl = product.imageUrl
        )

        val updatedSubtotal = cartManager.subtotal
        val sanitizedContext = "Se agregó ${quantity}x '${product.name}' al carrito. Subtotal actual: C$ ${updatedSubtotal.toInt()}."

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Agregado $productId qty=$quantity",
            uiPayload = mapOf("productId" to product.id, "quantity" to quantity.toString(), "newSubtotal" to updatedSubtotal.toString())
        )
    }
}

// 9. tool_update_cart_quantity
class UpdateCartQuantityAdapter(
    private val cartManager: CartManager = CartManager
) : LocalToolAdapter {
    override val toolId: String = "tool_update_cart_quantity"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val productId = parameters["productId"]?.toString().orEmpty()
        val action = parameters["action"]?.toString() ?: "increment"

        if (productId.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "ID de producto requerido.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "productId faltante")
            )
        }

        val existingItem = cartManager.cartItems.value.firstOrNull { it.productId == productId }
        if (existingItem == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "El producto no está en el carrito.",
                error = AIError(AIErrorCode.PRODUCT_NOT_FOUND, "Ítem no está en el carrito")
            )
        }

        if (action == "decrement") {
            cartManager.decrementQuantity(productId)
        } else {
            cartManager.incrementQuantity(productId)
        }

        val updatedSubtotal = cartManager.subtotal
        val sanitizedContext = "Cantidad actualizada para '${existingItem.productName}'. Subtotal actual: C$ ${updatedSubtotal.toInt()}."

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Actualizada cantidad para $productId ($action)",
            uiPayload = mapOf("productId" to productId, "subtotal" to updatedSubtotal.toString())
        )
    }
}

// 10. tool_remove_from_cart
class RemoveFromCartAdapter(
    private val cartManager: CartManager = CartManager
) : LocalToolAdapter {
    override val toolId: String = "tool_remove_from_cart"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        val productId = parameters["productId"]?.toString().orEmpty()
        if (productId.isBlank()) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "ID de producto requerido para remover del carrito.",
                error = AIError(AIErrorCode.INVALID_ARGUMENT, "productId faltante")
            )
        }

        val existingItem = cartManager.cartItems.value.firstOrNull { it.productId == productId }
        if (existingItem == null) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.FAILED,
                success = false,
                sanitizedLlmContext = "El producto no está en el carrito.",
                error = AIError(AIErrorCode.PRODUCT_NOT_FOUND, "Ítem no está en el carrito")
            )
        }

        cartManager.removeItem(productId)
        val updatedSubtotal = cartManager.subtotal
        val sanitizedContext = "Se removió '${existingItem.productName}' del carrito. Subtotal actual: C$ ${updatedSubtotal.toInt()}."

        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = "Removido $productId",
            uiPayload = mapOf("productId" to productId, "subtotal" to updatedSubtotal.toString())
        )
    }
}

// 11. tool_clear_cart (Level 3 - Confirmation Gated)
class ClearCartAdapter(
    private val cartManager: CartManager = CartManager
) : LocalToolAdapter {
    override val toolId: String = "tool_clear_cart"

    override suspend fun execute(parameters: Map<String, Any?>, context: LocalExecutionContext): ToolResult {
        // INVARIANTE DE SEGURIDAD: Requiere confirmación humana explícita
        if (!context.confirmedByUser) {
            return ToolResult(
                toolId = toolId,
                status = ToolResultStatus.REQUIRES_CONFIRMATION,
                success = false,
                sanitizedLlmContext = "Vaciar el carrito requiere confirmación explícita del usuario.",
                error = AIError(
                    code = AIErrorCode.CONFIRMATION_REQUIRED,
                    userMessage = "¿Estás seguro de que deseas vaciar el carrito?",
                    recoverable = true,
                    requiresClarification = true,
                    suggestedAction = "REQUEST_CLEAR_CART_CONFIRMATION"
                )
            )
        }

        cartManager.clear()
        return ToolResult(
            toolId = toolId,
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = "El carrito ha sido vaciado exitosamente.",
            rawOutputSummary = "Carrito vaciado",
            uiPayload = mapOf("cleared" to "true")
        )
    }
}
