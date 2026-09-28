package com.example

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.analytics.logEvent
import com.google.firebase.Firebase

object AnalyticsHelper {
    private var analytics: FirebaseAnalytics? = null

    fun init() {
        // Will be initialized in MainActivity, but Firebase.analytics auto-initializes using the default app
        analytics = Firebase.analytics
    }

    private fun getAnalyticsInstance(): FirebaseAnalytics {
        if (analytics == null) {
            analytics = Firebase.analytics
        }
        return analytics!!
    }

    fun logAppOpen() {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.APP_OPEN, null)
    }

    fun logSignUp(method: String) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.SIGN_UP) {
            param(FirebaseAnalytics.Param.METHOD, method)
        }
    }

    fun logLogin(method: String) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.LOGIN) {
            param(FirebaseAnalytics.Param.METHOD, method)
        }
    }

    fun logViewProduct(productId: String, productName: String, price: Double) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.VIEW_ITEM) {
            param(FirebaseAnalytics.Param.CURRENCY, "NIO")
            param(FirebaseAnalytics.Param.VALUE, price)
            param(FirebaseAnalytics.Param.ITEM_ID, productId)
            param(FirebaseAnalytics.Param.ITEM_NAME, productName)
        }
    }

    fun logAddToCart(productId: String, productName: String, price: Double, quantity: Int) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.ADD_TO_CART) {
            param(FirebaseAnalytics.Param.CURRENCY, "NIO")
            param(FirebaseAnalytics.Param.VALUE, price * quantity)
            param(FirebaseAnalytics.Param.ITEM_ID, productId)
            param(FirebaseAnalytics.Param.ITEM_NAME, productName)
            param(FirebaseAnalytics.Param.QUANTITY, quantity.toLong())
        }
    }

    fun logBeginCheckout(cartTotal: Double, itemCount: Int) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.BEGIN_CHECKOUT) {
            param(FirebaseAnalytics.Param.CURRENCY, "NIO")
            param(FirebaseAnalytics.Param.VALUE, cartTotal)
            param("item_count", itemCount.toLong())
        }
    }

    fun logPurchase(orderId: String, total: Double, paymentMethod: String, itemCount: Int) {
        getAnalyticsInstance().logEvent(FirebaseAnalytics.Event.PURCHASE) {
            param(FirebaseAnalytics.Param.TRANSACTION_ID, orderId)
            param(FirebaseAnalytics.Param.CURRENCY, "NIO")
            param(FirebaseAnalytics.Param.VALUE, total)
            param(FirebaseAnalytics.Param.PAYMENT_TYPE, paymentMethod)
            param("item_count", itemCount.toLong())
        }
    }

    fun logOrderDelivered(orderId: String, deliveryTimeMinutes: Long) {
        getAnalyticsInstance().logEvent("order_delivered") {
            param("order_id", orderId)
            param("delivery_time_minutes", deliveryTimeMinutes)
        }
    }

    fun logOrderCancelled(orderId: String, reason: String) {
        getAnalyticsInstance().logEvent("order_cancelled") {
            param("order_id", orderId)
            param("reason", reason)
        }
    }

    fun logRateOrder(orderId: String, businessRating: Float, driverRating: Float) {
        getAnalyticsInstance().logEvent("rate_order") {
            param("order_id", orderId)
            param("business_rating", businessRating.toDouble())
            param("driver_rating", driverRating.toDouble())
        }
    }
}
