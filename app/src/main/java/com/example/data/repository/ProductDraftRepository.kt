package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.domain.model.Product
import com.example.domain.model.catalog.ProductDraft
import org.json.JSONObject

/**
 * Repositorio de borrador local para AutoSave y recuperación del Wizard ante cierres inesperados.
 */
class ProductDraftRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("product_wizard_drafts", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_DRAFT = "current_draft_json"
        private const val KEY_TIMESTAMP = "current_draft_time"
    }

    fun saveDraft(draft: ProductDraft) {
        try {
            val json = JSONObject().apply {
                put("step", draft.step)
                put("lastSavedAt", draft.lastSavedAt)
                put("name", draft.product.name)
                put("description", draft.product.description)
                put("shortDescription", draft.product.shortDescription)
                put("price", draft.product.price)
                put("originalPrice", draft.product.originalPrice ?: 0.0)
                put("categoryName", draft.product.categoryName)
                put("stockQuantity", draft.product.stockQuantity ?: -1)
                put("isPopular", draft.product.isPopular)
                put("isVegetarian", draft.product.isVegetarian)
                put("isSpicy", draft.product.isSpicy)
            }
            prefs.edit()
                .putString(KEY_DRAFT, json.toString())
                .putLong(KEY_TIMESTAMP, draft.lastSavedAt)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getDraft(): ProductDraft? {
        val jsonStr = prefs.getString(KEY_DRAFT, null) ?: return null
        val time = prefs.getLong(KEY_TIMESTAMP, 0L)
        return try {
            val json = JSONObject(jsonStr)
            val product = Product(
                name = json.optString("name", ""),
                description = json.optString("description", ""),
                shortDescription = json.optString("shortDescription", ""),
                price = json.optDouble("price", 0.0),
                originalPrice = if (json.has("originalPrice") && json.getDouble("originalPrice") > 0) json.getDouble("originalPrice") else null,
                categoryName = json.optString("categoryName", ""),
                stockQuantity = valOrNull(json.optInt("stockQuantity", -1)),
                isPopular = json.optBoolean("isPopular", false),
                isVegetarian = json.optBoolean("isVegetarian", false),
                isSpicy = json.optBoolean("isSpicy", false)
            )
            ProductDraft(
                step = json.optInt("step", 1),
                product = product,
                lastSavedAt = time
            )
        } catch (e: Exception) {
            null
        }
    }

    fun clearDraft() {
        prefs.edit().remove(KEY_DRAFT).remove(KEY_TIMESTAMP).apply()
    }

    private fun valOrNull(v: Int): Int? = if (v == -1) null else v
}
