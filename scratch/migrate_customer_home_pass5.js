const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Line 577
code = code.replace(
`                                      Text(
                                          text = "Categorías",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`,
`                                      Text(
                                          text = "Categorías",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = MaterialTheme.colorScheme.onSurface,
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`
);

// Line 592
code = code.replace(
`border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),`,
`border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),`
);

// Line 650
code = code.replace(
`                                              Text(
                                                  text = "Resultados (\${searchResults.totalCount})",
                                                  fontWeight = FontWeight.ExtraBold,
                                                  fontSize = 18.sp,
                                                  color = Color(0xFF0F172A)
                                              )`,
`                                              Text(
                                                  text = "Resultados (\${searchResults.totalCount})",
                                                  fontWeight = FontWeight.ExtraBold,
                                                  fontSize = 18.sp,
                                                  color = MaterialTheme.colorScheme.onSurface
                                              )`
);

// Lines 682-683
code = code.replace(
`color = if (isSelected) BluePrimary else Color(0xFFF1F5F9),
                                                      border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),`,
`color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow,
                                                      border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),`
);

// Lines 705-735
code = code.replace(
`                                              Card(
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
                                                          .padding(24.dp),
                                                      horizontalAlignment = Alignment.CenterHorizontally
                                                  ) {
                                                      Icon(
                                                          Icons.Default.SearchOff,
                                                          contentDescription = null,
                                                          tint = Color.LightGray,
                                                          modifier = Modifier.size(52.dp)
                                                      )
                                                      Spacer(Modifier.height(10.dp))
                                                      Text(
                                                          "No encontramos resultados para \\"\$searchQueryText\\"",
                                                          fontWeight = FontWeight.Bold,
                                                          fontSize = 15.sp,
                                                          color = Color(0xFF0F172A),
                                                          textAlign = TextAlign.Center
                                                      )
                                                      Spacer(Modifier.height(6.dp))
                                                      Text(
                                                          "Prueba buscando por nombre de plato (ej: pollo, hamburguesa, pizza), combo o restaurante.",
                                                          fontSize = 12.sp,
                                                          color = Color.Gray,
                                                          textAlign = TextAlign.Center
                                                      )
                                                  }
                                              }`,
`                                              Card(
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
                                                          .padding(24.dp),
                                                      horizontalAlignment = Alignment.CenterHorizontally
                                                  ) {
                                                      Icon(
                                                          Icons.Default.SearchOff,
                                                          contentDescription = null,
                                                          tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                                          modifier = Modifier.size(52.dp)
                                                      )
                                                      Spacer(Modifier.height(10.dp))
                                                      Text(
                                                          "No encontramos resultados para \\"\$searchQueryText\\"",
                                                          fontWeight = FontWeight.Bold,
                                                          fontSize = 15.sp,
                                                          color = MaterialTheme.colorScheme.onSurface,
                                                          textAlign = TextAlign.Center
                                                      )
                                                      Spacer(Modifier.height(6.dp))
                                                      Text(
                                                          "Prueba buscando por nombre de plato (ej: pollo, hamburguesa, pizza), combo o restaurante.",
                                                          fontSize = 12.sp,
                                                          color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                          textAlign = TextAlign.Center
                                                      )
                                                  }
                                              }`
);

// Lines 743-760
code = code.replace(
`                                              Card(
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
                                                      )
                                                      TextButton(onClick = { viewModel.onSearchFilterSelected("TODOS") }) {
                                                          Text("Ver todos los resultados (\${searchResults.totalCount})", color = BluePrimary)
                                                      }
                                                  }
                                              }`,
`                                              Card(
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
                                                      )
                                                      TextButton(onClick = { viewModel.onSearchFilterSelected("TODOS") }) {
                                                          Text("Ver todos los resultados (\${searchResults.totalCount})", color = MaterialTheme.colorScheme.primary)
                                                      }
                                                  }
                                              }`
);

// Line 802
code = code.replace(
`                                      Text(
                                          text = "Comercios en \\"\$selectedCategoryFilter\\" (\${filteredPublicBusinesses.size})",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`,
`                                      Text(
                                          text = "Comercios en \\"\$selectedCategoryFilter\\" (\${filteredPublicBusinesses.size})",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = MaterialTheme.colorScheme.onSurface,
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`
);

// Lines 812-815
code = code.replace(
`                                              Icon(Icons.Default.SearchOff, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                                              Spacer(Modifier.height(8.dp))
                                              Text("Sin resultados para esta categoría", color = Color.Gray, fontSize = 14.sp)
                                              TextButton(onClick = { selectedCategoryFilter = "" }) {
                                                  Text("Limpiar filtro de categoría", color = BluePrimary)
                                              }`,
`                                              Icon(Icons.Default.SearchOff, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), modifier = Modifier.size(48.dp))
                                              Spacer(Modifier.height(8.dp))
                                              Text("Sin resultados para esta categoría", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                                              TextButton(onClick = { selectedCategoryFilter = "" }) {
                                                  Text("Limpiar filtro de categoría", color = MaterialTheme.colorScheme.primary)
                                              }`
);

// Line 840
code = code.replace(
`                                      Text(
                                          text = "Comercios Cerca de Ti 🏢",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`,
`                                      Text(
                                          text = "Comercios Cerca de Ti 🏢",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = MaterialTheme.colorScheme.onSurface,
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )`
);

code = code.replace(
`                                              text = "No hay comercios disponibles en este momento.",
                                              color = Color.Gray,`,
`                                              text = "No hay comercios disponibles en este momento.",
                                              color = MaterialTheme.colorScheme.onSurfaceVariant,`
);

// Lines 877-897
code = code.replace(
`                                      Text(
                                          text = "Comercios Destacados ⭐",
                                          fontWeight = FontWeight.Bold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF1E293B),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(12.dp))

                                      if (featuredPublicList.isEmpty()) {
                                          Card(
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
`                                      Text(
                                          text = "Comercios Destacados ⭐",
                                          fontWeight = FontWeight.Bold,
                                          fontSize = 18.sp,
                                          color = MaterialTheme.colorScheme.onSurface,
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(12.dp))

                                      if (featuredPublicList.isEmpty()) {
                                          Card(
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

// Lines 919-947
code = code.replace(
`                                Text(
                                    text = "Productos Estrella ⭐",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = Color(0xFF0F172A),
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val starList = remember(featuredProducts) {
                                    featuredProducts
                                }

                                if (starList.isEmpty()) {
                                    Card(
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
`                                Text(
                                    text = "Productos Estrella ⭐",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val starList = remember(featuredProducts) {
                                    featuredProducts
                                }

                                if (starList.isEmpty()) {
                                    Card(
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

// Lines 970-997
code = code.replace(
`                                Text(
                                    text = "Ofertas Flash ⚡ (Tiempo Limitado)",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = Color(0xFFD97706),
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val dealsList = remember(flashDeals) {
                                    flashDeals
                                }

                                if (dealsList.isEmpty()) {
                                    Card(
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
`                                Text(
                                    text = "Ofertas Flash ⚡ (Tiempo Limitado)",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val dealsList = remember(flashDeals) {
                                    flashDeals
                                }

                                if (dealsList.isEmpty()) {
                                    Card(
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

// Lines 1020-1048
code = code.replace(
`                            Text(
                                text = "Productos con Descuentos 🏷️",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color(0xFF1E293B),
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            val promoItemsList = remember(discountedProducts) {
                                discountedProducts
                            }

                            if (promoItemsList.isEmpty()) {
                                Card(
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
`                            Text(
                                text = "Productos con Descuentos 🏷️",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            val promoItemsList = remember(discountedProducts) {
                                discountedProducts
                            }

                            if (promoItemsList.isEmpty()) {
                                Card(
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

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
console.log('Pass 5 applied successfully!');
