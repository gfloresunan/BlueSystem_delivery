package com.example.navigation

import android.content.Intent
import android.net.Uri
import com.example.Screen
import com.example.domain.model.AppNotification
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class NotificationRouterTest {

    @Test
    fun testResolveCustomerOrderTracking() {
        val notif = AppNotification(
            id = "notif_1",
            destinationType = "CUSTOMER_ORDER_TRACKING",
            orderId = "order_123"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("customer/order_tracking/order_123", route)
    }

    @Test
    fun testResolveCustomerOrderDetail() {
        val notif = AppNotification(
            id = "notif_2",
            destinationType = "CUSTOMER_ORDER_DETAIL",
            orderId = "order_456"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals(Screen.OrderDetail.createRoute("order_456"), route)
    }

    @Test
    fun testResolveCustomerProduct() {
        val notif = AppNotification(
            id = "notif_3",
            destinationType = "CUSTOMER_PRODUCT",
            businessId = "biz_roma",
            productId = "prod_pizza"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("comercio_detalle_screen/biz_roma?productId=prod_pizza", route)
    }

    @Test
    fun testResolveCustomerMerchant() {
        val notif = AppNotification(
            id = "notif_4",
            destinationType = "CUSTOMER_MERCHANT",
            businessId = "biz_tacos"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("comercio_detalle_screen/biz_tacos", route)
    }

    @Test
    fun testResolveCustomerCoupon() {
        val notif = AppNotification(
            id = "notif_5",
            destinationType = "CUSTOMER_COUPON",
            couponId = "PROMO50"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("customer_coupons?couponId=PROMO50", route)
    }

    @Test
    fun testResolveCustomerSupportChat() {
        val notif = AppNotification(
            id = "notif_6",
            destinationType = "CUSTOMER_SUPPORT_CHAT",
            supportConversationId = "ticket_789"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("customer_help?conversationId=ticket_789", route)
    }

    @Test
    fun testResolveCustomerHome() {
        val notif = AppNotification(
            id = "notif_7",
            destinationType = "CUSTOMER_HOME"
        )
        val route = NotificationRouter.resolve(notif, "customer")
        assertEquals("customer_dashboard", route)
    }

    @Test
    fun testRoleGuardCourierNeverNavigatesToCustomerOrderDetail() {
        val notif = AppNotification(
            id = "notif_8",
            destinationType = "CUSTOMER_ORDER_DETAIL",
            orderId = "order_999"
        )
        val route = NotificationRouter.resolve(notif, "courier")
        // Motorizados son redirigidos a su pantalla operativa Screen.Courier
        assertEquals(Screen.Courier.route, route)
    }

    @Test
    fun testRoleGuardMerchantNavigatesToBusinessDashboard() {
        val notif = AppNotification(
            id = "notif_9",
            destinationType = "MERCHANT_ORDERS",
            action = "NEW_ORDER"
        )
        val route = NotificationRouter.resolve(notif, "business")
        assertEquals("business_dashboard", route)
    }

    @Test
    fun testDeepLinkUriParsing() {
        val uriTracking = Uri.parse("bluesystem://orders/ord_abc/tracking")
        val routeTracking = NotificationRouter.parseDeepLinkUri(uriTracking)
        assertEquals("customer/order_tracking/ord_abc", routeTracking)

        val uriOrder = Uri.parse("bluesystem://orders/ord_abc")
        val routeOrder = NotificationRouter.parseDeepLinkUri(uriOrder)
        assertEquals(Screen.OrderDetail.createRoute("ord_abc"), routeOrder)

        val uriProduct = Uri.parse("bluesystem://merchant/biz_1/product/prod_1")
        val routeProduct = NotificationRouter.parseDeepLinkUri(uriProduct)
        assertEquals("comercio_detalle_screen/biz_1?productId=prod_1", routeProduct)

        val uriCoupon = Uri.parse("bluesystem://coupon/DESCUENTO20")
        val routeCoupon = NotificationRouter.parseDeepLinkUri(uriCoupon)
        assertEquals("customer_coupons?couponId=DESCUENTO20", routeCoupon)
    }

    @Test
    fun testIntentResolutionColdStart() {
        val intent = Intent().apply {
            putExtra("destinationType", "CUSTOMER_ORDER_TRACKING")
            putExtra("orderId", "order_live_01")
        }
        val route = NotificationRouter.resolve(intent, "customer")
        assertNotNull(route)
        assertEquals("customer/order_tracking/order_live_01", route)
    }

    @Test
    fun testUniversalFallbackOnEmptyOrCorruptedNotification() {
        val emptyNotif = AppNotification()
        val route = NotificationRouter.resolve(emptyNotif, "customer")
        assertEquals("customer_dashboard", route)
    }
}
