package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.domain.model.PromotionalPopup
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*

/**
 * Repositorio reactivo y motor de elegibilidad para Pop-Ups Promocionales (Actividad #10 Enterprise).
 * Controla: Vigencia temporal, prioridad determinística, segmentación Multi-Tenant y frecuencia de visualización.
 */
class PromotionalPopupRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _activePopups = MutableStateFlow<List<PromotionalPopup>>(emptyList())
    val activePopups: StateFlow<List<PromotionalPopup>> = _activePopups.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null
    private val sessionDismissedIds = mutableSetOf<String>()

    fun startListening(tenantId: String? = null) {
        if (listenerRegistration != null) return

        listenerRegistration = firestore.collection("promotional_popups")
            .whereEqualTo("active", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Error escuchando /promotional_popups: ${error.message}", error)
                    return@addSnapshotListener
                }

                if (snapshot != null) {
                    val popups = snapshot.documents.mapNotNull { doc ->
                        try {
                            doc.toObject(PromotionalPopup::class.java)?.copy(id = doc.id)
                        } catch (e: Exception) {
                            Log.w(TAG, "Error deserializando promotional_popups doc ${doc.id}: ${e.message}")
                            null
                        }
                    }

                    val now = System.currentTimeMillis()
                    val filtered = popups.filter { p ->
                        // 1. Filtrado Multi-Tenant
                        val pTenant = p.tenantId.trim().uppercase()
                        val tenantMatch = pTenant.isEmpty() || pTenant == "GLOBAL" ||
                                (tenantId != null && pTenant.equals(tenantId.trim().uppercase(), ignoreCase = true))

                        // 2. Filtrado de Vigencia Temporal (startAt / endAt)
                        val isWithinTime = isWithinValidityPeriod(p, now)

                        tenantMatch && isWithinTime
                    }.sortedByDescending { it.priority }

                    _activePopups.value = filtered
                    Log.d(TAG, "Pop-ups activos y vigentes: ${filtered.size} (Tenant: ${tenantId ?: "GLOBAL"})")
                }
            }
    }

    fun stopListening() {
        listenerRegistration?.remove()
        listenerRegistration = null
    }

    /**
     * Evalúa la vigencia temporal de la campaña contra el reloj autoritativo
     */
    private fun isWithinValidityPeriod(popup: PromotionalPopup, now: Long): Boolean {
        try {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
            val simpleFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

            if (popup.startDate.isNotBlank()) {
                val startMillis = try {
                    isoFormat.parse(popup.startDate)?.time ?: simpleFormat.parse(popup.startDate)?.time ?: 0L
                } catch (e: Exception) {
                    0L
                }
                if (startMillis > 0 && now < startMillis) return false
            }

            if (popup.endDate.isNotBlank()) {
                val endMillis = try {
                    isoFormat.parse(popup.endDate)?.time ?: simpleFormat.parse(popup.endDate)?.time ?: Long.MAX_VALUE
                } catch (e: Exception) {
                    Long.MAX_VALUE
                }
                if (endMillis > 0 && now > endMillis) return false
            }

            return true
        } catch (e: Exception) {
            Log.w(TAG, "Error validando fechas de campaña ${popup.id}: ${e.message}")
            return true
        }
    }

    /**
     * Retorna el pop-up de mayor prioridad que es elegible para mostrarse según la frecuencia configurada.
     */
    fun getTopEligiblePopup(context: Context, targetContext: String = "CUSTOMER_HOME"): PromotionalPopup? {
        val candidates = _activePopups.value.filter {
            it.context.equals(targetContext, ignoreCase = true) || it.context.equals("APP_OPEN", ignoreCase = true)
        }

        for (popup in candidates) {
            if (shouldShowPopup(popup, context)) {
                return popup
            }
        }
        return null
    }

    /**
     * Evalúa si una campaña debe mostrarse según su frecuencia (ONCE, ONCE_PER_SESSION, ONCE_PER_DAY, ALWAYS)
     */
    fun shouldShowPopup(popup: PromotionalPopup, context: Context): Boolean {
        if (sessionDismissedIds.contains(popup.id)) {
            return false
        }

        val prefs = getPrefs(context)
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        return when (popup.frequency.uppercase()) {
            "ONCE" -> {
                !prefs.getBoolean("shown_once_${popup.id}", false)
            }
            "ONCE_PER_DAY" -> {
                val lastShownDate = prefs.getString("last_shown_date_${popup.id}", "")
                lastShownDate != todayStr
            }
            "ONCE_PER_SESSION" -> {
                !sessionDismissedIds.contains(popup.id)
            }
            "ALWAYS", "WHILE_ACTIVE" -> true
            else -> !sessionDismissedIds.contains(popup.id)
        }
    }

    /**
     * Marca el pop-up como visualizado / cerrado para respetar su frecuencia
     */
    fun recordPopupDismissed(popup: PromotionalPopup, context: Context) {
        sessionDismissedIds.add(popup.id)

        val prefs = getPrefs(context)
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        prefs.edit()
            .putBoolean("shown_once_${popup.id}", true)
            .putString("last_shown_date_${popup.id}", todayStr)
            .putLong("last_shown_timestamp_${popup.id}", System.currentTimeMillis())
            .apply()

        Log.d(TAG, "Pop-up ${popup.id} descartado y frecuencia persistida.")
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences("bluesystem_popups_pref", Context.MODE_PRIVATE)
    }

    companion object {
        private const val TAG = "PromoPopupRepo"
    }
}
