package com.example.service

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.navigation.NavController
import com.example.Screen

/**
 * Enrutador centralizado y seguro de destinos para Menú Dinámico y Pop-ups Promocionales.
 * Implementa la Matriz de Seguridad de Destinos (Actividad #10 Enterprise).
 */
object DestinationRouter {
    private const val TAG = "DestinationRouter"

    fun navigateToDestination(
        context: Context,
        navController: NavController,
        destinationType: String,
        destination: String
    ): Boolean {
        val rawDest = destination.trim()
        if (rawDest.isBlank()) {
            Log.w(TAG, "Destino vacío ignorado.")
            return false
        }

        // ─── 1. MATRIZ DE SEGURIDAD: Bloqueo de Protocolos Peligrosos ────────
        val lower = rawDest.lowercase()
        if (lower.startsWith("javascript:") ||
            lower.startsWith("data:") ||
            lower.startsWith("file:") ||
            lower.startsWith("vbscript:") ||
            lower.startsWith("intent:")
        ) {
            Log.e(TAG, "⛔ Protocolo no seguro bloqueado: $rawDest")
            Toast.makeText(context, "Destino no permitido por políticas de seguridad", Toast.LENGTH_SHORT).show()
            return false
        }

        return try {
            when (destinationType.uppercase()) {
                "WHATSAPP" -> handleWhatsApp(context, rawDest)
                "EXTERNAL_URL", "URL", "WEB" -> handleExternalUrl(context, rawDest)
                "INTERNAL_ROUTE", "ROUTE" -> handleInternalRoute(context, navController, rawDest)
                "DEEPLINK" -> handleDeeplink(context, navController, rawDest)
                "BUSINESS", "COMMERCE" -> handleCommerce(navController, rawDest)
                "NONE" -> true
                else -> {
                    // Fallback heurístico: Si empieza con https://, tratar como URL externa
                    if (lower.startsWith("https://") || lower.startsWith("http://")) {
                        handleExternalUrl(context, rawDest)
                    } else {
                        handleInternalRoute(context, navController, rawDest)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error ejecutando navegación a '$rawDest': ${e.message}", e)
            Toast.makeText(context, "No se pudo abrir el destino seleccionado", Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun handleWhatsApp(context: Context, destination: String): Boolean {
        val cleanUrl = when {
            destination.startsWith("https://wa.me/") -> destination
            destination.startsWith("https://api.whatsapp.com/") -> destination
            else -> {
                val cleanPhone = destination.replace(Regex("[^0-9+]"), "")
                "https://wa.me/${cleanPhone.removePrefix("+")}"
            }
        }

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.w(TAG, "WhatsApp no instalado o no accesible: ${e.message}")
            Toast.makeText(context, "No se encontró aplicación para abrir WhatsApp", Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun handleExternalUrl(context: Context, url: String): Boolean {
        var cleanUrl = url
        if (!cleanUrl.startsWith("https://") && !cleanUrl.startsWith("http://")) {
            cleanUrl = "https://$cleanUrl"
        }

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return try {
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Navegador no accesible para '$cleanUrl': ${e.message}")
            Toast.makeText(context, "No se pudo abrir el enlace web", Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun handleInternalRoute(context: Context, navController: NavController, routeId: String): Boolean {
        val cleanRoute = routeId.trim().lowercase().removePrefix("/")
        when (cleanRoute) {
            "profile", "mi_perfil", "perfil" -> {
                navController.navigate("customer_home")
                return true
            }
            "orders", "mis_pedidos", "pedidos", "orders_history" -> {
                navController.navigate("orders_history")
                return true
            }
            "addresses", "mis_direcciones", "direcciones" -> {
                navController.navigate(Screen.AddressManager.route)
                return true
            }
            "loyalty", "loyalty_points", "puntos", "mis_puntos" -> {
                navController.navigate(Screen.LoyaltyPoints.route)
                return true
            }
            "loyalty_level", "nivel_cliente", "nivel" -> {
                navController.navigate(Screen.LoyaltyLevel.route)
                return true
            }
            "coupons", "mis_cupones", "cupones" -> {
                navController.navigate(Screen.CustomerCoupons.route)
                return true
            }
            "security", "seguridad", "security_settings" -> {
                navController.navigate(Screen.SecuritySettings.route)
                return true
            }
            "help", "ayuda", "customer_help", "soporte" -> {
                navController.navigate("customer_help")
                return true
            }
            "solicitar_envio", "envio_ab", "encomienda", "solicitar_envio_form" -> {
                navController.navigate("solicitar_envio_form")
                return true
            }
            "favorites", "favoritos" -> {
                navController.navigate("favorites_screen")
                return true
            }
            else -> {
                if (cleanRoute.startsWith("comercio_detalle_screen/") || cleanRoute.startsWith("commerce/")) {
                    val bizId = cleanRoute.substringAfter("/")
                    if (bizId.isNotBlank()) {
                        navController.navigate("comercio_detalle_screen/$bizId")
                        return true
                    }
                }
                Log.w(TAG, "Ruta interna no reconocida: '$cleanRoute'")
                Toast.makeText(context, "Sección '$cleanRoute' próximamente disponible", Toast.LENGTH_SHORT).show()
                return false
            }
        }
    }

    private fun handleDeeplink(context: Context, navController: NavController, deeplink: String): Boolean {
        val uri = Uri.parse(deeplink)
        val host = uri.host ?: uri.path?.removePrefix("/") ?: ""
        return handleInternalRoute(context, navController, host)
    }

    private fun handleCommerce(navController: NavController, businessId: String): Boolean {
        val cleanId = businessId.removePrefix("comercio_detalle_screen/").removePrefix("commerce/").trim()
        if (cleanId.isNotBlank()) {
            navController.navigate("comercio_detalle_screen/$cleanId")
            return true
        }
        return false
    }

    /**
     * Enruta de forma segura una acción configurada en el encabezado de un bloque (blockActions).
     * Gobierna ÚNICAMENTE el CTA del encabezado sin convertir toda la sección en superficie clickeable.
     * Enlaces externos exigen estrictamente HTTPS (Fail-Closed).
     */
    fun navigateBlockAction(
        context: Context,
        navController: NavController,
        action: com.example.BlockActionConfig
    ): Boolean {
        val actionType = action.type.trim().uppercase()
        if (actionType == "NONE" || actionType.isBlank()) {
            return false
        }
        val target = action.target.trim()
        if (target.isBlank()) {
            Log.w(TAG, "Block action target vacío para tipo $actionType")
            return false
        }
        return try {
            when (actionType) {
                "MERCHANT", "BUSINESS", "COMMERCE" -> handleCommerce(navController, target)
                "PRODUCT" -> {
                    if (target.contains("?productId=")) {
                        navController.navigate("comercio_detalle_screen/$target")
                        true
                    } else if (target.contains("/")) {
                        val bizId = target.substringBefore("/")
                        val prodId = target.substringAfter("/")
                        navController.navigate("comercio_detalle_screen/$bizId?productId=$prodId")
                        true
                    } else {
                        handleCommerce(navController, target)
                    }
                }
                "CATEGORY" -> {
                    handleInternalRoute(context, navController, "customer_home")
                }
                "INTERNAL_ROUTE", "ROUTE" -> handleInternalRoute(context, navController, target)
                "EXTERNAL_URL", "URL", "WEB" -> {
                    if (!target.startsWith("https://", ignoreCase = true)) {
                        Log.w(TAG, "⛔ External URL rechazada: debe ser HTTPS estrictamente: $target")
                        Toast.makeText(context, "Solo se permiten enlaces seguros HTTPS", Toast.LENGTH_SHORT).show()
                        false
                    } else {
                        handleExternalUrl(context, target)
                    }
                }
                else -> {
                    Log.w(TAG, "Tipo de blockAction no reconocido: $actionType")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error ejecutando blockAction '$actionType' -> '$target': ${e.message}", e)
            false
        }
    }

    /**
     * Enruta de forma segura el clic de un anuncio editorial (/home_editorial_ads).
     * Resuelve identidades de comercio y producto de forma directa.
     * Enlaces externos exigen estrictamente HTTPS (Fail-Closed).
     */
    fun navigateEditorialAd(
        context: Context,
        navController: NavController,
        ad: com.example.HomeEditorialAd
    ): Boolean {
        val actionType = ad.actionType.trim().uppercase()
        if (actionType == "NONE" || actionType.isBlank()) {
            return false
        }
        val target = ad.effectiveActionTarget.trim()
        return try {
            when (actionType) {
                "MERCHANT", "BUSINESS", "COMMERCE" -> {
                    val bizId = ad.merchantId.ifBlank { target }
                    if (bizId.isNotBlank()) {
                        handleCommerce(navController, bizId)
                    } else {
                        Log.w(TAG, "EditorialAd MERCHANT sin merchantId válido")
                        false
                    }
                }
                "PRODUCT" -> {
                    val bizId = ad.merchantId.ifBlank {
                        if (target.contains("?productId=")) target.substringBefore("?productId=")
                        else if (target.contains("/")) target.substringBefore("/")
                        else target
                    }
                    val prodId = ad.productId.ifBlank {
                        if (target.contains("?productId=")) target.substringAfter("?productId=")
                        else if (target.contains("/")) target.substringAfter("/")
                        else ""
                    }
                    if (bizId.isNotBlank()) {
                        if (prodId.isNotBlank()) {
                            navController.navigate("comercio_detalle_screen/$bizId?productId=$prodId")
                            true
                        } else {
                            handleCommerce(navController, bizId)
                        }
                    } else {
                        Log.w(TAG, "EditorialAd PRODUCT sin businessId válido")
                        false
                    }
                }
                "INTERNAL_ROUTE", "ROUTE" -> handleInternalRoute(context, navController, target)
                "EXTERNAL_URL", "URL", "WEB" -> {
                    if (!target.startsWith("https://", ignoreCase = true)) {
                        Log.w(TAG, "⛔ External URL de anuncio rechazada: debe ser HTTPS: $target")
                        Toast.makeText(context, "Solo se permiten enlaces seguros HTTPS", Toast.LENGTH_SHORT).show()
                        false
                    } else {
                        handleExternalUrl(context, target)
                    }
                }
                else -> {
                    Log.w(TAG, "Tipo de acción editorial no reconocido: $actionType")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error ejecutando navegación de anuncio editorial: ${e.message}", e)
            false
        }
    }
}
