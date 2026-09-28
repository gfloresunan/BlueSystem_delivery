import re

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'r') as f:
    content = f.read()

# We know the valid content ends at the end of `orderToAssign` dialog.
# Let's find the string:
#             confirmButton = {
#                 TextButton(onClick = { orderToAssign = null }) {
#                     Text("Cancelar", fontWeight = FontWeight.Bold)
#                 }
#             }
#         )
#     }

target = '            confirmButton = {\n                TextButton(onClick = { orderToAssign = null }) {\n                    Text("Cancelar", fontWeight = FontWeight.Bold)\n                }\n            }\n        )\n    }'
index = content.find(target)
if index != -1:
    valid_content = content[:index + len(target)] + '\n}\n\n'
else:
    print("Could not find target!")
    exit(1)

# Now append the composables
valid_content += """
@Composable
fun OrderCard(
    order: com.example.Pedido,
    onAssignClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Orden #${order.pedidoId.takeLast(8).uppercase()}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF1E293B)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Cliente ID: ${order.customerId.ifEmpty { "Anónimo" }}",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
                
                // Total
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "C$ ${String.format("%.2f", order.total)}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = Color(0xFF6366F1)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Estado actual
                val statusText = order.status.lowercase().ifEmpty { "pending" }
                val (backgroundColor, contentColor, label) = when (statusText) {
                    "pending" -> Triple(Color(0xFFFCE7F3), Color(0xFFDB2777), "Pendiente")
                    "ready" -> Triple(Color(0xFFE0E7FF), Color(0xFF4F46E5), "Asignado")
                    "in_transit" -> Triple(Color(0xFFFEF3C7), Color(0xFFD97706), "En Camino")
                    "delivered" -> Triple(Color(0xFFDCFCE7), Color(0xFF15803D), "Entregado")
                    else -> Triple(Color(0xFFF1F5F9), Color(0xFF475569), statusText.replaceFirstChar { it.uppercase() })
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = backgroundColor
                ) {
                    Text(
                        text = label,
                        color = contentColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                // Botón para asignar o reasignar
                Button(
                    onClick = onAssignClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (statusText == "pending") Color(0xFF6366F1) else Color(0xFFEEF2F6),
                        contentColor = if (statusText == "pending") Color.White else Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Text(
                        text = if (statusText == "pending") "Asignar" else "Reasignar",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun DriverCard(driver: com.example.DriverUser) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(Color(0xFFEEF2F6), shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = driver.nombre.take(1).uppercase(),
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = Color(0xFF6366F1)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = driver.nombre,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = "Teléfono",
                        tint = Color.Gray,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = driver.telefono.ifEmpty { "Sin teléfono" },
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .background(if (driver.active) Color(0xFF10B981) else Color(0xFF94A3B8), shape = CircleShape)
                )
                Text(
                    text = if (driver.active) "Activo" else "Offline",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (driver.active) Color(0xFF10B981) else Color(0xFF94A3B8)
                )
            }
        }
    }
}

@Composable
fun CardKpi(
    titulo: String,
    valor: String,
    colorFondo: Color,
    colorTexto: Color,
    modifier: Modifier = Modifier
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorFondo),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = valor,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 24.sp,
                color = colorTexto
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = titulo,
                fontSize = 12.sp,
                color = colorTexto.copy(alpha = 0.8f)
            )
        }
    }
}
"""

with open('app/src/main/java/com/example/AdminDashboardScreen.kt', 'w') as f:
    f.write(valid_content)
