package com.example.data.mapper.menu

import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import java.security.MessageDigest
import java.util.Locale

/**
 * Helper para el cálculo determinista del Checksum SHA-256 sobre una representación JSON canónica.
 * Cumple estrictamente con la Nota Técnica 1 y la Extensión Sprint 13B.2C (OptionGroups & Options):
 * - Claves ordenadas alfabéticamente
 * - Codificación UTF-8
 * - Sin espacios innecesarios
 * - Exclusión de campos efímeros (timestamps, createdAt, updatedAt)
 * - Inclusión de OptionGroups y Options para invalidación automática de cache cuando cambie una opción.
 */
object CanonicalJsonChecksumHelper {

    fun computeMenuChecksum(
        categories: List<MenuCategory>,
        products: List<MenuProduct>,
        optionGroups: List<MenuOptionGroup> = emptyList()
    ): String {
        val sortedCategories = categories.sortedBy { it.id }
            .map { cat ->
                mapOf(
                    "id" to cat.id,
                    "isActive" to cat.isActive,
                    "orderIndex" to cat.orderIndex,
                    "primaryName" to cat.primaryName,
                    "restaurantId" to cat.restaurantId
                )
            }

        val sortedProducts = products.sortedBy { it.id }
            .map { prod ->
                mapOf(
                    "basePrice" to String.format(Locale.US, "%.2f", prod.basePrice),
                    "description" to prod.description,
                    "id" to prod.id,
                    "isPopular" to prod.isPopular,
                    "name" to prod.name,
                    "optionGroupIds" to prod.optionGroupIds.sorted(),
                    "orderIndex" to prod.orderIndex,
                    "primaryCategoryId" to prod.primaryCategoryId,
                    "productType" to prod.productType.name,
                    "restaurantId" to prod.restaurantId,
                    "status" to prod.status.name,
                    "taxPercentage" to String.format(Locale.US, "%.2f", prod.taxPercentage)
                )
            }

        val sortedOptionGroups = optionGroups.sortedBy { it.id }
            .map { grp ->
                val sortedOptions = grp.options.sortedBy { it.id }
                    .map { opt ->
                        mapOf(
                            "additionalPrice" to String.format(Locale.US, "%.2f", opt.additionalPrice),
                            "id" to opt.id,
                            "isDefault" to opt.isDefault,
                            "name" to opt.name,
                            "orderIndex" to opt.orderIndex,
                            "status" to opt.status.name
                        )
                    }

                mapOf(
                    "allowFreeOptionsCount" to grp.allowFreeOptionsCount,
                    "id" to grp.id,
                    "isRequired" to grp.isRequired,
                    "maxSelection" to grp.maxSelection,
                    "minSelection" to grp.minSelection,
                    "name" to grp.name,
                    "options" to sortedOptions,
                    "orderIndex" to grp.orderIndex
                )
            }

        val canonicalStructure = mapOf(
            "categories" to sortedCategories,
            "optionGroups" to sortedOptionGroups,
            "products" to sortedProducts
        )

        val canonicalJsonString = buildCanonicalJson(canonicalStructure)
        return sha256Hex(canonicalJsonString)
    }

    private fun buildCanonicalJson(value: Any?): String {
        return when (value) {
            null -> "null"
            is Map<*, *> -> {
                val sortedEntries = value.entries
                    .filter { it.key != null }
                    .sortedBy { it.key.toString() }
                    .joinToString(separator = ",") { entry ->
                        "\"${entry.key}\":${buildCanonicalJson(entry.value)}"
                    }
                "{$sortedEntries}"
            }
            is List<*> -> {
                val joinedElements = value.joinToString(separator = ",") { buildCanonicalJson(it) }
                "[$joinedElements]"
            }
            is String -> "\"${value.replace("\"", "\\\"")}\""
            is Number, is Boolean -> value.toString()
            else -> "\"${value.toString().replace("\"", "\\\"")}\""
        }
    }

    fun sha256Hex(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
