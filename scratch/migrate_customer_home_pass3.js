const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Cart item card in modal step 1
code = code.replace(
`                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {`,
`                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            ) {`
);

code = code.replace(
`                                        Text(
                                            text = "🏪 $bizName",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            color = BluePrimary
                                        )
                                        Text(
                                            text = "Envío: C$ \${fee.toInt()}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF475569)
                                        )`,
`                                        Text(
                                            text = "🏪 $bizName",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(
                                            text = "Envío: C$ \${fee.toInt()}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )`
);

code = code.replace(
`                                                Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                                Text("C$ \${String.format(\"%.2f\", item.price)} c/u", fontSize = 11.sp, color = Color(0xFF64748B))`,
`                                                Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                                Text("C$ \${String.format(\"%.2f\", item.price)} c/u", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)`
);

code = code.replace(
`                                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = Color(0xFF64748B), modifier = Modifier.size(20.dp))`,
`                                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))`
);

code = code.replace(
`                                                    Icon(Icons.Default.AddCircle, contentDescription = "Más", tint = BluePrimary, modifier = Modifier.size(20.dp))`,
`                                                    Icon(Icons.Default.AddCircle, contentDescription = "Más", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))`
);

code = code.replace(
`                                                Text(
                                                    text = "\${item.quantity}",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp,
                                                    color = Color(0xFF0F172A),
                                                    modifier = Modifier.padding(horizontal = 4.dp)
                                                )`,
`                                                Text(
                                                    text = "\${item.quantity}",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier.padding(horizontal = 4.dp)
                                                )`
);

// Coupon card
code = code.replace(
`                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("🎟️ CÓDIGO DE DESCUENTO O CUPÓN", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BluePrimary)`,
`                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("🎟️ CÓDIGO DE DESCUENTO O CUPÓN", fontSize = 12.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)`
);

code = code.replace(
`                                        placeholder = { Text("Ej: BIENVENIDA10", fontSize = 12.sp, color = Color(0xFF94A3B8)) },`,
`                                        placeholder = { Text("Ej: BIENVENIDA10", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },`
);

code = code.replace(
`                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = BluePrimary,
                                            unfocusedBorderColor = Color(0xFFCBD5E1),
                                            focusedTextColor = Color(0xFF0F172A),
                                            unfocusedTextColor = Color(0xFF0F172A)
                                        )`,
`                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                                        )`
);

code = code.replace(
`                                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary, contentColor = Color.White),`,
`                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),`
);

// Financial summary step 1
code = code.replace(
`                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal Productos", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                                Text("C$ \${String.format(\"%.2f\", CartManager.subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Envío (\${groupedByBiz.size} comercio\${if (groupedByBiz.size > 1) \"s\" else \"\"})", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                                Text("C$ \${String.format(\"%.2f\", totalDeliveryFees)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }`,
`                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal Productos", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                                Text("C$ \${String.format(\"%.2f\", CartManager.subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Envío (\${groupedByBiz.size} comercio\${if (groupedByBiz.size > 1) \"s\" else \"\"})", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                                Text("C$ \${String.format(\"%.2f\", totalDeliveryFees)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            }`
);

code = code.replace(
`                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total a Pagar", fontSize = 15.sp, fontWeight = FontWeight.Black, color = BluePrimary)
                                Text("C$ \${String.format(\"%.2f\", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BluePrimary)
                            }`,
`                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total a Pagar", fontSize = 15.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                                Text("C$ \${String.format(\"%.2f\", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                            }`
);

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
console.log('Pass 3 applied successfully!');
