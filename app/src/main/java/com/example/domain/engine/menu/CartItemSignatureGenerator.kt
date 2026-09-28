package com.example.domain.engine.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.model.menu.SelectedComboSlot
import com.example.domain.model.menu.SelectedOption

/**
 * Generador de Firma Unificada de Carrito (CartItemSignatureGenerator - Sprint 13B.4B)
 *
 * REGLA DE NEGOCIO (Precondición 3):
 * Genera una firma canónica e inmutable que identifica de forma única la configuración
 * exacta de un producto (Variante + Opciones + Slots de Combo) para deduplicación precisa en el carrito.
 */
object CartItemSignatureGenerator {

    fun generateSignatureKey(
        productId: String,
        variantKey: String? = null,
        selectedOptions: List<SelectedOption> = emptyList(),
        selectedComboSlots: List<SelectedComboSlot> = emptyList()
    ): String {
        val cleanProdId = productId.trim().lowercase()
        val cleanVarKey = variantKey?.trim()?.lowercase() ?: "novar"

        val sortedOptionIds = selectedOptions.map { "${it.optionGroupId}:${it.optionId}" }.sorted().joinToString(",")
        val sortedComboSlots = selectedComboSlots.sortedBy { it.slotId }
            .map { "${it.slotId}:${it.selectedProductId}:${it.selectedVariantKey ?: "novar"}" }
            .joinToString(";")

        val rawSignatureString = "$cleanProdId|$cleanVarKey|$sortedOptionIds|$sortedComboSlots"
        val hash = CanonicalJsonChecksumHelper.sha256Hex(rawSignatureString)

        return "sig_${cleanProdId}_${hash.take(16)}"
    }
}
