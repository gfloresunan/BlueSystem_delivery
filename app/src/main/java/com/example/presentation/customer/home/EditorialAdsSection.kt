package com.example.presentation.customer.home

import android.content.Context
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.example.BlockActionConfig
import com.example.HomeEditorialAd
import com.example.data.repository.BusinessInfo
import com.example.service.DestinationRouter
import kotlinx.coroutines.delay

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EDITORIAL ADS SECTION
 * Protocolo: BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001 (Fase 3)
 *
 * Superficie dinámica de publicidad, promociones editoriales e institucionales del Home.
 * Completamente desacoplada del carrusel superior /banners.
 *
 * Estados:
 * - Estado 0: ads.isEmpty() -> Retorno inmediato, 0dp, sin placeholders ni ghost padding.
 * - Estado 1: ads.size == 1 -> Card estática individual sin pager, sin dots ni autoplay.
 * - Estado 2+: ads.size >= 2 -> HorizontalPager con dots animados, autoplay de 5s, pausa por toque
 *   y reanudación tras 6s de inactividad.
 *
 * Política Zero N+1:
 * - Resolución de identidad de comercio en memoria con snapshot fallback.
 */
@Composable
fun EditorialAdsSection(
    ads: List<HomeEditorialAd>,
    publicBusinesses: List<BusinessInfo>,
    navController: NavController,
    context: Context,
    modifier: Modifier = Modifier,
    title: String? = "Destacados y Novedades",
    headerAction: BlockActionConfig? = null,
    onHeaderActionClick: ((BlockActionConfig) -> Unit)? = null
) {
    // ─── ESTADO 0: Retorno inmediato si no hay anuncios elegibles (0dp absoluto) ───
    if (ads.isEmpty()) {
        return
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        // Encabezado dinámico configurable
        if (!title.isNullOrBlank()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f, fill = false)
                )

                if (headerAction != null && !headerAction.type.equals("NONE", ignoreCase = true) && headerAction.type.isNotBlank()) {
                    TextButton(
                        onClick = {
                            if (onHeaderActionClick != null) {
                                onHeaderActionClick(headerAction)
                            } else {
                                DestinationRouter.navigateBlockAction(context, navController, headerAction)
                            }
                        },
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                    ) {
                        Text(
                            text = headerAction.label.ifBlank { "Ver más ›" },
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // ─── ESTADO 1: Exactamente 1 anuncio (Card estática sin pager) ───
        if (ads.size == 1) {
            val singleAd = ads[0]
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                EditorialAdCard(
                    ad = singleAd,
                    publicBusinesses = publicBusinesses,
                    context = context,
                    onClick = {
                        DestinationRouter.navigateEditorialAd(context, navController, singleAd)
                    }
                )
            }
        } else {
            // ─── ESTADO 2+: 2 o más anuncios (HorizontalPager + Dots + Autoplay) ───
            val pageCount = ads.size
            val pagerState = rememberPagerState(pageCount = { pageCount })

            var isUserInteracting by remember { mutableStateOf(false) }
            var lastInteractionTimestamp by remember { mutableStateOf(System.currentTimeMillis()) }

            // Detección de gestos del usuario para pausa inmediata
            LaunchedEffect(pagerState.isScrollInProgress) {
                if (pagerState.isScrollInProgress) {
                    isUserInteracting = true
                    lastInteractionTimestamp = System.currentTimeMillis()
                } else {
                    lastInteractionTimestamp = System.currentTimeMillis()
                }
            }

            // Motor de autoplay (5s intervalo, 6s debounce resume)
            LaunchedEffect(pageCount, pagerState) {
                while (true) {
                    delay(1000L)
                    val now = System.currentTimeMillis()
                    if (isUserInteracting) {
                        if (now - lastInteractionTimestamp >= 6000L) {
                            isUserInteracting = false
                        }
                    } else {
                        if (now - lastInteractionTimestamp >= 5000L) {
                            val next = (pagerState.currentPage + 1) % pageCount
                            pagerState.animateScrollToPage(next)
                            lastInteractionTimestamp = System.currentTimeMillis()
                        }
                    }
                }
            }

            Column(modifier = Modifier.fillMaxWidth()) {
                HorizontalPager(
                    state = pagerState,
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    pageSpacing = 12.dp,
                    modifier = Modifier.fillMaxWidth()
                ) { pageIndex ->
                    val ad = ads[pageIndex]
                    EditorialAdCard(
                        ad = ad,
                        publicBusinesses = publicBusinesses,
                        context = context,
                        onClick = {
                            DestinationRouter.navigateEditorialAd(context, navController, ad)
                        }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Indicador de Paginación (Dots animados: activa=píldora expandida, inactiva=círculo)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (i in 0 until pageCount) {
                        val isSelected = (pagerState.currentPage == i)
                        val widthAnim by animateDpAsState(
                            targetValue = if (isSelected) 22.dp else 6.dp,
                            label = "dotWidth"
                        )
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 3.dp)
                                .height(6.dp)
                                .width(widthAnim)
                                .clip(if (isSelected) RoundedCornerShape(3.dp) else CircleShape)
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                                )
                        )
                    }
                }
            }
        }
    }
}

/**
 * Card individual de alto impacto visual para el anuncio editorial.
 * Integra overlay degradado, badges, logo del comercio vivo (o snapshot fallback), titular, subtítulo y CTA.
 */
@Composable
private fun EditorialAdCard(
    ad: HomeEditorialAd,
    publicBusinesses: List<BusinessInfo>,
    context: Context,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Resolución Zero N+1 de identidad comercial
    val (merchantName, merchantLogo) = remember(ad, publicBusinesses) {
        resolveMerchantIdentity(ad, publicBusinesses)
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // 1. Imagen principal de fondo
            if (ad.imageUrl.isNotBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(ad.imageUrl)
                        .crossfade(true)
                        .diskCachePolicy(CachePolicy.ENABLED)
                        .memoryCachePolicy(CachePolicy.ENABLED)
                        .build(),
                    contentDescription = ad.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF1E293B), Color(0xFF0F172A))
                            )
                        )
                )
            }

            // 2. Degradado vertical para legibilidad óptima (overlay)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.25f),
                                Color.Black.copy(alpha = 0.40f),
                                Color.Black.copy(alpha = 0.85f)
                            )
                        )
                    )
            )

            // 3. Encabezado superior dentro de la card: Badge y Logo del comercio
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
                    .align(Alignment.TopStart),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val badge = ad.effectiveBadgeText
                if (badge.isNotBlank()) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(8.dp),
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            text = badge,
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                // Logo circular del comercio (si aplica)
                if (merchantLogo.isNotBlank()) {
                    Surface(
                        modifier = Modifier.size(34.dp),
                        shape = CircleShape,
                        color = Color.White,
                        shadowElevation = 3.dp
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(merchantLogo)
                                .crossfade(true)
                                .diskCachePolicy(CachePolicy.ENABLED)
                                .build(),
                            contentDescription = merchantName,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape)
                        )
                    }
                }
            }

            // 4. Contenido inferior: Merchant Tag, Título, Subtítulo y Botón CTA
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
                    .align(Alignment.BottomStart)
            ) {
                if (merchantName.isNotBlank()) {
                    Text(
                        text = merchantName,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = ad.title,
                            color = Color.White,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        if (ad.subtitle.isNotBlank()) {
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = ad.subtitle,
                                color = Color.White.copy(alpha = 0.90f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Normal,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    val cta = ad.ctaText.ifBlank { "Ver más" }
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(12.dp),
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            text = "$cta ›",
                            color = Color(0xFF0F172A),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Resuelve el nombre y logo del comercio aplicando la política:
 * IN-MEMORY CACHE RESOLUTION WITH SNAPSHOT FALLBACK (Zero N+1 Firestore queries).
 */
private fun resolveMerchantIdentity(
    ad: HomeEditorialAd,
    publicBusinesses: List<BusinessInfo>
): Pair<String, String> {
    val mId = ad.merchantId.trim()
    if (mId.isNotEmpty()) {
        val live = publicBusinesses.find { it.id == mId }
        if (live != null) {
            val liveName = live.name.trim().ifEmpty { ad.effectiveMerchantName }
            val liveLogo = (live.logoUrl ?: live.photoUrl ?: "").trim().ifEmpty { ad.effectiveMerchantLogoUrl }
            return Pair(liveName, liveLogo)
        }
    }
    return Pair(ad.effectiveMerchantName, ad.effectiveMerchantLogoUrl)
}
