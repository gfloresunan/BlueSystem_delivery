with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

# We will remove the internal UserCard and instead show a button to navigate to the new screen
old_users_tab = """                    2 -> {
                        // Pestaña 3: Gestión de Usuarios
                        if (allUsers.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text("No hay usuarios registrados", color = Color.Gray, fontSize = 14.sp)
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(allUsers) { user ->
                                    UserCard(
                                        user = user,
                                        onEditClick = { userToEdit = user },
                                        onDeleteClick = { userToDelete = user }
                                    )
                                }
                            }
                        }
                    }"""

new_users_tab = """                    2 -> {
                        // Pestaña 3: Gestión de Usuarios Redirección
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color(0xFF6366F1))
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("Gestión Avanzada de Usuarios", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Administra roles, accesos y solicitudes pendientes.", color = Color.Gray, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = onNavigateToUsers,
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Abrir Gestor de Usuarios", modifier = Modifier.padding(8.dp))
                                }
                            }
                        }
                    }"""

content = content.replace(old_users_tab, new_users_tab)

# Add onNavigateToUsers to signature
content = content.replace(
    """fun AdminDashboardScreen(
    onBack: () -> Unit,
    onAsignarPedidoBackend: suspend (pedidoId: String, motorizadoId: String) -> Unit,
    firebaseManager: FirebaseManager,
    onLogout: () -> Unit
) {""",
    """fun AdminDashboardScreen(
    onBack: () -> Unit,
    onNavigateToUsers: () -> Unit = {},
    onAsignarPedidoBackend: suspend (pedidoId: String, motorizadoId: String) -> Unit,
    firebaseManager: FirebaseManager,
    onLogout: () -> Unit
) {"""
)

# Remove the old UserCard from AdminDashboardScreen.kt so there are no conflicts
import re
content = re.sub(r'@Composable\nfun UserCard\(.*?\n\}', '', content, flags=re.DOTALL)

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(content)
