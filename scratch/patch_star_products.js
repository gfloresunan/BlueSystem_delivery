const fs = require('fs');
const filePath = 'app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt';
let content = fs.readFileSync(filePath, 'utf8');

const startIdx = content.indexOf('// 5. PRODUCTOS ESTRELLA (SPRINT 15)');
const endIdx = content.indexOf('// 6. OFERTAS FLASH ⚡ (SPRINT 15)');

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const target = content.substring(startIdx, endIdx);
    const replacement = `// 5. PRODUCTOS ESTRELLA (SPRINT 15)
                            StarProductsSection(
                                showFeaturedProducts = dashboardConfig.showFeaturedProducts,
                                featuredProducts = featuredProducts,
                                onProductClick = { businessId ->
                                    navController.navigate("comercio_detalle_screen/$businessId")
                                }
                            )

                            `;
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: replaced ' + target.length + ' chars');
} else {
    console.log('ERROR: indices not found', { startIdx, endIdx });
}
