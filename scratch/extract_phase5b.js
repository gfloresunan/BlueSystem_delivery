const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Add import
const importStatement = 'import com.example.presentation.customer.search.*';
if (!code.includes(importStatement)) {
  code = code.replace(
    'package com.example.presentation.customer\n\nimport com.example.presentation.customer.components.*',
    'package com.example.presentation.customer\n\nimport com.example.presentation.customer.components.*\nimport com.example.presentation.customer.search.*'
  );
}

// Replace Search block inside CustomerHomeScreen
const searchBlockTarget = `                                   // 4. CUSTOMER GLOBAL SEARCH ENGINE v1.0 (Comercios + Platos + Combos + Promociones)
                                   if (searchQueryText.isNotBlank()) {
                                       val searchResults by viewModel.searchResults.collectAsState()
                                       val selectedSearchFilter by viewModel.selectedSearchFilter.collectAsState()

                                       val activeResultsList = remember(searchResults, selectedSearchFilter) {
                                           when (selectedSearchFilter) {
                                               "COMERCIOS" -> searchResults.businesses
                                               "PLATOS" -> searchResults.products
                                               "COMBOS" -> searchResults.combos
                                               "PROMOCIONES" -> searchResults.promotions
                                               else -> searchResults.allUnified
                                           }
                                       }

                                       Column(
                                           modifier = Modifier
                                               .fillMaxWidth()
                                               .padding(horizontal = 16.dp)
                                       ) {
                                           Row(
                                               modifier = Modifier.fillMaxWidth(),
                                               horizontalArrangement = Arrangement.SpaceBetween,
                                               verticalAlignment = Alignment.CenterVertically
                                           ) {
                                               Text(
                                                   text = "Resultados (\${searchResults.totalCount})",
                                                   fontWeight = FontWeight.ExtraBold,
                                                   fontSize = 18.sp,
                                                   color = MaterialTheme.colorScheme.onSurface
                                               )
                                               TextButton(
                                                   onClick = {
                                                       searchQueryText = ""
                                                       viewModel.onSearchQueryChanged("")
                                                       showSearchBar = false
                                                   }
                                               ) {
                                                   Text("Limpiar", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                               }
                                           }

                                           Spacer(modifier = Modifier.height(8.dp))

                                           // Pestañas de filtrado rápido de entidades
                                           val filterTabs = listOf(
                                               Triple("TODOS", "Todos", searchResults.totalCount),
                                               Triple("COMERCIOS", "🏪 Comercios", searchResults.businesses.size),
                                               Triple("PLATOS", "🍔 Platos", searchResults.products.size),
                                               Triple("COMBOS", "🍱 Combos", searchResults.combos.size),
                                               Triple("PROMOCIONES", "🎁 Promos", searchResults.promotions.size)
                                           )

                                           LazyRow(
                                               horizontalArrangement = Arrangement.spacedBy(8.dp),
                                               modifier = Modifier.fillMaxWidth()
                                           ) {
                                               items(filterTabs) { (tabKey, tabTitle, tabCount) ->
                                                   val isSelected = selectedSearchFilter == tabKey
                                                   Surface(
                                                       shape = RoundedCornerShape(12.dp),
                                                       color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow,
                                                       border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                                       modifier = Modifier.clickable { viewModel.onSearchFilterSelected(tabKey) }
                                                   ) {
                                                       Text(
                                                           text = "$tabTitle ($tabCount)",
                                                           color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                                           fontSize = 12.sp,
                                                           fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                           modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                                       )
                                                   }
                                               }
                                           }

                                           Spacer(modifier = Modifier.height(14.dp))

                                           if (searchResults.totalCount == 0) {
                                               Card(
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
                                               }
                                           } else if (activeResultsList.isEmpty()) {
                                               Card(
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
                                               }
                                           } else {
                                               Column(
                                                   verticalArrangement = Arrangement.spacedBy(10.dp),
                                                   modifier = Modifier.fillMaxWidth()
                                               ) {
                                                   activeResultsList.forEach { result ->
                                                       GlobalSearchResultItemCard(
                                                           result = result,
                                                           onAddToCart = if (result.type == com.example.domain.engine.intelligence.CustomerSearchResultType.PRODUCT ||
                                                               result.type == com.example.domain.engine.intelligence.CustomerSearchResultType.COMBO) {
                                                               {
                                                                   CartManager.addToCart(
                                                                       productId = result.id,
                                                                       productName = result.title,
                                                                       price = result.price ?: 0.0,
                                                                       quantity = 1,
                                                                       businessId = result.businessId,
                                                                       businessName = result.businessName,
                                                                       imageUrl = result.imageUrl
                                                                   )
                                                                   Toast.makeText(context, "¡\${result.title} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                                                               }
                                                           } else null,
                                                           onClick = {
                                                               if (result.businessId.isNotBlank()) {
                                                                   navController.navigate("comercio_detalle_screen/\${result.businessId}")
                                                               }
                                                           }
                                                       )
                                                   }
                                               }
                                           }
                                       }
                                       Spacer(modifier = Modifier.height(20.dp))
                                   }`;

const searchBlockReplacement = `                                   // 4. CUSTOMER GLOBAL SEARCH ENGINE v1.0 (Comercios + Platos + Combos + Promociones)
                                   if (searchQueryText.isNotBlank()) {
                                       val searchResults by viewModel.searchResults.collectAsState()
                                       val selectedSearchFilter by viewModel.selectedSearchFilter.collectAsState()

                                       CustomerSearchOverlay(
                                           searchQueryText = searchQueryText,
                                           searchResults = searchResults,
                                           selectedSearchFilter = selectedSearchFilter,
                                           onSearchFilterSelected = { viewModel.onSearchFilterSelected(it) },
                                           onClearSearch = {
                                               searchQueryText = ""
                                               viewModel.onSearchQueryChanged("")
                                               showSearchBar = false
                                           },
                                           onAddToCart = { result ->
                                               CartManager.addToCart(
                                                   productId = result.id,
                                                   productName = result.title,
                                                   price = result.price ?: 0.0,
                                                   quantity = 1,
                                                   businessId = result.businessId,
                                                   businessName = result.businessName,
                                                   imageUrl = result.imageUrl
                                               )
                                               Toast.makeText(context, "¡\${result.title} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                                           },
                                           onResultClick = { result ->
                                               if (result.businessId.isNotBlank()) {
                                                   navController.navigate("comercio_detalle_screen/\${result.businessId}")
                                               }
                                           }
                                       )
                                       Spacer(modifier = Modifier.height(20.dp))
                                   }`;

code = code.replace(searchBlockTarget, searchBlockReplacement);

// Remove GlobalSearchResultItemCard definition at bottom
const lines = code.split('\n');
let searchCardIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fun GlobalSearchResultItemCard(')) {
    searchCardIdx = (i > 0 && lines[i-1].includes('@Composable')) ? i - 1 : i;
    break;
  }
}

console.log('searchCardIdx at bottom:', searchCardIdx);
if (searchCardIdx !== -1) {
  const newLines = lines.slice(0, searchCardIdx);
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', newLines.join('\n') + '\n', 'utf8');
  console.log('CustomerHomeScreen.kt updated! New line count:', newLines.length);
} else {
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
  console.log('Saved changes without slicing.');
}
