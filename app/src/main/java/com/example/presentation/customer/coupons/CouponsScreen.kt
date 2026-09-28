package com.example.presentation.customer.coupons

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.domain.model.Promotion

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CouponsScreen(
    onBack: () -> Unit,
    onNavigateToCommerce: (String) -> Unit,
    onApplyToCheckout: (String) -> Unit,
    initialCouponId: String? = null,
    viewModel: CouponsViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    // Preseleccionar cupón por ID inicial si existe
    LaunchedEffect(initialCouponId, uiState.availableCoupons) {
        if (!initialCouponId.isNullOrBlank()) {
            viewModel.preselectCouponById(initialCouponId)
        }
    }

    // Copiar código al portapapeles con feedback accesible
    LaunchedEffect(uiState.copiedCouponCodeEvent) {
        uiState.copiedCouponCodeEvent?.let { code ->
            clipboardManager.setText(AnnotatedString(code))
            Toast.makeText(context, "¡Código $code copiado al portapapeles! 🎟️", Toast.LENGTH_SHORT).show()
            viewModel.clearCopiedEvent()
        }
    }

    Scaffold(
        topBar = {
            CouponsTopBar(
                onBack = onBack,
                activeBenefitsCount = uiState.totalActiveBenefitsCount
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier.fillMaxSize()
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading -> {
                    CouponsSkeletonLoading()
                }
                uiState.errorMessage != null && uiState.availableCoupons.isEmpty() && uiState.promotionalItems.isEmpty() -> {
                    CouponsErrorState(
                        errorMessage = uiState.errorMessage ?: "Error al cargar beneficios",
                        onRetry = { viewModel.refresh() }
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Offline Notice Banner
                        if (uiState.isOffline) {
                            item {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    color = MaterialTheme.colorScheme.tertiaryContainer
                                ) {
                                    Text(
                                        text = "Mostrando información guardada.",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }

                        // Hero: Tu Mejor Beneficio (Only on AVAILABLE tab when hero exists)
                        if (uiState.selectedCategory == CouponCategoryTab.AVAILABLE && uiState.heroBenefit != null) {
                            item {
                                HeroBenefitCard(
                                    hero = uiState.heroBenefit!!,
                                    onUseNow = { hero ->
                                        viewModel.copyCouponCode(hero.code)
                                        if (!hero.businessId.isNullOrBlank()) {
                                            onNavigateToCommerce(hero.businessId)
                                        } else {
                                            onApplyToCheckout(hero.code)
                                        }
                                    },
                                    onViewDetail = { viewModel.selectCouponForDetail(it) }
                                )
                            }
                        }

                        // Category Filter Tabs
                        item {
                            CouponFilterTabs(
                                selectedTab = uiState.selectedCategory,
                                onSelectTab = { viewModel.selectCategoryTab(it) }
                            )
                        }

                        // Content List based on selected tab
                        when (uiState.selectedCategory) {
                            CouponCategoryTab.AVAILABLE -> {
                                if (uiState.availableCoupons.isEmpty()) {
                                    item {
                                        CouponsEmptyState(
                                            icon = "🎟️",
                                            title = "Aún no tienes beneficios disponibles",
                                            description = "Cuando recibas promociones, recompensas o cupones aparecerán aquí.",
                                            ctaText = "Explorar comercios",
                                            onCtaClick = { onNavigateToCommerce("") }
                                        )
                                    }
                                } else {
                                    items(uiState.availableCoupons, key = { it.id }) { coupon ->
                                        CouponCard(
                                            coupon = coupon,
                                            onCopyCode = { viewModel.copyCouponCode(it) },
                                            onUseCoupon = {
                                                viewModel.copyCouponCode(it.code)
                                                if (!it.businessId.isNullOrBlank()) {
                                                    onNavigateToCommerce(it.businessId)
                                                } else {
                                                    onApplyToCheckout(it.code)
                                                }
                                            },
                                            onViewDetail = { viewModel.selectCouponForDetail(it) }
                                        )
                                    }
                                }
                            }

                            CouponCategoryTab.PROMOTIONAL -> {
                                if (uiState.promotionalItems.isEmpty()) {
                                    item {
                                        CouponsEmptyState(
                                            icon = "📣",
                                            title = "No hay promociones activas",
                                            description = "Explora nuestros comercios para descubrir nuevas ofertas y promociones especiales.",
                                            ctaText = "Explorar comercios",
                                            onCtaClick = { onNavigateToCommerce("") }
                                        )
                                    }
                                } else {
                                    items(uiState.promotionalItems, key = { it.id }) { promo ->
                                        PromotionCard(
                                            promotion = promo,
                                            onCopyCode = { viewModel.copyCouponCode(it) },
                                            onExploreCommerce = { onNavigateToCommerce(it) }
                                        )
                                    }
                                }
                            }

                            CouponCategoryTab.PERSONALIZED -> {
                                if (uiState.personalizedCoupons.isEmpty()) {
                                    item {
                                        CouponsEmptyState(
                                            icon = "⭐",
                                            title = "Sin cupones personalizados",
                                            description = "Tus recompensas exclusivas del programa de fidelidad o beneficios para ti aparecerán aquí.",
                                            ctaText = "Ver programa de fidelidad",
                                            onCtaClick = onBack
                                        )
                                    }
                                } else {
                                    items(uiState.personalizedCoupons, key = { it.id }) { coupon ->
                                        CouponCard(
                                            coupon = coupon,
                                            onCopyCode = { viewModel.copyCouponCode(it) },
                                            onUseCoupon = {
                                                viewModel.copyCouponCode(it.code)
                                                if (!it.businessId.isNullOrBlank()) {
                                                    onNavigateToCommerce(it.businessId)
                                                } else {
                                                    onApplyToCheckout(it.code)
                                                }
                                            },
                                            onViewDetail = { viewModel.selectCouponForDetail(it) }
                                        )
                                    }
                                }
                            }

                            CouponCategoryTab.USED -> {
                                if (uiState.usedCoupons.isEmpty()) {
                                    item {
                                        CouponsEmptyState(
                                            icon = "🧾",
                                            title = "Todavía no has usado cupones",
                                            description = "Tus cupones y beneficios ya redimidos se guardarán en este historial."
                                        )
                                    }
                                } else {
                                    items(uiState.usedCoupons, key = { it.id }) { coupon ->
                                        CouponCard(
                                            coupon = coupon,
                                            onCopyCode = { viewModel.copyCouponCode(it) },
                                            onUseCoupon = {},
                                            onViewDetail = { viewModel.selectCouponForDetail(it) }
                                        )
                                    }
                                }
                            }

                            CouponCategoryTab.EXPIRED -> {
                                if (uiState.expiredCoupons.isEmpty()) {
                                    item {
                                        CouponsEmptyState(
                                            icon = "✨",
                                            title = "Todo en orden",
                                            description = "No tienes cupones vencidos."
                                        )
                                    }
                                } else {
                                    items(uiState.expiredCoupons, key = { it.id }) { coupon ->
                                        CouponCard(
                                            coupon = coupon,
                                            onCopyCode = { viewModel.copyCouponCode(it) },
                                            onUseCoupon = {},
                                            onViewDetail = { viewModel.selectCouponForDetail(it) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Detail Modal Dialog
    if (uiState.selectedCouponForDetail != null) {
        CouponDetailDialog(
            coupon = uiState.selectedCouponForDetail!!,
            onDismiss = { viewModel.selectCouponForDetail(null) },
            onCopyCode = { viewModel.copyCouponCode(it) },
            onUseCoupon = {
                viewModel.copyCouponCode(it.code)
                onApplyToCheckout(it.code)
            },
            onNavigateToCommerce = { businessId ->
                viewModel.copyCouponCode(uiState.selectedCouponForDetail!!.code)
                onNavigateToCommerce(businessId)
            }
        )
    }
}

@Composable
private fun CouponsTopBar(
    onBack: () -> Unit,
    activeBenefitsCount: Int
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Regresar",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Mis beneficios",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )

                            if (activeBenefitsCount > 0) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    modifier = Modifier.wrapContentWidth()
                                ) {
                                    Text(
                                        text = "$activeBenefitsCount disponible${if (activeBenefitsCount > 1) "s" else ""}",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        maxLines = 1,
                                        softWrap = false
                                    )
                                }
                            }
                        }

                        Text(
                            text = "Descuentos, promociones y recompensas disponibles para ti.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HeroBenefitCard(
    hero: CouponCardUiModel,
    onUseNow: (CouponCardUiModel) -> Unit,
    onViewDetail: (CouponCardUiModel) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onViewDetail(hero) },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CardGiftcard,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "🎁 TU MEJOR BENEFICIO",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 0.5.sp
                    )
                }

                CouponBadge(badgeType = hero.badgeType)
            }

            Text(
                text = hero.formattedDiscount,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            if (hero.title.isNotBlank()) {
                Text(
                    text = hero.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${hero.minOrderText} • Válido hasta ${hero.validityText}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Button(
                    onClick = { onUseNow(hero) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text("Usar ahora", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium, maxLines = 1, softWrap = false)
                }
            }
        }
    }
}

@Composable
private fun CouponFilterTabs(
    selectedTab: CouponCategoryTab,
    onSelectTab: (CouponCategoryTab) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(CouponCategoryTab.values()) { tab ->
            val isSelected = selectedTab == tab
            FilterChip(
                selected = isSelected,
                onClick = { onSelectTab(tab) },
                label = {
                    Text(
                        text = "${tab.displayName} ${tab.icon}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    containerColor = MaterialTheme.colorScheme.surface,
                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                ),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
            )
        }
    }
}

@Composable
private fun CouponsEmptyState(
    icon: String,
    title: String,
    description: String,
    ctaText: String? = null,
    onCtaClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(text = icon, fontSize = 42.sp)
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            if (ctaText != null && onCtaClick != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Button(
                    onClick = onCtaClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(text = ctaText, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun CouponsSkeletonLoading(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero placeholder
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(130.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {}

        // Tabs placeholder
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(4) {
                Surface(
                    modifier = Modifier
                        .width(90.dp)
                        .height(36.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ) {}
            }
        }

        // Cards placeholder
        repeat(3) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
            ) {}
        }
    }
}

@Composable
private fun CouponsErrorState(
    errorMessage: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(text = "⚠️", fontSize = 36.sp)
                Text(
                    text = "No pudimos cargar tus beneficios",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Comprueba tu conexión e inténtalo nuevamente.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
                Button(
                    onClick = onRetry,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Reintentar")
                }
            }
        }
    }
}
