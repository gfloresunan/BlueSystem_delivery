const fs = require('fs');
const filePath = 'app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt';
let content = fs.readFileSync(filePath, 'utf8');

const startIdx = content.indexOf('// 5. COMERCIOS DESTACADOS');
const endIdx = content.indexOf('// 5. PRODUCTOS ESTRELLA (SPRINT 15)');

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const target = content.substring(startIdx, endIdx);
    const replacement = `// 5. COMERCIOS DESTACADOS
                                   FeaturedBusinessesSection(
                                       showFeaturedBusinesses = dashboardConfig.showFeaturedBusinesses,
                                       publicBusinesses = publicBusinesses,
                                       favoriteIds = favoriteIds,
                                       onBusinessClick = { businessId ->
                                           navController.navigate("comercio_detalle_screen/$businessId")
                                       },
                                       onToggleFavorite = { businessId ->
                                           viewModel.toggleFavorite(businessId)
                                       }
                                   )

                             `;
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: replaced ' + target.length + ' chars');
} else {
    console.log('ERROR: indices not found', { startIdx, endIdx });
}
