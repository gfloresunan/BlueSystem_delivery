package com.example.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

import com.example.domain.engine.menu.CartItemSignatureGenerator
import com.example.domain.model.menu.SelectedOption

data class CartItem(
    val productId: String = "",
    val productName: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val businessId: String = "",
    val businessName: String = "",
    val imageUrl: String = "",
    val branchId: String = "",
    val selectedOptions: List<SelectedOption> = emptyList(),
    val cartItemId: String = productId
) {
    val optionsAddons: Double get() = selectedOptions.sumOf { it.finalPrice }
    val unitPriceWithExtras: Double get() = price + optionsAddons
}

object CartManager {
    private const val PREFS_NAME = "bluesystem_cart_prefs"
    private const val KEY_CART_ITEMS = "cart_items_json"

    private val _cartItemCount = MutableStateFlow(0)
    val cartItemCount: StateFlow<Int> = _cartItemCount.asStateFlow()

    private val _cartItems = MutableStateFlow<List<CartItem>>(emptyList())
    val cartItems: StateFlow<List<CartItem>> = _cartItems.asStateFlow()

    private var prefs: SharedPreferences? = null

    val subtotal: Double get() = _cartItems.value.sumOf { it.unitPriceWithExtras * it.quantity }
    val currentBusinessId: String get() = _cartItems.value.firstOrNull()?.businessId ?: ""
    val currentBusinessName: String get() = _cartItems.value.firstOrNull()?.businessName ?: ""

    fun initContext(context: Context) {
        if (prefs == null) {
            prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            loadCartFromPrefs()
        }
    }

    private fun saveCartToPrefs() {
        val sp = prefs ?: return
        try {
            val jsonArray = JSONArray()
            _cartItems.value.forEach { item ->
                val optsArray = JSONArray()
                item.selectedOptions.forEach { opt ->
                    optsArray.put(JSONObject().apply {
                        put("optionGroupId", opt.optionGroupId)
                        put("optionGroupName", opt.optionGroupName)
                        put("optionId", opt.optionId)
                        put("optionName", opt.optionName)
                        put("additionalPrice", opt.additionalPrice)
                        put("isFreeOption", opt.isFreeOption)
                        put("finalPrice", opt.finalPrice)
                    })
                }
                val obj = JSONObject().apply {
                    put("productId", item.productId)
                    put("productName", item.productName)
                    put("price", item.price)
                    put("quantity", item.quantity)
                    put("businessId", item.businessId)
                    put("businessName", item.businessName)
                    put("imageUrl", item.imageUrl)
                    put("branchId", item.branchId)
                    put("cartItemId", item.cartItemId)
                    put("selectedOptions", optsArray)
                }
                jsonArray.put(obj)
            }
            sp.edit().putString(KEY_CART_ITEMS, jsonArray.toString()).apply()
            Log.d("CART_DEBUG", "[CartManager] SAVED_TO_PREFS | count=${_cartItems.value.size}")
        } catch (e: Exception) {
            Log.e("CART_DEBUG", "[CartManager] ERROR saving cart to prefs", e)
        }
    }

    private fun loadCartFromPrefs() {
        val sp = prefs ?: return
        try {
            val raw = sp.getString(KEY_CART_ITEMS, null) ?: return
            val jsonArray = JSONArray(raw)
            val list = mutableListOf<CartItem>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val optsJson = obj.optJSONArray("selectedOptions")
                val selectedOptsList = mutableListOf<SelectedOption>()
                if (optsJson != null) {
                    for (j in 0 until optsJson.length()) {
                        val o = optsJson.getJSONObject(j)
                        selectedOptsList.add(
                            SelectedOption(
                                optionGroupId = o.optString("optionGroupId"),
                                optionGroupName = o.optString("optionGroupName"),
                                optionId = o.optString("optionId"),
                                optionName = o.optString("optionName"),
                                additionalPrice = o.optDouble("additionalPrice", 0.0),
                                isFreeOption = o.optBoolean("isFreeOption", false),
                                finalPrice = o.optDouble("finalPrice", 0.0)
                            )
                        )
                    }
                }

                list.add(
                    CartItem(
                        productId = obj.optString("productId"),
                        productName = obj.optString("productName"),
                        price = obj.optDouble("price", 0.0),
                        quantity = obj.optInt("quantity", 1),
                        businessId = obj.optString("businessId"),
                        businessName = obj.optString("businessName"),
                        imageUrl = obj.optString("imageUrl"),
                        branchId = obj.optString("branchId"),
                        selectedOptions = selectedOptsList,
                        cartItemId = obj.optString("cartItemId", obj.optString("productId"))
                    )
                )
            }
            _cartItems.value = list
            _cartItemCount.value = list.sumOf { it.quantity }
            Log.d("CART_DEBUG", "[CartManager] LOADED_FROM_PREFS | items=${list.size} | totalUnits=${_cartItemCount.value}")
        } catch (e: Exception) {
            Log.e("CART_DEBUG", "[CartManager] ERROR loading cart from prefs", e)
        }
    }

    private fun updateState(newList: List<CartItem>) {
        _cartItems.value = newList
        val totalUnits = newList.sumOf { it.quantity }
        _cartItemCount.value = totalUnits
        saveCartToPrefs()
        Log.d("CART_DEBUG", "[CART_DEBUG] CART_UPDATED | itemsCount=${newList.size} | totalUnits=$totalUnits")
        Log.d("CART_DEBUG", "[CART_DEBUG] CART_COUNT | count=$totalUnits")
    }

    fun updateCartItemCount(count: Int) {
        _cartItemCount.value = count
    }

    fun increment() {
        _cartItemCount.value++
    }

    fun addToCart(
        productId: String,
        productName: String,
        price: Double,
        quantity: Int = 1,
        businessId: String = "",
        businessName: String = "",
        imageUrl: String = "",
        branchId: String = "",
        selectedOptions: List<SelectedOption> = emptyList()
    ) {
        val currentList = _cartItems.value.toMutableList()
        val signatureKey = CartItemSignatureGenerator.generateSignatureKey(productId, null, selectedOptions)
        val index = currentList.indexOfFirst { it.cartItemId == signatureKey || (it.productId == productId && it.selectedOptions == selectedOptions) }
        if (index >= 0) {
            val existing = currentList[index]
            currentList[index] = existing.copy(
                quantity = existing.quantity + quantity,
                businessId = if (businessId.isNotBlank()) businessId else existing.businessId,
                businessName = if (businessName.isNotBlank()) businessName else existing.businessName,
                imageUrl = if (imageUrl.isNotBlank()) imageUrl else existing.imageUrl,
                branchId = if (branchId.isNotBlank()) branchId else existing.branchId
            )
        } else {
            currentList.add(
                CartItem(
                    productId = productId,
                    productName = productName,
                    price = price,
                    quantity = quantity,
                    businessId = businessId,
                    businessName = businessName,
                    imageUrl = imageUrl,
                    branchId = branchId,
                    selectedOptions = selectedOptions,
                    cartItemId = signatureKey
                )
            )
        }
        Log.d("CART_DEBUG", "[CART_DEBUG] PRODUCT_ADD | id=$productId | name='$productName' | qty=$quantity | biz=$businessId | extras=${selectedOptions.size}")
        updateState(currentList)
        com.example.AnalyticsHelper.logAddToCart(productId, productName, price, quantity)
    }

    fun incrementQuantity(productId: String) {
        val currentList = _cartItems.value.map { item ->
            if (item.productId == productId) item.copy(quantity = item.quantity + 1) else item
        }
        Log.d("CART_DEBUG", "[CART_DEBUG] ITEM_INCREMENT | id=$productId")
        updateState(currentList)
    }

    fun decrementQuantity(productId: String) {
        val currentList = _cartItems.value.mapNotNull { item ->
            if (item.productId == productId) {
                if (item.quantity > 1) item.copy(quantity = item.quantity - 1) else null
            } else {
                item
            }
        }
        Log.d("CART_DEBUG", "[CART_DEBUG] ITEM_DECREMENT | id=$productId")
        updateState(currentList)
    }

    fun removeItem(productId: String) {
        val currentList = _cartItems.value.filter { it.productId != productId }
        Log.d("CART_DEBUG", "[CART_DEBUG] ITEM_REMOVE | id=$productId")
        updateState(currentList)
    }

    fun beginCheckout(cartTotal: Double, itemCount: Int) {
        Log.d("CART_DEBUG", "[CART_DEBUG] CHECKOUT_OPENED | total=$cartTotal | count=$itemCount")
        com.example.AnalyticsHelper.logBeginCheckout(cartTotal, itemCount)
    }

    fun clear() {
        Log.d("CART_DEBUG", "[CART_DEBUG] CART_CLEARED")
        updateState(emptyList())
    }
}

