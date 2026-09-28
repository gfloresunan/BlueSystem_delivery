const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// 1. Search no results in selected category
code = code.replace(
`                                               Card(
                                                   modifier = Modifier
                                                       .fillMaxWidth()
                                                       .padding(vertical = 12.dp),
                                                   shape = RoundedCornerShape(16.dp),
                                                   colors = CardDefaults.cardColors(containerColor = Color.White),
                                                   border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                               ) {
                                                   Column(
                                                       modifier = Modifier
                                                           .fillMaxWidth()
                                                           .padding(20.dp),
                                                       horizontalAlignment = Alignment.CenterHorizontally
                                                   ) {
                                                       Text(
                                                           "No hay resultados en la categoría seleccionada.",
                                                           fontSize = 13.sp,
                                                           color = Color.Gray,
                                                           textAlign = TextAlign.Center
                                                       )`,
`                                               Card(
                                                   modifier = Modifier
                                                       .fillMaxWidth()
                                                       .padding(vertical = 12.dp),
                                                   shape = RoundedCornerShape(16.dp),
                                                   colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                                   border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                               ) {
                                                   Column(
                                                       modifier = Modifier
                                                           .fillMaxWidth()
                                                           .padding(20.dp),
                                                       horizontalAlignment = Alignment.CenterHorizontally
                                                   ) {
                                                       Text(
                                                           "No hay resultados en la categoría seleccionada.",
                                                           fontSize = 13.sp,
                                                           color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                           textAlign = TextAlign.Center
                                                       )`
);

// 2. Empty filtered category
code = code.replace(
`                                               Icon(Icons.Default.SearchOff, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                                               Spacer(Modifier.height(8.dp))
                                               Text("Sin resultados para esta categoría", color = Color.Gray, fontSize = 14.sp)`,
`                                               Icon(Icons.Default.SearchOff, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(48.dp))
                                               Spacer(Modifier.height(8.dp))
                                               Text("Sin resultados para esta categoría", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)`
);

// 3. Empty public businesses
code = code.replace(
`                                               text = "No hay comercios disponibles en este momento.",
                                               color = Color.Gray,`,
`                                               text = "No hay comercios disponibles en este momento.",
                                               color = MaterialTheme.colorScheme.onSurfaceVariant,`
);

// 4. Empty featured businesses
code = code.replace(
`                                           Card(
                                               modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                               colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9)),
                                               shape = RoundedCornerShape(12.dp)
                                           ) {
                                               Text(
                                                   text = "No hay comercios destacados configurados actualmente.",
                                                   color = Color.Gray,
                                                   fontSize = 13.sp,
                                                   modifier = Modifier.padding(16.dp)
                                               )
                                           }`,
`                                           Card(
                                               modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                               colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                               border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                               shape = RoundedCornerShape(12.dp)
                                           ) {
                                               Text(
                                                   text = "No hay comercios destacados configurados actualmente.",
                                                   color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                   fontSize = 13.sp,
                                                   modifier = Modifier.padding(16.dp)
                                               )
                                           }`
);

// 5. Empty star products
code = code.replace(
`                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            text = "No hay productos estrella configurados actualmente.",
                                            color = Color.Gray,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }`,
`                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                    ) {
                                        Text(
                                            text = "No hay productos estrella configurados actualmente.",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }`
);

// 6. Empty flash deals
code = code.replace(
`                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            text = "No hay ofertas flash activas en este momento.",
                                            color = Color.Gray,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }`,
`                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                    ) {
                                        Text(
                                            text = "No hay ofertas flash activas en este momento.",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }`
);

// 7. Empty discounted products
code = code.replace(
`                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(
                                        text = "No hay productos con descuentos configurados actualmente.",
                                        color = Color.Gray,
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(16.dp)
                                    )
                                }`,
`                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ) {
                                    Text(
                                        text = "No hay productos con descuentos configurados actualmente.",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(16.dp)
                                    )
                                }`
);

// 8. Empty Cart in Dialog
code = code.replace(
`                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Tu carrito está vacío 🛒",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Color(0xFF475569)
                                )
                                Text(
                                    text = "Agregá productos desde el menú de cualquier comercio.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B),
                                    textAlign = TextAlign.Center
                                )
                            }`,
`                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Tu carrito está vacío 🛒",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Agregá productos desde el menú de cualquier comercio.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = TextAlign.Center
                                )
                            }`
);

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
console.log('Pass 4 applied successfully!');
