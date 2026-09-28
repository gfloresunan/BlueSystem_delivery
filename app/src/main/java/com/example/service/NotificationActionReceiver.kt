package com.example.service

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout

class NotificationActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val action = intent.action
        val orderId = intent.getStringExtra("orderId") ?: return
        val notificationId = intent.getIntExtra("notificationId", -1)
        val currentUserId = intent.getStringExtra("currentUserId") ?: ""

        Log.d("NotificationReceiver", "Action received: $action for Order: $orderId, User: $currentUserId")

        // Cancel the notification immediately
        if (notificationId != -1) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
        }

        val finalActionType = when (action) {
            "com.example.ACTION_ACCEPT" -> "accept"
            "com.example.ACTION_REJECT" -> "reject"
            else -> {
                pendingResult.finish()
                return
            }
        }

        val toastMsg = if (finalActionType == "accept") {
            "Procesando aceptación del pedido... 🍳"
        } else {
            "Procesando rechazo del pedido... ❌"
        }
        Toast.makeText(context.applicationContext, toastMsg, Toast.LENGTH_SHORT).show()

        // Use SupervisorJob to ensure the scope survives and runs to completion
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        scope.launch {
            try {
                withTimeout(7500) { // goAsync() limit is ~10s; 7.5s leaves margin for cleanup
                    if (currentUserId.isBlank()) {
                        throw Exception("No se detectó un usuario autenticado activo.")
                    }

                    val db = FirebaseFirestore.getInstance()

                    // Execute transaction
                    db.runTransaction { transaction ->
                        // 1. Get User Profile to determine user type (business or driver)
                        val userRef = db.collection("users").document(currentUserId)
                        val userSnap = transaction.get(userRef)
                        val userType = if (userSnap.exists()) {
                            userSnap.getString("userType") ?: userSnap.getString("role") ?: userSnap.getString("eiamRole") ?: userSnap.getString("rol") ?: "customer"
                        } else {
                            "customer"
                        }

                        Log.d("NotificationReceiver", "User profile found inside transaction. userType: $userType")

                        // 2. Load order document
                        val orderRef = db.collection("orders").document(orderId)
                        val orderSnap = try { transaction.get(orderRef) } catch (e: Exception) { null }

                        val orderExists = orderSnap != null && orderSnap.exists()

                        if (!orderExists) {
                            throw Exception("El pedido no existe o fue eliminado.")
                        }

                        // Extract values
                        val orderStatus = orderSnap!!.getString("status") ?: ""
                        val orderBusinessId = orderSnap!!.getString("businessId") ?: ""
                        val orderAssignedCourierId = orderSnap!!.getString("assignedCourierId") ?: orderSnap.getString("motorizadoId") ?: ""

                        Log.d("NotificationReceiver", "Current states - orderStatus: $orderStatus")

                        val normalizedUserType = userType.lowercase()

                        // 3. Process Business / Comercio Actions
                        if (normalizedUserType in listOf("business", "comercio", "merchant", "merchant_owner", "merchant_manager", "cashier", "cook", "supervisor")) {
                            if (finalActionType == "accept") {
                                // Validation: Only allow accepting if pending/creado
                                val isPending = orderStatus.equals("pending", ignoreCase = true) || 
                                                orderStatus.equals("creado", ignoreCase = true) ||
                                                orderStatus.isEmpty()

                                if (!isPending) {
                                    throw Exception("El pedido ya fue procesado o se encuentra en estado: $orderStatus")
                                }

                                // Optional: Validate business ownership
                                if (orderBusinessId.isNotBlank() && orderBusinessId != currentUserId) {
                                    throw Exception("Este pedido pertenece a otro comercio aliado.")
                                }

                                // Apply update for acceptance
                                transaction.update(orderRef, mapOf(
                                    "status" to "preparing",
                                    "acceptedBy" to currentUserId,
                                    "acceptedAt" to System.currentTimeMillis()
                                ))
                            } else {
                                // Reject by Business
                                transaction.update(orderRef, mapOf(
                                    "status" to "cancelled"
                                ))
                            }
                        } 
                        // 4. Process Driver / Motorizado Actions
                        else if (normalizedUserType in listOf("driver", "motorizado", "courier", "repartidor")) {
                            if (finalActionType == "accept") {
                                // Validation: Make sure it's not already assigned to someone else
                                if (orderAssignedCourierId.isNotBlank() && orderAssignedCourierId != currentUserId) {
                                    throw Exception("Este pedido ya fue tomado por otro repartidor.")
                                }

                                // Apply driver assignment & change state
                                transaction.update(orderRef, mapOf(
                                    "status" to "in_transit",
                                    "courierPhase" to 1,
                                    "assignedCourierId" to currentUserId,
                                    "motorizadoId" to currentUserId
                                ))
                            } else {
                                // Reject by driver (re-releases the order)
                                if (orderAssignedCourierId == currentUserId) {
                                    transaction.update(orderRef, mapOf(
                                        "status" to "ready",
                                        "courierPhase" to null,
                                        "assignedCourierId" to "",
                                        "motorizadoId" to ""
                                    ))
                                }
                            }
                        }
                        else {
                            throw Exception("Tu rol de usuario ($userType) no tiene permisos para realizar esta acción.")
                        }

                        null
                    }.await()

                    // Success visual confirmation
                    launch(Dispatchers.Main) {
                        val completedMsg = if (finalActionType == "accept") {
                            "¡Pedido aceptado exitosamente! 🎉"
                        } else {
                            "Pedido rechazado correctamente."
                        }
                        Toast.makeText(context.applicationContext, completedMsg, Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("NotificationReceiver", "Transaction failed for order $orderId", e)
                launch(Dispatchers.Main) {
                    val errorMsg = e.message ?: "no se pudo completar la operación."
                    Toast.makeText(context.applicationContext, "Error: $errorMsg", Toast.LENGTH_LONG).show()
                }
            } finally {
                pendingResult.finish()
                scope.cancel()
            }
        }
    }
}
