const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Add import
const importStatement = 'import com.example.presentation.customer.home.*';
if (!code.includes(importStatement)) {
  code = code.replace(
    'import com.example.presentation.customer.cart.*',
    'import com.example.presentation.customer.cart.*\nimport com.example.presentation.customer.home.*'
  );
}

// 1. Replace Topbar / Header
const topbarStart = '                            // 1. TOPBAR CON GRADIENTE AZUL/CELESTE Y BUSCADOR';
const bannersSectionStart = '                            // 2. CARRUSEL DE BANNERS DINÁMICOS';

const topbarIdx = code.indexOf(topbarStart);
const bannersIdx = code.indexOf(bannersSectionStart);

console.log('topbarIdx:', topbarIdx, 'bannersIdx:', bannersIdx);

if (topbarIdx !== -1 && bannersIdx !== -1) {
  const headerReplacement = `                            // 1. TOPBAR & HEADER MODULARIZADO (FASE 5E.1)
                            HomeHeader(
                                currentUserName = currentUserName,
                                unreadCount = unreadCount,
                                cartItemCount = cartItemCount,
                                deliveryAddressForOrder = deliveryAddressForOrder,
                                searchQueryText = searchQueryText,
                                onSearchQueryChange = {
                                    searchQueryText = it
                                    viewModel.onSearchQueryChanged(it)
                                },
                                showSearchBar = showSearchBar,
                                onToggleSearchBar = { showSearchBar = !showSearchBar },
                                onClearSearch = {
                                    searchQueryText = ""
                                    viewModel.onSearchQueryChanged("")
                                    showSearchBar = false
                                },
                                onVoiceSearchClick = {
                                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                        putExtra(RecognizerIntent.EXTRA_PROMPT, "Habla ahora para buscar...")
                                    }
                                    try { speechRecognizerLauncher.launch(intent) }
                                    catch (e: Exception) { Toast.makeText(context, "Reconocimiento de voz no soportado", Toast.LENGTH_SHORT).show() }
                                },
                                onNotificationsClick = { showNotificationDialog = true },
                                onCartClick = {
                                    if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                    else showCartDialog = true
                                },
                                onAddressClick = {
                                    if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                    else navController.navigate(Screen.AddressManager.route)
                                }
                            )\n\n`;

  code = code.substring(0, topbarIdx) + headerReplacement + code.substring(bannersIdx);
} else {
  console.error('Topbar markers not found!');
}

// 2. Replace Delivery Banner
const deliveryBannerStart = '                            // 8. BANNER X -> Y DELIVERY (PUNTO A -> PUNTO B)';
const deliveryBannerEnd = '                            Spacer(modifier = Modifier.height(32.dp))';

const deliveryIdx = code.indexOf(deliveryBannerStart);
const spacerIdx = code.indexOf(deliveryBannerEnd, deliveryIdx);

console.log('deliveryIdx:', deliveryIdx, 'spacerIdx:', spacerIdx);

if (deliveryIdx !== -1 && spacerIdx !== -1) {
  const bannerReplacement = `                            // 8. BANNER X -> Y DELIVERY MODULARIZADO (FASE 5E.1)
                            ExpressDeliveryBanner(
                                onRequestDelivery = {
                                    navController.navigate("solicitar_envio_form")
                                }
                            )\n\n`;

  code = code.substring(0, deliveryIdx) + bannerReplacement + code.substring(spacerIdx);
} else {
  console.error('Delivery banner markers not found!');
}

fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', code, 'utf8');
const finalLines = code.split('\n').length;
console.log('CustomerHomeScreen.kt updated successfully! New line count:', finalLines);
