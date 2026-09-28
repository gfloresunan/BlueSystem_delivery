const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// 1. Top bar and scaffold
code = code.replace('.background(BgLightApp)', '.background(MaterialTheme.colorScheme.background)');

// 2. Avatar
code = code.replace('.background(Color.White, CircleShape)\n                                                .border(2.dp, Color.White.copy(alpha = 0.6f), CircleShape),',
'.background(MaterialTheme.colorScheme.surface, CircleShape)\n                                                .border(2.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f), CircleShape),');

code = code.replace('color = BluePrimary\n                                            }', 'color = MaterialTheme.colorScheme.primary\n                                            }');

// 3. Search Bar Card in Header
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),');

code = code.replace('Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)',
'Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)');

code = code.replace('placeholder = { Text("Locales, platos y productos...", fontSize = 13.sp) },',
'placeholder = { Text("Locales, platos y productos...", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },');

code = code.replace('focusedContainerColor = Color.Transparent,\n                                                    unfocusedContainerColor = Color.Transparent,\n                                                    focusedIndicatorColor = Color.Transparent,\n                                                    unfocusedIndicatorColor = Color.Transparent',
'focusedContainerColor = Color.Transparent,\n                                                    unfocusedContainerColor = Color.Transparent,\n                                                    focusedIndicatorColor = Color.Transparent,\n                                                    unfocusedIndicatorColor = Color.Transparent,\n                                                    focusedTextColor = MaterialTheme.colorScheme.onSurface,\n                                                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface');

code = code.replace('Icon(Icons.Default.Close, contentDescription = "Limpiar", tint = Color.Gray)',
'Icon(Icons.Default.Close, contentDescription = "Limpiar", tint = MaterialTheme.colorScheme.onSurfaceVariant)');

code = code.replace('Icon(Icons.Default.Mic, contentDescription = "Voz", tint = BlueSecondary)',
'Icon(Icons.Default.Mic, contentDescription = "Voz", tint = MaterialTheme.colorScheme.primary)');

code = code.replace('Icon(Icons.Default.Search, contentDescription = "Buscar", tint = Color.Gray)',
'Icon(Icons.Default.Search, contentDescription = "Buscar", tint = MaterialTheme.colorScheme.onSurfaceVariant)');

code = code.replace('color = if (searchQueryText.isEmpty()) Color.Gray else Color.Black,',
'color = if (searchQueryText.isEmpty()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,');

code = code.replace('Icon(Icons.Default.Mic, contentDescription = "Micrófono", tint = BlueSecondary,',
'Icon(Icons.Default.Mic, contentDescription = "Micrófono", tint = MaterialTheme.colorScheme.primary,');

// 4. Categories Section
code = code.replace('text = "Categorías",\n                                      fontWeight = FontWeight.ExtraBold,\n                                      fontSize = 18.sp,\n                                      color = Color(0xFF0F172A),',
'text = "Categorías",\n                                      fontWeight = FontWeight.ExtraBold,\n                                      fontSize = 18.sp,\n                                      color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('color = if (isSelected) BluePrimary else bgCol,\n                                              border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),',
'color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow,\n                                              border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),');

code = code.replace('color = if (isSelected) Color.White else Color(0xFF0F172A)',
'color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface');

// 5. Global Search Results in Home
code = code.replace('text = "Resultados (${searchResults.totalCount})",\n                                              fontWeight = FontWeight.ExtraBold,\n                                              fontSize = 18.sp,\n                                              color = Color(0xFF0F172A)',
'text = "Resultados (${searchResults.totalCount})",\n                                              fontWeight = FontWeight.ExtraBold,\n                                              fontSize = 18.sp,\n                                              color = MaterialTheme.colorScheme.onSurface');

code = code.replace('Text("Limpiar", color = BluePrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)',
'Text("Limpiar", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)');

code = code.replace('color = if (isSelected) BluePrimary else Color(0xFFF1F5F9),\n                                                  border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),',
'color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow,\n                                                  border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),');

code = code.replace('color = if (isSelected) Color.White else Color(0xFF334155),',
'color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,');

// Search empty state card
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n                                              border = BorderStroke(1.dp, Color(0xFFE2E8F0))',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n                                              border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('tint = Color.LightGray,\n                                                      modifier = Modifier.size(52.dp)',
'tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),\n                                                      modifier = Modifier.size(52.dp)');

code = code.replace('color = Color(0xFF0F172A),\n                                                      textAlign = TextAlign.Center',
'color = MaterialTheme.colorScheme.onSurface,\n                                                      textAlign = TextAlign.Center');

code = code.replace('color = Color.Gray,\n                                                      textAlign = TextAlign.Center',
'color = MaterialTheme.colorScheme.onSurfaceVariant,\n                                                      textAlign = TextAlign.Center');

// Filtered category header
code = code.replace('color = Color(0xFF0F172A),\n                                      modifier = Modifier.padding(horizontal = 16.dp)',
'color = MaterialTheme.colorScheme.onSurface,\n                                      modifier = Modifier.padding(horizontal = 16.dp)');

// Section titles
code = code.replace('text = "Comercios Cerca de Ti 🏢",\n                                      fontWeight = FontWeight.ExtraBold,\n                                      fontSize = 18.sp,\n                                      color = Color(0xFF0F172A),',
'text = "Comercios Cerca de Ti 🏢",\n                                      fontWeight = FontWeight.ExtraBold,\n                                      fontSize = 18.sp,\n                                      color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('text = "Comercios Destacados ⭐",\n                                      fontWeight = FontWeight.Bold,\n                                      fontSize = 18.sp,\n                                      color = Color(0xFF1E293B),',
'text = "Comercios Destacados ⭐",\n                                      fontWeight = FontWeight.Bold,\n                                      fontSize = 18.sp,\n                                      color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('text = "Productos Estrella ⭐",\n                                fontWeight = FontWeight.ExtraBold,\n                                fontSize = 18.sp,\n                                color = Color(0xFF0F172A),',
'text = "Productos Estrella ⭐",\n                                fontWeight = FontWeight.ExtraBold,\n                                fontSize = 18.sp,\n                                color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('text = "Productos con Descuentos 🏷️",\n                            fontWeight = FontWeight.Bold,\n                            fontSize = 18.sp,\n                            color = Color(0xFF1E293B),',
'text = "Productos con Descuentos 🏷️",\n                            fontWeight = FontWeight.Bold,\n                            fontSize = 18.sp,\n                            color = MaterialTheme.colorScheme.onSurface,');

// A->B Delivery Button
code = code.replace('colors = ButtonDefaults.buttonColors(\n                                            containerColor = Color(0xFF38BDF8)\n                                        ),',
'colors = ButtonDefaults.buttonColors(\n                                            containerColor = MaterialTheme.colorScheme.primary,\n                                            contentColor = MaterialTheme.colorScheme.onPrimary\n                                        ),');

code = code.replace('color = Color(0xFF0F172A),\n                                                letterSpacing = 0.5.sp',
'color = MaterialTheme.colorScheme.onPrimary,\n                                                letterSpacing = 0.5.sp');

code = code.replace('tint = Color(0xFF0F172A),\n                                                modifier = Modifier.size(16.dp)',
'tint = MaterialTheme.colorScheme.onPrimary,\n                                                modifier = Modifier.size(16.dp)');

// 6. Dialogs & Cart Modals
code = code.replace('color = Color(0xFF0F172A)\n                        )',
'color = MaterialTheme.colorScheme.onSurface\n                        )');

code = code.replace('color = Color(0xFF475569)\n                    )',
'color = MaterialTheme.colorScheme.onSurfaceVariant\n                    )');

code = code.replace('containerColor = Color.White\n        )\n    }\n\n    // DIÁLOGO DE NOTIFICACIONES',
'containerColor = MaterialTheme.colorScheme.surface\n        )\n    }\n\n    // DIÁLOGO DE NOTIFICACIONES');

code = code.replace('containerColor = Color.White\n        )\n    }\n}',
'containerColor = MaterialTheme.colorScheme.surface\n        )\n    }\n}');

// Cart Item Cards in Modal
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),\n                            border = BorderStroke(1.dp, Color(0xFFE2E8F0))\n                        ) {\n                            Column(modifier = Modifier.padding(12.dp)',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),\n                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))\n                        ) {\n                            Column(modifier = Modifier.padding(12.dp)');

code = code.replace('HorizontalDivider(color = Color(0xFFE2E8F0))',
'HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))');

code = code.replace('Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))\n                                            Text("C$ ${String.format("%.2f", item.price)} c/u", fontSize = 11.sp, color = Color(0xFF64748B))',
'Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)\n                                            Text("C$ ${String.format("%.2f", item.price)} c/u", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)');

code = code.replace('color = Color(0xFF0F172A),\n                                                modifier = Modifier.padding(horizontal = 4.dp)',
'color = MaterialTheme.colorScheme.onSurface,\n                                                modifier = Modifier.padding(horizontal = 4.dp)');

// Coupon card
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),\n                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))\n                    ) {\n                        Column(modifier = Modifier.padding(10.dp)',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),\n                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))\n                    ) {\n                        Column(modifier = Modifier.padding(10.dp)');

code = code.replace('focusedBorderColor = BluePrimary,\n                                        unfocusedBorderColor = Color(0xFFCBD5E1),\n                                        focusedTextColor = Color(0xFF0F172A),\n                                        unfocusedTextColor = Color(0xFF0F172A)',
'focusedBorderColor = MaterialTheme.colorScheme.primary,\n                                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,\n                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,\n                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface');

code = code.replace('.background(Color(0xFFEFF6FF), RoundedCornerShape(12.dp))',
'.background(MaterialTheme.colorScheme.surfaceContainerLow, RoundedCornerShape(12.dp))\n                            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), RoundedCornerShape(12.dp))');

code = code.replace('Text("Subtotal Productos", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)\n                            Text("C$ ${String.format("%.2f", CartManager.subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))',
'Text("Subtotal Productos", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)\n                            Text("C$ ${String.format("%.2f", CartManager.subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)');

code = code.replace('Text("Envío (${groupedByBiz.size} comercio${if (groupedByBiz.size > 1) "s" else ""})", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)\n                            Text("C$ ${String.format("%.2f", totalDeliveryFees)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))',
'Text("Envío (${groupedByBiz.size} comercio${if (groupedByBiz.size > 1) "s" else ""})", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)\n                            Text("C$ ${String.format("%.2f", totalDeliveryFees)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)');

code = code.replace('HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = Color(0xFFBFDBFE))',
'HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('Text("Total a Pagar", fontSize = 15.sp, fontWeight = FontWeight.Black, color = BluePrimary)\n                            Text("C$ ${String.format("%.2f", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BluePrimary)',
'Text("Total a Pagar", fontSize = 15.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)\n                            Text("C$ ${String.format("%.2f", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)');

// 7. Favorites Screen
code = code.replace('Column(\n        modifier = Modifier\n            .fillMaxSize()\n            .background(Color(0xFFF8FAFC))\n    ) {',
'Column(\n        modifier = Modifier\n            .fillMaxSize()\n            .background(MaterialTheme.colorScheme.background)\n    ) {');

code = code.replace('Surface(\n            modifier = Modifier.fillMaxWidth(),\n            color = Color.White,\n            shadowElevation = 4.dp\n        ) {\n            Row(\n                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),\n                verticalAlignment = Alignment.CenterVertically\n            ) {\n                Icon(Icons.Default.Favorite, contentDescription = null, tint = Color(0xFFFF2D55), modifier = Modifier.size(24.dp))\n                Spacer(Modifier.width(10.dp))\n                Text("Mis Favoritos", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))',
'Surface(\n            modifier = Modifier.fillMaxWidth(),\n            color = MaterialTheme.colorScheme.surface,\n            shadowElevation = 4.dp\n        ) {\n            Row(\n                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),\n                verticalAlignment = Alignment.CenterVertically\n            ) {\n                Icon(Icons.Default.Favorite, contentDescription = null, tint = FabAccent, modifier = Modifier.size(24.dp))\n                Spacer(Modifier.width(10.dp))\n                Text("Mis Favoritos", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurface)');

code = code.replace('Text("${favoriteBusinesses.size} local(es)", fontSize = 12.sp, color = Color.Gray)',
'Text("${favoriteBusinesses.size} local(es)", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)');

code = code.replace('Text("Aún no tienes favoritos", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))',
'Text("Aún no tienes favoritos", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)');

code = code.replace('text = "Toca el ❤️ en cualquier comercio del inicio para guardarlo aquí.",\n                        textAlign = TextAlign.Center,\n                        color = Color.Gray,\n                        fontSize = 14.sp',
'text = "Toca el ❤️ en cualquier comercio del inicio para guardarlo aquí.",\n                        textAlign = TextAlign.Center,\n                        color = MaterialTheme.colorScheme.onSurfaceVariant,\n                        fontSize = 14.sp');

code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)\n                    ) {',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),\n                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)\n                    ) {');

code = code.replace('Text(business.nombre, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))\n                                Text("Toca para abrir el menú →", fontSize = 12.sp, color = Color.Gray)',
'Text(business.nombre, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)\n                                Text("Toca para abrir el menú →", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)');

// 8. NotificationItem
code = code.replace('colors = CardDefaults.cardColors(\n            containerColor = if (!isRead) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)\n        ),\n        shape = RoundedCornerShape(12.dp),\n        border = BorderStroke(1.dp, if (!isRead) Color(0xFF93C5FD) else Color(0xFFE2E8F0))',
'colors = CardDefaults.cardColors(\n            containerColor = if (!isRead) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface\n        ),\n        shape = RoundedCornerShape(12.dp),\n        border = BorderStroke(1.dp, if (!isRead) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))');

code = code.replace('Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))',
'Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (!isRead) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))');

code = code.replace('Text(body, fontSize = 12.sp, color = Color.Gray)',
'Text(body, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)');

// 9. PublicBusinessCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)\n    ) {\n        Column {\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(105.dp)\n                    .background(',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),\n        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)\n    ) {\n        Column {\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(105.dp)\n                    .background(');

code = code.replace('.border(1.dp, Color(0xFFE2E8F0), CircleShape)',
'.border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape)');

code = code.replace('text = name,\n                            fontWeight = FontWeight.ExtraBold,\n                            fontSize = 15.sp,\n                            color = Color(0xFF0F172A),',
'text = name,\n                            fontWeight = FontWeight.ExtraBold,\n                            fontSize = 15.sp,\n                            color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('color = BlueSecondary,\n                            maxLines = 1,',
'color = MaterialTheme.colorScheme.primary,\n                            maxLines = 1,');

code = code.replace('Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(13.dp))\n                    Spacer(modifier = Modifier.width(2.dp))\n                    Text(\n                        text = address,\n                        fontSize = 11.sp,\n                        color = Color(0xFF64748B),',
'Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(13.dp))\n                    Spacer(modifier = Modifier.width(2.dp))\n                    Text(\n                        text = address,\n                        fontSize = 11.sp,\n                        color = MaterialTheme.colorScheme.onSurfaceVariant,');

// 10. BranchCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column(modifier = Modifier.padding(14.dp)) {',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column(modifier = Modifier.padding(14.dp)) {');

code = code.replace('Text(businessName, fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Text(branchName, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BluePrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Spacer(modifier = Modifier.height(4.dp))\n            Text("📍 $address", fontSize = 10.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Spacer(modifier = Modifier.height(8.dp))\n            Row(verticalAlignment = Alignment.CenterVertically) {\n                Icon(Icons.Default.AccessTime, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(12.dp))\n                Spacer(modifier = Modifier.width(4.dp))\n                Text("$prepTime min • Delivery C$ 40", fontSize = 10.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)',
'Text(businessName, fontWeight = FontWeight.Black, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Text(branchName, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Spacer(modifier = Modifier.height(4.dp))\n            Text("📍 $address", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)\n            Spacer(modifier = Modifier.height(8.dp))\n            Row(verticalAlignment = Alignment.CenterVertically) {\n                Icon(Icons.Default.AccessTime, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))\n                Spacer(modifier = Modifier.width(4.dp))\n                Text("$prepTime min • Delivery C$ 40", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)');

// 11. StarProductCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column {\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(100.dp)\n                    .background(Color(0xFFF1F5F9))',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column {\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(100.dp)\n                    .background(MaterialTheme.colorScheme.surfaceContainerLow)');

code = code.replace('Text(name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)\n                Text(businessName, fontSize = 10.sp, color = BluePrimary, fontWeight = FontWeight.SemiBold)\n                Spacer(modifier = Modifier.height(4.dp))\n                Row(verticalAlignment = Alignment.CenterVertically) {\n                    Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF0F172A))\n                    if (originalPrice != null) {\n                        Spacer(modifier = Modifier.width(6.dp))\n                        Text("C$ ${String.format("%.0f", originalPrice)}", fontSize = 10.sp, color = Color(0xFF94A3B8), textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)',
'Text(name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)\n                Text(businessName, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)\n                Spacer(modifier = Modifier.height(4.dp))\n                Row(verticalAlignment = Alignment.CenterVertically) {\n                    Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)\n                    if (originalPrice != null) {\n                        Spacer(modifier = Modifier.width(6.dp))\n                        Text("C$ ${String.format("%.0f", originalPrice)}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)');

// 12. FlashDealCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),\n        border = BorderStroke(1.dp, Color(0xFFFDE68A)),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column(modifier = Modifier.padding(12.dp)) {',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),\n        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)\n    ) {\n        Column(modifier = Modifier.padding(12.dp)) {');

code = code.replace('Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF78350F), maxLines = 1, overflow = TextOverflow.Ellipsis)',
'Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)');

code = code.replace('Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFFB45309))',
'Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)');

// 13. ProductPromoCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White)\n    ) {\n        Column {\n            // Real product image with Coil and fallback\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(110.dp)\n                    .background(Color(0xFFF1F5F9)),',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))\n    ) {\n        Column {\n            // Real product image with Coil and fallback\n            Box(\n                modifier = Modifier\n                    .fillMaxWidth()\n                    .height(110.dp)\n                    .background(MaterialTheme.colorScheme.surfaceContainerLow),');

code = code.replace('Text(\n                    text = name,\n                    fontWeight = FontWeight.Bold,\n                    fontSize = 14.sp,\n                    color = Color(0xFF1E293B),',
'Text(\n                    text = name,\n                    fontWeight = FontWeight.Bold,\n                    fontSize = 14.sp,\n                    color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),',
'colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),');

// 14. GlobalSearchResultItemCard
code = code.replace('colors = CardDefaults.cardColors(containerColor = Color.White),\n        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),',
'colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),\n        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),');

code = code.replace('.background(Color(0xFFF8FAFC)),\n                contentAlignment = Alignment.Center',
'.background(MaterialTheme.colorScheme.surfaceContainerLow),\n                contentAlignment = Alignment.Center');

code = code.replace('text = result.title,\n                    fontWeight = FontWeight.Bold,\n                    fontSize = 14.sp,\n                    color = Color(0xFF0F172A),',
'text = result.title,\n                    fontWeight = FontWeight.Bold,\n                    fontSize = 14.sp,\n                    color = MaterialTheme.colorScheme.onSurface,');

code = code.replace('text = result.subtitle,\n                        fontSize = 12.sp,\n                        color = Color(0xFF64748B),',
'text = result.subtitle,\n                        fontSize = 12.sp,\n                        color = MaterialTheme.colorScheme.onSurfaceVariant,');

code = code.replace('text = result.description,\n                        fontSize = 11.sp,\n                        color = Color(0xFF94A3B8),',
'text = result.description,\n                        fontSize = 11.sp,\n                        color = MaterialTheme.colorScheme.onSurfaceVariant,');

code = code.replace('color = BluePrimary\n                            )',
'color = MaterialTheme.colorScheme.primary\n                            )');

code = code.replace('color = Color(0xFF94A3B8),\n                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough',
'color = MaterialTheme.colorScheme.onSurfaceVariant,\n                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough');

code = code.replace('colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),\n                            modifier = Modifier.height(30.dp)',
'colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),\n                            modifier = Modifier.height(30.dp)');

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
console.log('CustomerHomeScreen.kt migrated successfully!');
