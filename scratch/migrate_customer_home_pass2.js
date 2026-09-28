const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Checkout saved addresses
code = code.replace('colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),\n                                        border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0))',
'colors = CardDefaults.cardColors(containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow),\n                                        border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('Icon(iconVector, contentDescription = null, tint = if (isSelected) BluePrimary else Color(0xFF64748B), modifier = Modifier.size(22.dp))\n                                            Column(modifier = Modifier.weight(1f)) {\n                                                Text(addr.label.ifBlank { "Dirección Guardada" }, fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF0F172A))\n                                                Text(addr.fullAddress, fontSize = 11.sp, color = Color(0xFF475569), maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium)',
'Icon(iconVector, contentDescription = null, tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))\n                                            Column(modifier = Modifier.weight(1f)) {\n                                                Text(addr.label.ifBlank { "Dirección Guardada" }, fontWeight = FontWeight.Black, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)\n                                                Text(addr.fullAddress, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium)');

// Custom address option card
code = code.replace('colors = CardDefaults.cardColors(containerColor = if (isCustomAddressSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),\n                                    border = BorderStroke(if (isCustomAddressSelected) 2.dp else 1.dp, if (isCustomAddressSelected) BluePrimary else Color(0xFFE2E8F0))',
'colors = CardDefaults.cardColors(containerColor = if (isCustomAddressSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow),\n                                    border = BorderStroke(if (isCustomAddressSelected) 2.dp else 1.dp, if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('Icon(Icons.Default.AddLocation, contentDescription = null, tint = if (isCustomAddressSelected) BluePrimary else Color(0xFF64748B), modifier = Modifier.size(22.dp))\n                                        Text("➕ Usar otra dirección", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isCustomAddressSelected) BluePrimary else Color(0xFF334155))',
'Icon(Icons.Default.AddLocation, contentDescription = null, tint = if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))\n                                        Text("➕ Usar otra dirección", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)');

// Custom address textfield
code = code.replace('placeholder = { Text("Ej: Semáforos UCA 2c al lago, Casa #45", fontSize = 12.sp, color = Color(0xFF64748B)) },',
'placeholder = { Text("Ej: Semáforos UCA 2c al lago, Casa #45", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },');

code = code.replace('unfocusedBorderColor = Color(0xFFCBD5E1),\n                                    focusedTextColor = Color(0xFF0F172A),\n                                    unfocusedTextColor = Color(0xFF0F172A)',
'unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,\n                                    focusedTextColor = MaterialTheme.colorScheme.onSurface,\n                                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface');

// Payment method card
code = code.replace('colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),\n                                    border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0))',
'colors = CardDefaults.cardColors(containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow),\n                                    border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('Text(label, fontWeight = FontWeight.Black, fontSize = 13.sp, color = if (isSelected) BluePrimary else Color(0xFF334155))',
'Text(label, fontWeight = FontWeight.Black, fontSize = 13.sp, color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface)');

// Model B banner
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),\n                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('color = Color(0xFF334155)',
'color = MaterialTheme.colorScheme.onSurfaceVariant');

// Confirm order button
code = code.replace('colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8), contentColor = Color.White)',
'colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary)');

// Notifications empty state
code = code.replace('Text("No tienes notificaciones por el momento.", color = Color.Gray, fontSize = 13.sp)',
'Text("No tienes notificaciones por el momento.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)');

// CategoryCard
code = code.replace('Text(\n                text = name,\n                fontSize = 15.sp,\n                fontWeight = FontWeight.ExtraBold,\n                color = Color(0xFF1E293B),',
'Text(\n                text = name,\n                fontSize = 15.sp,\n                fontWeight = FontWeight.ExtraBold,\n                color = MaterialTheme.colorScheme.onSurface,');

// BranchCard rating text
code = code.replace('Text(rating.toString(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))',
'Text(rating.toString(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)');

// Search result chevron
code = code.replace('tint = Color(0xFF94A3B8),\n                            modifier = Modifier.size(20.dp)',
'tint = MaterialTheme.colorScheme.onSurfaceVariant,\n                            modifier = Modifier.size(20.dp)');

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
console.log('CustomerHomeScreen.kt second pass completed!');
