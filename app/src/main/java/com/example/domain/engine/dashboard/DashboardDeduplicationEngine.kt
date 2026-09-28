package com.example.domain.engine.dashboard

import com.example.data.repository.BusinessInfo

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D DASHBOARD DEDUPLICATION ENGINE
 * Protocolo: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001 (Addendum P0-04)
 *
 * Implementa la regla formal de deduplicación M=2:
 * 1. Aplica exclusivamente a las 5 Secciones Curadas Dinámicas:
 *    FEATURED_BUSINESSES, SAME_PRICE, TOP_SELLING, RECOMMENDED, NEW_BUSINESSES.
 * 2. Ningún comercio puede aparecer más de M=2 veces en la suma de secciones curadas.
 * 3. Inmunidad semántica absoluta (M=∞ / Cero supresión):
 *    FAVORITES, NEARBY, BRANCHES, ALL_BUSINESSES.
 * 4. Regla Anti-Vaciamiento: Si el filtro deja menos de 2 elementos en una sección curada,
 *    se relaja la supresión priorizando el orden natural de la sección.
 */
object DashboardDeduplicationEngine {

    val CURATED_SECTIONS: Set<String> = setOf(
        "FEATURED_BUSINESSES",
        "SAME_PRICE",
        "TOP_SELLING",
        "RECOMMENDED",
        "NEW_BUSINESSES"
    )

    val EXEMPT_SECTIONS: Set<String> = setOf(
        "FAVORITES",
        "NEARBY",
        "BRANCHES",
        "ALL_BUSINESSES"
    )

    const val MAX_CURATED_APPEARANCES: Int = 2

    /**
     * Resultado estructurado que contiene las listas filtradas para cada sección curada.
     */
    data class CuratedFeedResult(
        val featuredBusinesses: List<BusinessInfo>,
        val samePriceBusinesses: List<BusinessInfo>,
        val topSellingBusinesses: List<BusinessInfo>,
        val recommendedBusinesses: List<BusinessInfo>,
        val newBusinesses: List<BusinessInfo>
    )

    /**
     * Procesa las 5 secciones curadas respetando el orden dinámico de sectionOrder
     * para aplicar el cupo de M=2 según la primera aparición en el viewport del usuario.
     */
    fun filterCuratedSections(
        sectionOrder: List<String>,
        featuredPool: List<BusinessInfo>,
        samePricePool: List<BusinessInfo>,
        topSellingPool: List<BusinessInfo>,
        recommendedPool: List<BusinessInfo>,
        newBusinessesPool: List<BusinessInfo>
    ): CuratedFeedResult {
        val appearanceCount = mutableMapOf<String, Int>()

        fun filterSection(pool: List<BusinessInfo>): List<BusinessInfo> {
            val accepted = mutableListOf<BusinessInfo>()
            val suppressed = mutableListOf<BusinessInfo>()

            for (biz in pool) {
                val count = appearanceCount.getOrDefault(biz.id, 0)
                if (count < MAX_CURATED_APPEARANCES) {
                    accepted.add(biz)
                    appearanceCount[biz.id] = count + 1
                } else {
                    suppressed.add(biz)
                }
            }

            // Regla Anti-Vaciamiento: Si quedaron menos de 2 elementos y había candidatos en el pool, rescatar del pool
            if (accepted.size < 2 && suppressed.isNotEmpty()) {
                val needed = (2 - accepted.size).coerceAtMost(suppressed.size)
                val rescued = suppressed.take(needed)
                rescued.forEach { biz ->
                    accepted.add(biz)
                    appearanceCount[biz.id] = appearanceCount.getOrDefault(biz.id, 0) + 1
                }
            }

            return accepted
        }

        val resultMap = mutableMapOf<String, List<BusinessInfo>>()

        // Itera en el orden exacto de sectionOrder para que las secciones superiores tengan prioridad de cupo
        for (sectionId in sectionOrder) {
            val upperId = sectionId.trim().uppercase()
            if (!CURATED_SECTIONS.contains(upperId) || resultMap.containsKey(upperId)) continue

            when (upperId) {
                "FEATURED_BUSINESSES" -> resultMap[upperId] = filterSection(featuredPool)
                "SAME_PRICE" -> resultMap[upperId] = filterSection(samePricePool)
                "TOP_SELLING" -> resultMap[upperId] = filterSection(topSellingPool)
                "RECOMMENDED" -> resultMap[upperId] = filterSection(recommendedPool)
                "NEW_BUSINESSES" -> resultMap[upperId] = filterSection(newBusinessesPool)
            }
        }

        // Asegura que todas las secciones tengan resultado incluso si no estaban en sectionOrder
        return CuratedFeedResult(
            featuredBusinesses = resultMap["FEATURED_BUSINESSES"] ?: filterSection(featuredPool),
            samePriceBusinesses = resultMap["SAME_PRICE"] ?: filterSection(samePricePool),
            topSellingBusinesses = resultMap["TOP_SELLING"] ?: filterSection(topSellingPool),
            recommendedBusinesses = resultMap["RECOMMENDED"] ?: filterSection(recommendedPool),
            newBusinesses = resultMap["NEW_BUSINESSES"] ?: filterSection(newBusinessesPool)
        )
    }
}
