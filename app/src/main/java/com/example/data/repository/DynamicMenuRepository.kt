package com.example.data.repository

import android.util.Log
import com.example.domain.model.DynamicMenuItem
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Repositorio reactivo para el Menú Dinámico Administrable (Actividad #10 Enterprise).
 * Conecta con Firestore SSOT `/dynamic_menu` en tiempo real con aislamiento Multi-Tenant y fallback offline.
 */
class DynamicMenuRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _dynamicMenuItems = MutableStateFlow<List<DynamicMenuItem>>(emptyList())
    val dynamicMenuItems: StateFlow<List<DynamicMenuItem>> = _dynamicMenuItems.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(tenantId: String? = null) {
        if (listenerRegistration != null) return

        listenerRegistration = firestore.collection("dynamic_menu")
            .whereEqualTo("active", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Error escuchando /dynamic_menu: ${error.message}", error)
                    return@addSnapshotListener
                }

                if (snapshot != null) {
                    val items = snapshot.documents.mapNotNull { doc ->
                        try {
                            doc.toObject(DynamicMenuItem::class.java)?.copy(id = doc.id)
                        } catch (e: Exception) {
                            Log.w(TAG, "Error deserializando dynamic_menu doc ${doc.id}: ${e.message}")
                            null
                        }
                    }

                    // Filtrado Multi-Tenant: Incluir elementos GLOBAL o pertenecientes al tenant del cliente
                    val filtered = items.filter { item ->
                        val itemTenant = item.tenantId.trim().uppercase()
                        itemTenant.isEmpty() || itemTenant == "GLOBAL" || 
                        (tenantId != null && itemTenant.equals(tenantId.trim().uppercase(), ignoreCase = true))
                    }.sortedBy { it.order }

                    _dynamicMenuItems.value = filtered
                    Log.d(TAG, "Menú dinámico actualizado: ${filtered.size} items (Tenant: ${tenantId ?: "GLOBAL"})")
                }
            }
    }

    fun stopListening() {
        listenerRegistration?.remove()
        listenerRegistration = null
    }

    companion object {
        private const val TAG = "DynamicMenuRepo"
    }
}
