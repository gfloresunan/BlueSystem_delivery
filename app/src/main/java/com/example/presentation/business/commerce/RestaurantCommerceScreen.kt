package com.example.presentation.business.commerce

import androidx.compose.runtime.Composable

/**
 * COMPATIBILITY WRAPPER (@Deprecated)
 * 
 * Esta pantalla ha sido consolidada en [ProductWorkspaceScreen].
 * Se mantiene este wrapper deprecado para preservar la compatibilidad con rutas de navegación,
 * deep links, pruebas y vistas de vista previa Compose existentes.
 */
@Deprecated(
    message = "Utilizar ProductWorkspaceScreen en su lugar.",
    replaceWith = ReplaceWith("ProductWorkspaceScreen(restaurantId, onBack = onBack)")
)
@Composable
fun RestaurantCommerceScreen(
    restaurantId: String,
    onBack: () -> Unit = {}
) {
    ProductWorkspaceScreen(
        restaurantId = restaurantId,
        onBack = onBack
    )
}
