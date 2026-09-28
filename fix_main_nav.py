with open('app/src/main/java/com/example/MainActivity.kt', 'r') as f:
    content = f.read()

content = content.replace('composable("admin_dashboard_screen") {', 'composable(Screen.Admin.route) {')

# Find AdminDashboardScreen call inside the original Screen.Admin.route
import re
# We need to make sure we pass onNavigateToUsers
content = content.replace("""                        AdminDashboardScreen(
                            onBack = { navController.popBackStack() },
                            onAsignarPedidoBackend = { pedidoId, motorizadoId ->""", """                        AdminDashboardScreen(
                            onBack = { navController.popBackStack() },
                            onNavigateToUsers = { navController.navigate("admin_users") },
                            onAsignarPedidoBackend = { pedidoId, motorizadoId ->""")

with open('app/src/main/java/com/example/MainActivity.kt', 'w') as f:
    f.write(content)
