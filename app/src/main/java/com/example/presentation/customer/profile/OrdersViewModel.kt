package com.example.presentation.customer.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.Pedido
import com.example.toPedidoSafely
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class OrdersViewModel : ViewModel() {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private val _orders = MutableStateFlow<List<Pedido>>(emptyList())
    val orders: StateFlow<List<Pedido>> = _orders.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        loadOrders()
    }

    private var ordersListener: com.google.firebase.firestore.ListenerRegistration? = null
    private var fallbackListener: com.google.firebase.firestore.ListenerRegistration? = null

    private fun loadOrders() {
        val uid = auth.currentUser?.uid ?: run {
            android.util.Log.w("FIRESTORE_AUDIT", "[LISTENER_CANCELLED] OrdersViewModel: Intento de abrir listener sin usuario autenticado.")
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            ordersListener?.remove()
            fallbackListener?.remove()
            val appVersion = com.example.BuildConfig.VERSION_NAME
            android.util.Log.d("FIRESTORE_AUDIT", "[LISTENER_INIT] Path: orders (customerId=$uid) | UID: $uid | AppVersion: $appVersion")
            ordersListener = db.collection("orders")
                .whereEqualTo("customerId", uid)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        android.util.Log.e("FIRESTORE_AUDIT", "[PERMISSION_ERROR] Path: orders (customerId=$uid) | UID: $uid | AppVersion: $appVersion | Code: ${error.code} | Msg: ${error.message}", error)
                        fallbackListener = db.collection("orders")
                            .whereEqualTo("customerId", uid)
                            .addSnapshotListener { snap2, err2 ->
                                if (err2 != null) {
                                    android.util.Log.e("FIRESTORE_AUDIT", "[PERMISSION_ERROR_FALLBACK] Path: orders (customerId=$uid) | UID: $uid | AppVersion: $appVersion | Code: ${err2.code} | Msg: ${err2.message}", err2)
                                }
                                val list = snap2?.documents?.mapNotNull {
                                    it.toPedidoSafely()
                                }?.sortedByDescending { it.createdAt?.seconds ?: 0L } ?: emptyList()
                                _orders.value = list
                                _isLoading.value = false
                            }
                        return@addSnapshotListener
                    }
                    if (snapshot != null) {
                        val list = snapshot.documents.mapNotNull {
                            it.toPedidoSafely()
                        }
                        _orders.value = list
                    }
                    _isLoading.value = false
                }
        }
    }

    override fun onCleared() {
        super.onCleared()
        ordersListener?.remove()
        ordersListener = null
        fallbackListener?.remove()
        fallbackListener = null
    }

    fun submitReview(
        orderId: String,
        businessId: String,
        courierId: String,
        businessRating: Int,
        courierRating: Int,
        comments: String,
        courierComments: String = "",
        tripId: String = "",
        reviewType: String = "",
        onComplete: ((Boolean, String?) -> Unit)? = null
    ) {
        val uid = auth.currentUser?.uid ?: run {
            onComplete?.invoke(false, "Usuario no autenticado")
            return
        }
        viewModelScope.launch {
            try {
                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                val payload = hashMapOf<String, Any>(
                    "orderId" to orderId,
                    "businessId" to businessId,
                    "courierId" to courierId,
                    "businessRating" to businessRating,
                    "courierRating" to courierRating,
                    "comments" to comments,
                    "courierComments" to courierComments
                )
                if (tripId.isNotBlank()) payload["tripId"] = tripId
                if (reviewType.isNotBlank()) payload["reviewType"] = reviewType

                functions.getHttpsCallable("submitOrderReview")
                    .call(payload)
                    .await()

                com.example.AnalyticsHelper.logRateOrder(if (tripId.isNotBlank()) tripId else orderId, businessRating.toFloat(), courierRating.toFloat())
                onComplete?.invoke(true, null)
            } catch (e: Exception) {
                android.util.Log.e("OrdersViewModel", "Error submitting authoritative review for order $orderId: ${e.message}", e)
                onComplete?.invoke(false, e.message)
            }
        }
    }

    fun cancelOrder(orderId: String, onFinished: (Boolean) -> Unit = {}) {
        if (orderId.isEmpty()) return
        viewModelScope.launch {
            try {
                val now = com.google.firebase.Timestamp.now()
                db.collection("orders").document(orderId)
                    .update(
                        mapOf(
                            "status" to "cancelled",
                            "estado" to "cancelled",
                            "cancelReason" to "Cancelado por el cliente desde la app",
                            "cancelledAt" to now,
                            "updatedAt" to now
                        )
                    ).await()
                android.util.Log.i("OrdersViewModel", "Pedido $orderId cancelado exitosamente por el cliente.")
                onFinished(true)
            } catch (e: Exception) {
                android.util.Log.e("OrdersViewModel", "Error cancelando pedido $orderId: ${e.message}", e)
                onFinished(false)
            }
        }
    }
}
