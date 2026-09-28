package com.example.domain.engine.intelligence

import com.example.BranchItem
import com.example.FeaturedProduct
import com.example.Usuario
import com.example.data.repository.BusinessInfo
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.domain.model.Promotion
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuComboStatus

enum class CustomerSearchResultType {
    BUSINESS,
    PRODUCT,
    COMBO,
    PROMOTION
}

data class CustomerSearchResult(
    val id: String,
    val type: CustomerSearchResultType,
    val title: String,
    val subtitle: String = "",
    val description: String = "",
    val imageUrl: String = "",
    val price: Double? = null,
    val originalPrice: Double? = null,
    val discountTag: String? = null,
    val businessId: String = "",
    val businessName: String = "",
    val branchId: String = "",
    val categoryName: String = "",
    val rating: Double = 0.0,
    val isAvailable: Boolean = true,
    val relevanceScore: Int = 0,
    val rawItem: Any? = null,
    val badgeLabel: String = "",
    val badgeEmoji: String = ""
) {
    val formattedPrice: String?
        get() = price?.let { "C$ ${it.toInt()}" }

    val formattedOriginalPrice: String?
        get() = originalPrice?.let { "C$ ${it.toInt()}" }

    val typeLabel: String
        get() = when (type) {
            CustomerSearchResultType.BUSINESS -> "COMERCIO"
            CustomerSearchResultType.PRODUCT -> "PLATO"
            CustomerSearchResultType.COMBO -> "COMBO"
            CustomerSearchResultType.PROMOTION -> "PROMOCIÓN"
        }

    val typeEmoji: String
        get() = when (type) {
            CustomerSearchResultType.BUSINESS -> "🏪"
            CustomerSearchResultType.PRODUCT -> "🍔"
            CustomerSearchResultType.COMBO -> "🍱"
            CustomerSearchResultType.PROMOTION -> "🎁"
        }

    val effectiveBadgeLabel: String
        get() = badgeLabel.ifBlank { typeLabel }

    val effectiveBadgeEmoji: String
        get() = badgeEmoji.ifBlank { typeEmoji }
}

data class CustomerSearchResults(
    val query: String = "",
    val businesses: List<CustomerSearchResult> = emptyList(),
    val products: List<CustomerSearchResult> = emptyList(),
    val combos: List<CustomerSearchResult> = emptyList(),
    val promotions: List<CustomerSearchResult> = emptyList(),
    val allUnified: List<CustomerSearchResult> = emptyList(),
    val totalCount: Int = 0
)

data class SearchResults(
    val matchedBusinesses: List<Usuario> = emptyList(),
    val matchedProducts: List<FeaturedProduct> = emptyList(),
    val matchedBranches: List<BranchItem> = emptyList(),
    val totalCount: Int = 0
)

object EnterpriseSearchEngine {

    /**
     * Normaliza cadenas de texto para búsqueda: minúsculas, eliminación de acentos/diacríticos y espacios.
     */
    fun normalizeForSearch(text: String?): String {
        if (text.isNullOrBlank()) return ""
        var norm = text.trim().lowercase()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ü", "u")
            .replace("ñ", "n")

        // De-duplicación de palabras pegadas por el LLM (ej. "tacostacos" -> "tacos")
        if (norm.length >= 6 && norm.length % 2 == 0) {
            val half = norm.length / 2
            if (norm.substring(0, half) == norm.substring(half)) {
                norm = norm.substring(0, half)
            }
        }
        return norm
    }

    private fun matchesTokenBoundary(target: String, token: String): Boolean {
        if (target.isBlank() || token.isBlank()) return false
        return if (token.length <= 4) {
            val pattern = "(^|[^a-z0-9])${Regex.escape(token)}([^a-z0-9]|$)"
            Regex(pattern).containsMatchIn(target)
        } else {
            target.contains(token)
        }
    }

    /**
     * Calcula el score de relevancia de una entidad para una consulta normalizada.
     */
    private fun calculateRelevanceScore(
        queryNorm: String,
        titleNorm: String,
        descriptionNorm: String = "",
        categoryNorm: String = "",
        extraNorm: String = "",
        hasDiscount: Boolean = false,
        isPopular: Boolean = false
    ): Int {
        if (queryNorm.isEmpty() || titleNorm.isEmpty()) return 0
        var score = 0

        val isPromoQuery = queryNorm.contains("promo") || queryNorm.contains("oferta") || 
                           queryNorm.contains("descuento") || queryNorm.contains("rebaja")
        if (isPromoQuery && hasDiscount) {
            score += 150
        }

        val isCheapQuery = queryNorm.contains("barato") || queryNorm.contains("barata") || 
                           queryNorm.contains("economico") || queryNorm.contains("economica") || 
                           queryNorm.contains("precio bajo") || queryNorm.contains("sin gastar")
        if (isCheapQuery) {
            score += 40
        }

        val isPopularQuery = queryNorm.contains("popular") || queryNorm.contains("mas vendido") || 
                             queryNorm.contains("top")
        if (isPopularQuery && isPopular) {
            score += 80
        }

        val isGenericFoodQuery = queryNorm in listOf("comida", "plato", "platos", "menu", "almuerzo", "cena", "desayuno", "catalogo", "todos")
        if (isGenericFoodQuery) {
            score += 30
        }

        val qStem = if (queryNorm.endsWith("s") && queryNorm.length > 3) queryNorm.dropLast(1) else queryNorm
        val tStem = if (titleNorm.endsWith("s") && titleNorm.length > 3) titleNorm.dropLast(1) else titleNorm
        val cStem = if (categoryNorm.endsWith("s") && categoryNorm.length > 3) categoryNorm.dropLast(1) else categoryNorm

        when {
            titleNorm == queryNorm || (tStem == qStem && qStem.isNotEmpty()) -> score += 100
            titleNorm.startsWith(queryNorm) || (qStem.isNotEmpty() && titleNorm.startsWith(qStem)) -> score += 60
            titleNorm.contains(queryNorm) || (qStem.isNotEmpty() && titleNorm.contains(qStem)) || queryNorm.contains(titleNorm) -> score += 40
        }

        if (categoryNorm.isNotEmpty()) {
            if (categoryNorm == queryNorm || (cStem == qStem && qStem.isNotEmpty())) score += 35
            else if (categoryNorm.contains(queryNorm) || queryNorm.contains(categoryNorm) ||
                (qStem.isNotEmpty() && categoryNorm.contains(qStem)) || (cStem.isNotEmpty() && qStem.isNotEmpty() && cStem.contains(qStem))) score += 20
        }

        if (extraNorm.isNotEmpty()) {
            if (extraNorm == queryNorm || queryNorm.contains(extraNorm) || extraNorm.contains(queryNorm)) {
                score += 50
            } else if (qStem.isNotEmpty() && extraNorm.contains(qStem)) {
                score += 25
            }
        }

        if (descriptionNorm.isNotEmpty() && (descriptionNorm.contains(queryNorm) || (qStem.isNotEmpty() && descriptionNorm.contains(qStem)))) {
            score += 15
        }

        // Expansión semántica y sinónimos de tecnología y electrónica
        val isLaptopQuery = queryNorm.contains("laptop") || queryNorm.contains("portatil") || queryNorm.contains("notebook")
        val isLaptopEntity = titleNorm.contains("laptop") || categoryNorm.contains("laptop") || 
                             descriptionNorm.contains("portatil") || descriptionNorm.contains("laptop") || 
                             titleNorm.contains("latitude") || titleNorm.contains("dell")
        if (isLaptopQuery && isLaptopEntity) {
            score += 75
        }

        val isPcQuery = queryNorm == "pc" || queryNorm.contains(" pc") || queryNorm.contains("pc ") || 
                        queryNorm.contains("computadora") || queryNorm.contains("computador") || queryNorm.contains("ordenador") || queryNorm.contains("desktop") || queryNorm.contains("aio")
        val isPcEntity = categoryNorm == "pc" || categoryNorm.contains("pc") || categoryNorm.contains("comput") || 
                         titleNorm.contains("all in one") || titleNorm.contains("aio") || titleNorm.contains("desktop") || 
                         descriptionNorm.contains("computadora") || descriptionNorm.contains("escritorio")
        if (isPcQuery && isPcEntity) {
            score += 75
        }

        val isPhoneQuery = queryNorm.contains("celular") || queryNorm.contains("telefono") || queryNorm.contains("smartphone") || queryNorm.contains("movil")
        val isPhoneEntity = categoryNorm.contains("celular") || categoryNorm.contains("telefono") || 
                            titleNorm.contains("samsung") || titleNorm.contains("iphone") || titleNorm.contains("xiaomi")
        if (isPhoneQuery && isPhoneEntity) {
            score += 75
        }

        // Búsqueda por tokens / palabras individuales (soporta tokens de 2 letras como 'pc', 'tv')
        val stopWords = setOf("que", "los", "las", "por", "para", "con", "sin", "del", "una", "uno", "hay", "tiene", "vende", "platos", "productos", "pchay", "busco", "quiero", "tienen", "venden")
        val tokens = queryNorm.split("\\s+".toRegex()).filter { it.isNotBlank() && it.length >= 2 && it !in stopWords }
        if (tokens.isNotEmpty()) {
            val matchedTokens = tokens.count { token ->
                val tokStem = if (token.endsWith("s") && token.length > 3) token.dropLast(1) else token
                matchesTokenBoundary(titleNorm, token) || (tokStem.isNotEmpty() && tokStem.length > 2 && matchesTokenBoundary(titleNorm, tokStem)) ||
                matchesTokenBoundary(categoryNorm, token) || (tokStem.isNotEmpty() && tokStem.length > 2 && matchesTokenBoundary(categoryNorm, tokStem)) ||
                matchesTokenBoundary(descriptionNorm, token) || (tokStem.isNotEmpty() && tokStem.length > 2 && matchesTokenBoundary(descriptionNorm, tokStem)) ||
                matchesTokenBoundary(extraNorm, token) || (tokStem.isNotEmpty() && tokStem.length > 2 && matchesTokenBoundary(extraNorm, tokStem)) ||
                (token == "pc" && (categoryNorm == "pc" || titleNorm.contains("aio") || titleNorm.contains("all in one"))) ||
                (token == "laptop" && (categoryNorm == "laptop" || descriptionNorm.contains("portatil") || titleNorm.contains("latitude")))
            }
            if (matchedTokens > 0) score += (matchedTokens * 30)
        }

        return score
    }

    /**
     * Motor de búsqueda global multi-entidad para el Dashboard de Cliente.
     */
    fun searchCatalog(
        query: String,
        businesses: List<BusinessInfo>,
        products: List<Product>,
        combos: List<MenuCombo> = emptyList(),
        promotions: List<Promotion> = emptyList(),
        businessNamesMap: Map<String, String> = emptyMap()
    ): CustomerSearchResults {
        val queryNorm = normalizeForSearch(query)
        if (queryNorm.isBlank()) {
            return CustomerSearchResults(query = query)
        }

        val isCheapSearch = queryNorm.contains("barato") || queryNorm.contains("barata") || 
                            queryNorm.contains("economico") || queryNorm.contains("economica") || 
                            queryNorm.contains("precio bajo") || queryNorm.contains("sin gastar")
        val isDiscountSearch = queryNorm.contains("promo") || queryNorm.contains("oferta") || 
                              queryNorm.contains("descuento") || queryNorm.contains("rebaja")
        val isGenericBusinessSearch = queryNorm in listOf("restaurante", "restaurantes", "comercio", "comercios", "negocio", "negocios", "tiendas", "todos los comercios", "todos los restaurantes", "que restaurantes hay", "que comercios hay", "donde comer", "donde comprar", "que hay para comer", "cuales restaurantes hay") ||
                                      queryNorm.startsWith("que restaurantes") || queryNorm.startsWith("que comercios") ||
                                      queryNorm.startsWith("cuales restaurantes") || queryNorm.startsWith("donde comer")

        val effectiveBizNames = businesses.associate { it.id to it.getEffectiveName() } + businessNamesMap

        // Detectar si la consulta menciona a un comercio específico
        val targetBusiness = businesses.firstOrNull { biz ->
            val bNorm = normalizeForSearch(biz.getEffectiveName())
            bNorm.isNotBlank() && (queryNorm.contains(bNorm) || bNorm.contains(queryNorm) ||
                queryNorm.split("\\s+".toRegex()).any { it.length >= 4 && bNorm.contains(it) })
        }

        // 1. Comercios
        val matchedBusinesses = businesses.mapNotNull { biz ->
            val isActive = biz.getEffectiveIsActive()
            if (!isActive) return@mapNotNull null

            val name = biz.getEffectiveName()
            val category = biz.getEffectiveCategory()
            val address = biz.getEffectiveAddress()
            val desc = biz.getEffectiveDescription()
            val rating = biz.getEffectiveRating()

            var score = calculateRelevanceScore(
                queryNorm = queryNorm,
                titleNorm = normalizeForSearch(name),
                descriptionNorm = normalizeForSearch(desc),
                categoryNorm = normalizeForSearch(category),
                extraNorm = normalizeForSearch(address)
            )

            if (isGenericBusinessSearch) {
                score += 70
                if (biz.getEffectiveIsOpen()) score += 20
            }

            if (targetBusiness?.id == biz.id) {
                score += 150
            }

            if (score > 0) {
                CustomerSearchResult(
                    id = biz.id,
                    type = CustomerSearchResultType.BUSINESS,
                    title = name,
                    subtitle = category.ifBlank { "Comercio" },
                    description = desc.ifBlank { address },
                    imageUrl = biz.getEffectiveLogoUrl().ifBlank { biz.getEffectiveBannerUrl() },
                    price = null,
                    originalPrice = null,
                    discountTag = if (rating > 0) "★ $rating" else null,
                    businessId = biz.id,
                    businessName = name,
                    branchId = "",
                    categoryName = category,
                    rating = rating,
                    isAvailable = biz.getEffectiveIsOpen(),
                    relevanceScore = score,
                    rawItem = biz
                )
            } else null
        }.sortedByDescending { it.relevanceScore }

        // 2. Platos / Productos (excluyendo los que son estrictamente combos dedicados)
        val matchedProducts = products.mapNotNull { prod ->
            val isDeleted = prod.status == ProductStatus.UNKNOWN
            val isInactive = prod.status == ProductStatus.INACTIVE || prod.isHidden
            if (isInactive || isDeleted) return@mapNotNull null

            // INTEGRIDAD CANÓNICA: El producto DEBE pertenecer a un comercio registrado y activo
            if (prod.businessId.isBlank()) return@mapNotNull null
            val biz = businesses.find { it.id == prod.businessId }
            if (biz == null || !biz.getEffectiveIsActive()) return@mapNotNull null

            val bizName = biz.getEffectiveName().ifBlank { effectiveBizNames[prod.businessId]?.ifBlank { null } ?: "Comercio" }
            val categoryName = prod.categoryName.ifBlank { prod.category.name.replace("_", " ") }
            val tagsCombined = prod.tags.joinToString(" ")

            // Lógica contextual de categoría: restaurantes usan PLATO / 🍔; otros comercios usan su categoría real e icono
            val bizCategoryNorm = normalizeForSearch(biz.getEffectiveCategory())
            val isRestaurant = bizCategoryNorm.contains("restaurante") ||
                               bizCategoryNorm.contains("comida") ||
                               bizCategoryNorm.contains("gastronom") ||
                               bizCategoryNorm.contains("fritanga") ||
                               bizCategoryNorm.contains("cafeteria") ||
                               bizCategoryNorm.contains("bar")

            val customBadgeLabel = if (isRestaurant) {
                "PLATO"
            } else {
                categoryName.trim().uppercase()
            }

            val customBadgeEmoji = if (isRestaurant) {
                "🍔"
            } else {
                resolveEmojiForCategory(categoryName, biz.getEffectiveCategory())
            }

            val hasPromo = prod.hasDiscount || (prod.originalPrice != null && prod.originalPrice > prod.price)
            var score = calculateRelevanceScore(
                queryNorm = queryNorm,
                titleNorm = normalizeForSearch(prod.name),
                descriptionNorm = normalizeForSearch(prod.description + " " + prod.shortDescription),
                categoryNorm = normalizeForSearch(categoryName),
                extraNorm = normalizeForSearch(bizName + " " + tagsCombined),
                hasDiscount = hasPromo,
                isPopular = prod.isPopular
            )

            // Si se busca un comercio específico, impulsar fuertemente sus productos
            if (targetBusiness != null && prod.businessId == targetBusiness.id) {
                score += 130
            }

            // Si es consulta de descuentos y tiene descuento real
            if (isDiscountSearch && hasPromo) {
                score += 160
            }

            // Si es consulta de barato, ponderar precios accesibles
            if (isCheapSearch && prod.price > 0.0) {
                score += 50
            }

            if (score > 0) {
                val isCombo = prod.category == ProductCategory.COMBO
                val effectiveType = if (isCombo) CustomerSearchResultType.COMBO else CustomerSearchResultType.PRODUCT
                val discount = if (prod.hasDiscount) "-${prod.discountPercentage}%" else null

                CustomerSearchResult(
                    id = prod.id,
                    type = effectiveType,
                    title = prod.name,
                    subtitle = bizName,
                    description = prod.description.ifBlank { prod.shortDescription },
                    imageUrl = prod.getMainImage(),
                    price = prod.price,
                    originalPrice = prod.originalPrice,
                    discountTag = discount,
                    businessId = prod.businessId,
                    businessName = bizName,
                    branchId = prod.branchId,
                    categoryName = categoryName,
                    rating = prod.rating,
                    isAvailable = prod.status == ProductStatus.ACTIVE,
                    relevanceScore = score,
                    rawItem = prod,
                    badgeLabel = customBadgeLabel,
                    badgeEmoji = customBadgeEmoji
                )
            } else null
        }.let { list ->
            if (isCheapSearch) {
                // Ordenar primordialmente por precio ascendente
                list.sortedWith(compareBy<CustomerSearchResult> { it.price ?: Double.MAX_VALUE }.thenByDescending { it.relevanceScore })
            } else {
                list.sortedByDescending { it.relevanceScore }
            }
        }

        // Separar productos regulares de productos catalogados como combo
        val pureProducts = matchedProducts.filter { it.type == CustomerSearchResultType.PRODUCT }
        val productCombos = matchedProducts.filter { it.type == CustomerSearchResultType.COMBO }

        // 3. Combos (desde colección /combos)
        val matchedDirectCombos = combos.mapNotNull { combo ->
            val isActive = combo.status == MenuComboStatus.ACTIVE
            if (!isActive) return@mapNotNull null

            val targetRestId = combo.restaurantId
            if (targetRestId.isBlank()) return@mapNotNull null
            val biz = businesses.find { it.id == targetRestId }
            if (biz == null || !biz.getEffectiveIsActive()) return@mapNotNull null

            val bizName = biz.getEffectiveName().ifBlank { effectiveBizNames[targetRestId]?.ifBlank { null } ?: "Comercio" }
            val slotsDesc = combo.slots.joinToString(", ") { it.slotName }

            val score = calculateRelevanceScore(
                queryNorm = queryNorm,
                titleNorm = normalizeForSearch(combo.name),
                descriptionNorm = normalizeForSearch(combo.description + " " + slotsDesc),
                categoryNorm = "combo combos",
                extraNorm = normalizeForSearch(bizName)
            )

            if (score > 0) {
                val finalPrice = when {
                    combo.percentageDiscount > 0 -> combo.basePrice * (1.0 - (combo.percentageDiscount / 100.0))
                    combo.fixedDiscount > 0 -> (combo.basePrice - combo.fixedDiscount).coerceAtLeast(0.0)
                    else -> combo.basePrice
                }
                val discountTag = when {
                    combo.percentageDiscount > 0 -> "-${combo.percentageDiscount.toInt()}%"
                    combo.fixedDiscount > 0 -> "-C$ ${combo.fixedDiscount.toInt()}"
                    else -> null
                }

                CustomerSearchResult(
                    id = combo.id,
                    type = CustomerSearchResultType.COMBO,
                    title = combo.name,
                    subtitle = bizName,
                    description = combo.description.ifBlank { "Combo especial disponible" },
                    imageUrl = "",
                    price = finalPrice,
                    originalPrice = if (combo.basePrice > finalPrice) combo.basePrice else null,
                    discountTag = discountTag,
                    businessId = combo.restaurantId,
                    businessName = bizName,
                    branchId = "",
                    categoryName = "Combos",
                    rating = 5.0,
                    isAvailable = true,
                    relevanceScore = score,
                    rawItem = combo
                )
            } else null
        }.sortedByDescending { it.relevanceScore }

        val allCombos = (matchedDirectCombos + productCombos).distinctBy { it.id }.sortedByDescending { it.relevanceScore }

        // 4. Promociones
        val matchedPromotions = promotions.mapNotNull { promo ->
            if (!promo.active) return@mapNotNull null

            val bizName = effectiveBizNames[promo.businessId]?.ifBlank { null } ?: "Todas las tiendas"

            val score = calculateRelevanceScore(
                queryNorm = queryNorm,
                titleNorm = normalizeForSearch(promo.title),
                descriptionNorm = normalizeForSearch(promo.description),
                categoryNorm = "promociones promocion ofertas oferta",
                extraNorm = normalizeForSearch("$bizName ${promo.couponCode} ${if (promo.discountPercentage > 0) "${promo.discountPercentage.toInt()}%" else ""}")
            )

            if (score > 0) {
                val discountTag = when {
                    promo.discountPercentage > 0 -> "-${promo.discountPercentage.toInt()}%"
                    promo.couponCode.isNotBlank() -> promo.couponCode
                    else -> "PROMO"
                }

                CustomerSearchResult(
                    id = promo.id,
                    type = CustomerSearchResultType.PROMOTION,
                    title = promo.title,
                    subtitle = bizName,
                    description = promo.description,
                    imageUrl = promo.image,
                    price = null,
                    originalPrice = null,
                    discountTag = discountTag,
                    businessId = promo.businessId,
                    businessName = bizName,
                    branchId = "",
                    categoryName = "Promociones",
                    rating = 5.0,
                    isAvailable = true,
                    relevanceScore = score,
                    rawItem = promo
                )
            } else null
        }.sortedByDescending { it.relevanceScore }

        // Lista unificada ordenada por score de relevancia
        val allUnified = (matchedBusinesses + pureProducts + allCombos + matchedPromotions)
            .sortedByDescending { it.relevanceScore }

        val total = matchedBusinesses.size + pureProducts.size + allCombos.size + matchedPromotions.size

        return CustomerSearchResults(
            query = query,
            businesses = matchedBusinesses,
            products = pureProducts,
            combos = allCombos,
            promotions = matchedPromotions,
            allUnified = allUnified,
            totalCount = total
        )
    }

    /**
     * Resuelve el emoji más adecuado según la categoría del producto y del comercio no gastronómico.
     */
    fun resolveEmojiForCategory(categoryName: String, businessCategory: String): String {
        val norm = normalizeForSearch("$categoryName $businessCategory")
        return when {
            norm.contains("laptop") || norm.contains("comput") || norm.contains("pc") || norm.contains("notebook") -> "💻"
            norm.contains("celular") || norm.contains("telefono") || norm.contains("phone") || norm.contains("movil") -> "📱"
            norm.contains("tecnolog") || norm.contains("electron") || norm.contains("gadget") || norm.contains("audio") || norm.contains("gamer") -> "🔌"
            norm.contains("farmacia") || norm.contains("medic") || norm.contains("salud") || norm.contains("pastilla") -> "💊"
            norm.contains("super") || norm.contains("abarrote") || norm.contains("mercado") -> "🛒"
            norm.contains("cerdo") || norm.contains("porcin") || norm.contains("alimento") || norm.contains("agro") -> "🌾"
            norm.contains("ropa") || norm.contains("moda") || norm.contains("calzado") || norm.contains("zapato") -> "👕"
            norm.contains("licor") || norm.contains("bebida") || norm.contains("cerveza") -> "🍾"
            norm.contains("postre") || norm.contains("pastel") || norm.contains("dulce") -> "🍰"
            else -> "🏷️"
        }
    }

    /**
     * Ejecuta una búsqueda multi-entidad básica para compatibilidad legacy.
     */
    fun searchAll(
        query: String,
        businesses: List<Usuario>,
        products: List<FeaturedProduct>,
        branches: List<BranchItem>
    ): SearchResults {
        val q = normalizeForSearch(query)
        if (q.isBlank()) return SearchResults()

        val matchedBiz = businesses.filter {
            normalizeForSearch(it.nombre).contains(q) || normalizeForSearch(it.rol).contains(q)
        }

        val matchedProd = products.filter {
            normalizeForSearch(it.name).contains(q) || normalizeForSearch(it.businessName).contains(q)
        }

        val matchedBr = branches.filter {
            normalizeForSearch(it.branchName).contains(q) || normalizeForSearch(it.businessName).contains(q) || normalizeForSearch(it.address).contains(q)
        }

        val total = matchedBiz.size + matchedProd.size + matchedBr.size

        return SearchResults(
            matchedBusinesses = matchedBiz,
            matchedProducts = matchedProd,
            matchedBranches = matchedBr,
            totalCount = total
        )
    }
}

