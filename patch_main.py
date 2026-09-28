import re

with open('app/src/main/java/com/example/MainActivity.kt', 'r') as f:
    content = f.read()

# Add import
import_statement = "import com.example.presentation.customer.CustomerHomeScreen\n"
if "CustomerHomeScreen" not in content:
    content = content.replace("import com.example.presentation.business.BusinessDashboardScreen", "import com.example.presentation.business.BusinessDashboardScreen\n" + import_statement)

# Fix customer_dashboard and add guest_home
old_customer_dash = """                    composable("customer_dashboard") {
                        SolicitarEnvioScreen(
                            firebaseManager = firebaseManager,
                            onPedidoCreadoExitosamente = { nuevoPedidoId ->
                                navController.navigate(Screen.EsperandoRepartidor.createRoute(nuevoPedidoId))
                            },
                            onGuardarPedidoFirestore = { id, origen, destino, metodo, costo, origenLat, origenLng, destinoLat, destinoLng, amountPaid, changeNeeded, receiptUrl, referenceNumber ->
                                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                val clienteId = authManager.currentUser?.uid ?: "usr_cliente_actual"
                                val unifiedOrder = mapOf(
                                    "pedidoId" to id,
                                    "clienteId" to clienteId,
                                    "estado" to "PENDIENTE",
                                    "origen" to origen,
                                    "destino" to destino,
                                    "metodoPago" to metodo,
                                    "costo" to costo,
                                    "origenLat" to origenLat,
                                    "origenLng" to origenLng,
                                    "destinoLat" to destinoLat,
                                    "destinoLng" to destinoLng,
                                    "amountPaid" to amountPaid,
                                    "changeNeeded" to changeNeeded,
                                    "receiptUrl" to receiptUrl,
                                    "referenceNumber" to referenceNumber,
                                    "timestamp" to System.currentTimeMillis()
                                )
                                db.collection("pedidos").document(id).set(unifiedOrder)
                            },
                            onLogout = {
                                authManager.cerrarSesion()
                                navController.navigate(Screen.LoginRegister.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }"""

new_customer_dash = """                    composable("guest_home") {
                        CustomerHomeScreen(
                            navController = navController,
                            firebaseManager = firebaseManager,
                            isGuest = true,
                            onLogout = {
                                navController.navigate(Screen.LoginRegister.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }
                    composable("customer_dashboard") {
                        CustomerHomeScreen(
                            navController = navController,
                            firebaseManager = firebaseManager,
                            isGuest = false,
                            onLogout = {
                                authManager.cerrarSesion()
                                navController.navigate(Screen.LoginRegister.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }"""

content = content.replace(old_customer_dash, new_customer_dash)

# Make sure we add firebaseManager to AuthScreen
content = content.replace(
"""                        AuthScreen(
                            navController = navController,
                            viewModel = authViewModel
                        )""",
"""                        AuthScreen(
                            navController = navController,
                            viewModel = authViewModel,
                            firebaseManager = firebaseManager
                        )"""
)

with open('app/src/main/java/com/example/MainActivity.kt', 'w') as f:
    f.write(content)
print("MainActivity updated")
