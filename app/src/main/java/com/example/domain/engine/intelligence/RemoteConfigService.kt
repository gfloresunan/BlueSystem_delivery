package com.example.domain.engine.intelligence

import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

data class RemoteParameters(
    val baseDeliveryFee: Double = 50.0,
    val platformCommissionPct: Double = 15.0,
    val maxCoverageRadiusKm: Double = 15.0,
    val isDynamicPricingEnabled: Boolean = true,
    val isFraudDetectionEnabled: Boolean = true
)

object RemoteConfigService {

    private val db = FirebaseFirestore.getInstance()

    /**
     * Escucha en tiempo real los parámetros remotos de configuración almacenados en Firestore.
     */
    fun listenToRemoteParameters(): Flow<RemoteParameters> = flow {
        val docRef = db.collection("remoteConfig").document("parameters")
        val listener = docRef.addSnapshotListener { snapshot, error ->
            if (error == null && snapshot != null && snapshot.exists()) {
                val baseFee = snapshot.getDouble("baseDeliveryFee") ?: 50.0
                val commPct = snapshot.getDouble("platformCommissionPct") ?: 15.0
                val radius = snapshot.getDouble("maxCoverageRadiusKm") ?: 15.0
                val dynamicPricing = snapshot.getBoolean("isDynamicPricingEnabled") ?: true
                val fraudDetection = snapshot.getBoolean("isFraudDetectionEnabled") ?: true

                RemoteParameters(
                    baseDeliveryFee = baseFee,
                    platformCommissionPct = commPct,
                    maxCoverageRadiusKm = radius,
                    isDynamicPricingEnabled = dynamicPricing,
                    isFraudDetectionEnabled = fraudDetection
                )
            }
        }
    }
}
