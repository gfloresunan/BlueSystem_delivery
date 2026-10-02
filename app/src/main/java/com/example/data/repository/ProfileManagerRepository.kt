package com.example.data.repository

import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ProfileBannerConfig(
    val id: String = "profile_banner_default",
    val imageUrl: String = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    val title: String = "Programa de Fidelidad Enterprise",
    val subtitle: String = "¡Gana puntos dobles en todos tus pedidos este mes!",
    val actionType: String = "loyalty", // loyalty, coupon, url, category, business
    val actionId: String = "",
    val active: Boolean = true,
    val priority: Int = 1,
    val startDate: String = "",
    val expiryDate: String = ""
)

data class ProfileSectionConfig(
    val id: String = "",
    val name: String = "",
    val isVisible: Boolean = true,
    val order: Int = 0
)

data class ProfileGlobalConfig(
    val dynamicHeaderPhrase: String = "¡Gracias por confiar en BlueSystem! 🚀",
    val bannerConfig: ProfileBannerConfig = ProfileBannerConfig(),
    val sections: List<ProfileSectionConfig> = listOf(
        ProfileSectionConfig("banner", "Banner Promocional", true, 1),
        ProfileSectionConfig("stats", "Tarjetas Resumen", true, 2),
        ProfileSectionConfig("loyalty", "Programa de Fidelidad", true, 3),
        ProfileSectionConfig("coupons", "Cupones y Promociones", true, 4),
        ProfileSectionConfig("favorites", "Mis Favoritos", true, 5),
        ProfileSectionConfig("wallet", "Mi Cartera / Wallet", true, 6),
        ProfileSectionConfig("timeline", "Historial de Actividad", true, 7),
        ProfileSectionConfig("benefits", "Mis Beneficios & Stats", true, 8),
        ProfileSectionConfig("settings", "Configuración & Seguridad", true, 9),
        ProfileSectionConfig("support", "Soporte & Ayuda", true, 10),
        ProfileSectionConfig("merchant", "Registro de Comercio", true, 11)
    )
)

data class LoyaltyInfo(
    val level: String = "Bronce",
    val currentPoints: Int = 0,
    val nextLevelPoints: Int = 500,
    val benefits: List<String> = listOf(
        "Acumula 10 pts por pedido completado"
    )
)

data class CouponModel(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val discountPercent: Double = 0.0,
    val flatDiscount: Double = 0.0,
    val minSubtotal: Double = 0.0,
    val freeDelivery: Boolean = false,
    val status: String = "activo", // activo, vencido, usado, promocional, personalizado
    val category: String = "General",
    val expiryDate: String = "31/12/2026",
    val description: String = ""
)

data class WalletInfo(
    val balance: Double = 0.0,
    val currency: String = "C$",
    val movements: List<WalletTransaction> = emptyList()
)

data class WalletTransaction(
    val id: String = "",
    val type: String = "", // Reembolso, Bonificación, Recarga, Pago
    val amount: Double = 0.0,
    val date: String = "",
    val description: String = ""
)

data class ActivityTimelineItem(
    val id: String = "",
    val type: String = "pedido", // pedido, cupon, reembolso, puntos, favorito, comentario
    val title: String = "",
    val description: String = "",
    val timestamp: String = "",
    val amountOrPoints: String = ""
)

data class Customer360Stats(
    val totalOrders: Int = 0,
    val cancelledOrders: Int = 0,
    val deliveredOrders: Int = 0,
    val avgDeliveryMinutes: Int = 0,
    val totalSavings: Double = 0.0,
    val lastPurchaseDate: String = "",
    val avgTicket: Double = 0.0,
    val favoriteHour: String = "",
    val favoriteCategory: String = "",
    val favoriteMerchant: String = ""
)

data class CustomerSettings(
    val themeMode: String = "system", // dark, light, system
    val language: String = "es", // es, en, pt
    val notifMarketing: Boolean = true,
    val notifOrders: Boolean = true,
    val notifPromos: Boolean = true,
    val notifSystem: Boolean = true,
    val notifSupport: Boolean = true,
    val pinEnabled: Boolean = false,
    val biometricEnabled: Boolean = true
)

class ProfileManagerRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _globalConfig = MutableStateFlow(ProfileGlobalConfig())
    val globalConfig: StateFlow<ProfileGlobalConfig> = _globalConfig.asStateFlow()

    private val _loyaltyInfo = MutableStateFlow(LoyaltyInfo())
    val loyaltyInfo: StateFlow<LoyaltyInfo> = _loyaltyInfo.asStateFlow()

    private val _coupons = MutableStateFlow<List<CouponModel>>(emptyList())
    val coupons: StateFlow<List<CouponModel>> = _coupons.asStateFlow()

    private val _walletInfo = MutableStateFlow(WalletInfo())
    val walletInfo: StateFlow<WalletInfo> = _walletInfo.asStateFlow()

    private val _timeline = MutableStateFlow<List<ActivityTimelineItem>>(emptyList())
    val timeline: StateFlow<List<ActivityTimelineItem>> = _timeline.asStateFlow()

    private val _customerStats = MutableStateFlow(Customer360Stats())
    val customerStats: StateFlow<Customer360Stats> = _customerStats.asStateFlow()

    private val _customerSettings = MutableStateFlow(CustomerSettings())
    val customerSettings: StateFlow<CustomerSettings> = _customerSettings.asStateFlow()

    private var bannerListener: ListenerRegistration? = null
    private var configListener: ListenerRegistration? = null

    init {
        loadMockDefaults()
        startListeningGlobalConfig()
    }

    private fun startListeningGlobalConfig() {
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        val uid = currentUser?.uid ?: "anonymous"
        val appVersion = com.example.BuildConfig.VERSION_NAME
        
        Log.d("FIRESTORE_AUDIT", "[LISTENER_INIT] Path: profileSections/config | UID: $uid | AppVersion: $appVersion")
        configListener = firestore.collection("profileSections")
            .document("config")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FIRESTORE_AUDIT", "[PERMISSION_ERROR] Path: profileSections/config | UID: $uid | AppVersion: $appVersion | Code: ${error.code} | Msg: ${error.message}", error)
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    val dynamicPhrase = snapshot.getString("dynamicHeaderPhrase") ?: "¡Gracias por confiar en BlueSystem! 🚀"
                    _globalConfig.value = _globalConfig.value.copy(dynamicHeaderPhrase = dynamicPhrase)
                }
            }

        Log.d("FIRESTORE_AUDIT", "[LISTENER_INIT] Path: profileBanner/config | UID: $uid | AppVersion: $appVersion")
        bannerListener = firestore.collection("profileBanner")
            .document("config")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FIRESTORE_AUDIT", "[PERMISSION_ERROR] Path: profileBanner/config | UID: $uid | AppVersion: $appVersion | Code: ${error.code} | Msg: ${error.message}", error)
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    val banner = ProfileBannerConfig(
                        id = snapshot.id,
                        imageUrl = snapshot.getString("imageUrl") ?: _globalConfig.value.bannerConfig.imageUrl,
                        title = snapshot.getString("title") ?: _globalConfig.value.bannerConfig.title,
                        subtitle = snapshot.getString("subtitle") ?: _globalConfig.value.bannerConfig.subtitle,
                        actionType = snapshot.getString("actionType") ?: "loyalty",
                        actionId = snapshot.getString("actionId") ?: "",
                        active = snapshot.getBoolean("active") ?: true,
                        priority = snapshot.getLong("priority")?.toInt() ?: 1
                    )
                    _globalConfig.value = _globalConfig.value.copy(bannerConfig = banner)
                }
            }
    }

    private fun loadMockDefaults() {
        _coupons.value = emptyList()
        _timeline.value = emptyList()
    }

    fun updateSettings(newSettings: CustomerSettings) {
        _customerSettings.value = newSettings
    }

    fun addWalletTopUp(amount: Double) {
        val current = _walletInfo.value
        val newBalance = current.balance + amount
        val nowStr = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())
        val newTx = WalletTransaction(
            id = System.currentTimeMillis().toString(),
            type = "Recarga Wallet",
            amount = amount,
            date = nowStr,
            description = "Recarga exitosa vía Tarjeta"
        )
        _walletInfo.value = current.copy(
            balance = newBalance,
            movements = listOf(newTx) + current.movements
        )
    }

    fun stopListening() {
        bannerListener?.remove()
        configListener?.remove()
    }
}
