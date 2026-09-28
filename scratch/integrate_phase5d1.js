const fs = require('fs');
let code = fs.readFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', 'utf8');

// Add import
const importStatement = 'import com.example.presentation.customer.cart.*';
if (!code.includes(importStatement)) {
  code = code.replace(
    'import com.example.presentation.customer.favorites.FavoritesScreen',
    'import com.example.presentation.customer.favorites.FavoritesScreen\nimport com.example.presentation.customer.cart.*'
  );
}

// Find lines for the dialog
const lines = code.split('\n');
let dialogStartIdx = -1;
let notifDialogStartIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// DIÁLOGO DE CARRITO REAL CON CREACIÓN DE PEDIDO EN FIRESTORE')) {
    dialogStartIdx = i;
  }
  if (lines[i].includes('// DIÁLOGO DE NOTIFICACIONES (REALTIME)')) {
    notifDialogStartIdx = i;
  }
}

console.log('dialogStartIdx:', dialogStartIdx);
console.log('notifDialogStartIdx:', notifDialogStartIdx);

if (dialogStartIdx !== -1 && notifDialogStartIdx !== -1) {
  const replacementLines = [
    '    // DIÁLOGO DE CARRITO & CHECKOUT MODULARIZADO (FASE 5D.1)',
    '    CartCheckoutDialog(',
    '        showCartDialog = showCartDialog,',
    '        cartModalStep = cartModalStep,',
    '        cartItems = cartItems,',
    '        subtotal = CartManager.subtotal,',
    '        publicBusinesses = publicBusinesses,',
    '        userAddresses = userAddresses,',
    '        defaultAddressDoc = defaultAddressDoc,',
    '        isPlacingOrder = isPlacingOrder,',
    '        isGuest = isGuest,',
    '        couponCodeInput = couponCodeInput,',
    '        appliedCouponDiscount = appliedCouponDiscount,',
    '        appliedCouponCode = appliedCouponCode,',
    '        couponValidationMessage = couponValidationMessage,',
    '        isValidatingCoupon = isValidatingCoupon,',
    '        onDismiss = {',
    '            showCartDialog = false',
    '            cartModalStep = 1',
    '        },',
    '        onStepChange = { cartModalStep = it },',
    '        onIncrementQuantity = { CartManager.incrementQuantity(it) },',
    '        onDecrementQuantity = { CartManager.decrementQuantity(it) },',
    '        onRemoveItem = { CartManager.removeItem(it) },',
    '        onClearCart = { CartManager.clear() },',
    '        onApplyCoupon = { codeRaw ->',
    '            val cleanCode = codeRaw.trim().uppercase()',
    '            if (cleanCode.isNotBlank()) {',
    '                isValidatingCoupon = true',
    '                couponValidationMessage = null',
    '                val targetBizId = cartItems.firstOrNull()?.businessId ?: ""',
    '                coroutineScope.launch {',
    '                    val couponRepo = com.example.data.repository.CouponRepository()',
    '                    val result = couponRepo.validateCoupon(',
    '                        rawCode = cleanCode,',
    '                        businessId = targetBizId,',
    '                        cartSubtotal = CartManager.subtotal,',
    '                        deliveryFee = 45.0,',
    '                        customerId = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid',
    '                    )',
    '                    if (result.isValid) {',
    '                        val totalDisc = result.discountAmount + result.deliveryDiscountAmount',
    '                        appliedCouponDiscount = totalDisc',
    '                        appliedCouponCode = cleanCode',
    '                        appliedCouponSnapshot = result.appliedCoupon?.let { c ->',
    '                            mapOf(',
    '                                "couponId" to c.id,',
    '                                "code" to c.code,',
    '                                "scope" to c.scope.name,',
    '                                "businessId" to c.businessId,',
    '                                "discountType" to c.discountType.name,',
    '                                "discountValue" to c.discountValue,',
    '                                "discountAmount" to totalDisc',
    '                            )',
    '                        }',
    '                        couponValidationMessage = "¡Cupón $cleanCode aplicado! (-C$ ${String.format(java.util.Locale.US, "%.2f", totalDisc)}) 🎉"',
    '                    } else {',
    '                        appliedCouponDiscount = 0.0',
    '                        appliedCouponCode = null',
    '                        appliedCouponSnapshot = null',
    '                        couponValidationMessage = "${result.errorMessage ?: "Código no válido"} ❌"',
    '                    }',
    '                    isValidatingCoupon = false',
    '                }',
    '            }',
    '        },',
    '        onCouponCodeChange = { couponCodeInput = it },',
    '        onProceedToCheckout = { grandTotal, itemCount ->',
    '            CartManager.beginCheckout(grandTotal, itemCount)',
    '            cartModalStep = 2',
    '        },',
    '        onConfirmOrder = { effectiveAddress, deliveryFee, paymentMethod, addressId, lat, lng, fullAddr, instr ->',
    '            showCartDialog = false',
    '            cartModalStep = 1',
    '            viewModel.placeOrder(',
    '                deliveryAddress = effectiveAddress,',
    '                deliveryFee = deliveryFee,',
    '                paymentMethod = paymentMethod,',
    '                addressId = addressId,',
    '                latitude = lat,',
    '                longitude = lng,',
    '                fullAddress = fullAddr,',
    '                instructions = instr,',
    '                couponCode = appliedCouponCode,',
    '                couponDiscount = appliedCouponDiscount,',
    '                couponSnapshot = appliedCouponSnapshot',
    '            )',
    '        },',
    '        onGuestRedirectToAuth = {',
    '            showCartDialog = false',
    '            cartModalStep = 1',
    '            navController.navigate(Screen.LoginRegister.route)',
    '        },',
    '        onInvalidAddressWarning = {',
    '            Toast.makeText(context, "Por favor seleccioná o ingresá una dirección válida", Toast.LENGTH_SHORT).show()',
    '        }',
    '    )',
    ''
  ];

  const part1 = lines.slice(0, dialogStartIdx);
  const part2 = lines.slice(notifDialogStartIdx);
  const newLines = [...part1, ...replacementLines, ...part2];
  fs.writeFileSync('app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt', newLines.join('\n'), 'utf8');
  console.log('CustomerHomeScreen.kt successfully updated! New line count:', newLines.length);
} else {
  console.error('Indices not found!');
}
