package com.example.presentation.customer.components

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.RocketLaunch
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.domain.model.AppUpdateConfig

/**
 * Modal Enterprise de Actualización Remota de Aplicaciones.
 * Diseñado bajo la arquitectura de UX de referencia (LAFISE Digital) adaptado a la identidad
 * corporativa y Design Language (BDL) de BlueSystem Delivery.
 */
@Composable
fun AppUpdateModal(
    config: AppUpdateConfig,
    isForced: Boolean,
    canDismiss: Boolean,
    storeUrl: String,
    onDismiss: () -> Unit = {}
) {
    val context = LocalContext.current
    var isOpeningStore by remember { mutableStateOf(false) }

    // Colores dinámicos configurables desde Admin Web con fallbacks seguros
    val customBgColor = remember(config.backgroundColor) {
        parseHexColor(config.backgroundColor, Color(0xFF0F172A))
    }
    val customPrimaryBtnColor = remember(config.primaryButtonColor) {
        parseHexColor(config.primaryButtonColor, Color(0xFF2563EB))
    }
    val customTextColor = remember(config.textColor) {
        parseHexColor(config.textColor, Color.White)
    }

    Dialog(
        onDismissRequest = {
            if (canDismiss && !isForced) {
                onDismiss()
            }
        },
        properties = DialogProperties(
            dismissOnBackPress = canDismiss && !isForced,
            dismissOnClickOutside = canDismiss && !isForced,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.82f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = {
                        if (canDismiss && !isForced) onDismiss()
                    }
                )
                .padding(horizontal = 24.dp, vertical = 32.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .wrapContentHeight()
                    .widthIn(max = 420.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .border(
                        width = 1.dp,
                        color = Color(0xFF334155).copy(alpha = 0.6f),
                        shape = RoundedCornerShape(32.dp)
                    )
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = {} // Evita propagación de click al overlay
                    ),
                shape = RoundedCornerShape(32.dp),
                color = customBgColor,
                tonalElevation = 16.dp,
                shadowElevation = 24.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 28.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {

                    // 1. Branding Header (Logo Corporativo)
                    if (config.showLogo) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 4.dp)
                        ) {
                            Text(
                                text = "BLUESYSTEM",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 2.sp,
                                color = Color(0xFF818CF8)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFF6366F1).copy(alpha = 0.2f),
                                modifier = Modifier.border(
                                    1.dp,
                                    Color(0xFF6366F1).copy(alpha = 0.3f),
                                    RoundedCornerShape(6.dp)
                                )
                            ) {
                                Text(
                                    text = "DELIVERY",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFA5B4FC),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // 2. Hero Visual Asset (Illustration / Icon / Fallback)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(24.dp))
                            .background(Color(0xFF1E293B).copy(alpha = 0.7f))
                            .border(
                                width = 1.dp,
                                color = Color(0xFF334155).copy(alpha = 0.4f),
                                shape = RoundedCornerShape(24.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        var imageLoadFailed by remember { mutableStateOf(false) }

                        if (!config.imageUrl.isNullOrBlank() && !imageLoadFailed) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(config.imageUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Actualización",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                                onError = {
                                    imageLoadFailed = true
                                }
                            )
                        } else if (!config.iconUrl.isNullOrBlank() && !imageLoadFailed) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(config.iconUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Icono",
                                contentScale = ContentScale.Fit,
                                modifier = Modifier.size(72.dp),
                                onError = {
                                    imageLoadFailed = true
                                }
                            )
                        } else {
                            // Fallback Vectorial Premium
                            Box(
                                modifier = Modifier
                                    .size(68.dp)
                                    .background(
                                        if (isForced) Color(0xFFE11D48).copy(alpha = 0.15f)
                                        else Color(0xFF2563EB).copy(alpha = 0.15f),
                                        CircleShape
                                    )
                                    .border(
                                        width = 1.dp,
                                        color = if (isForced) Color(0xFFE11D48).copy(alpha = 0.35f)
                                        else Color(0xFF2563EB).copy(alpha = 0.35f),
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isForced) Icons.Default.Lock else Icons.Default.RocketLaunch,
                                    contentDescription = null,
                                    tint = if (isForced) Color(0xFFFB7185) else Color(0xFF60A5FA),
                                    modifier = Modifier.size(34.dp)
                                )
                            }
                        }
                    }

                    // 3. Version Pill Badge
                    Surface(
                        shape = RoundedCornerShape(9999.dp),
                        color = if (isForced) Color(0xFFE11D48).copy(alpha = 0.15f) else Color(0xFF6366F1).copy(alpha = 0.15f),
                        modifier = Modifier.border(
                            1.dp,
                            if (isForced) Color(0xFFE11D48).copy(alpha = 0.35f) else Color(0xFF6366F1).copy(alpha = 0.35f),
                            RoundedCornerShape(9999.dp)
                        )
                    ) {
                        Text(
                            text = if (isForced) "ACTUALIZACIÓN OBLIGATORIA v${config.latestVersion}"
                            else "NUEVA VERSIÓN v${config.latestVersion}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = if (isForced) Color(0xFFFB7185) else Color(0xFFA5B4FC),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
                        )
                    }

                    // 4. Title & Subtitle
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = config.title.ifBlank { "Actualiza BlueSystem Delivery" },
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = customTextColor,
                            textAlign = TextAlign.Center,
                            lineHeight = 26.sp
                        )

                        if (!config.subtitle.isNullOrBlank()) {
                            Text(
                                text = config.subtitle,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF94A3B8),
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    // 5. Message Body
                    if (config.message.isNotBlank()) {
                        Text(
                            text = config.message,
                            fontSize = 13.sp,
                            color = Color(0xFFCBD5E1),
                            textAlign = TextAlign.Center,
                            lineHeight = 19.sp,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }

                    // 6. Action CTAs
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Botón Primario (Ir a la Tienda)
                        Button(
                            onClick = {
                                isOpeningStore = true
                                launchStore(context, storeUrl)
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = customPrimaryBtnColor
                            ),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                        ) {
                            if (isOpeningStore) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                            }
                            Text(
                                text = config.primaryButtonText.ifBlank { "Actualizar ahora" },
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            if (!isOpeningStore) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        // Botón Secundario (Más tarde) — Oculto irrevocablemente si es FORCED o no permite dismiss
                        if (canDismiss && !isForced) {
                            TextButton(
                                onClick = onDismiss,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = config.secondaryButtonText.ifBlank { "Más tarde" },
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }
                    }

                }
            }
        }
    }
}

/**
 * Despacha de forma segura el Intent hacia Google Play Store (o navegador web).
 */
private fun launchStore(context: Context, targetUrl: String) {
    val fallbackPackage = context.packageName ?: "com.aistudio.delivery.djweq"
    try {
        if (targetUrl.startsWith("market://")) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } else if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } else {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$fallbackPackage")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    } catch (e: Exception) {
        // Fallback a navegador web estándar si la app store nativa no está presente
        try {
            val webUrl = if (targetUrl.startsWith("http")) targetUrl else "https://play.google.com/store/apps/details?id=$fallbackPackage"
            val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(webIntent)
        } catch (_: Exception) {}
    }
}

/**
 * Parser de colores Hex (#RRGGBB o #AARRGGBB) defensivo.
 */
private fun parseHexColor(hexString: String?, defaultColor: Color): Color {
    if (hexString.isNullOrBlank()) return defaultColor
    return try {
        val clean = hexString.trim().removePrefix("#")
        val colorLong = when (clean.length) {
            6 -> "FF$clean".toLong(16)
            8 -> clean.toLong(16)
            else -> return defaultColor
        }
        Color(colorLong)
    } catch (_: Exception) {
        defaultColor
    }
}
