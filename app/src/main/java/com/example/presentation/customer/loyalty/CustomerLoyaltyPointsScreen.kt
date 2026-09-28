package com.example.presentation.customer.loyalty

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.domain.model.loyalty.*

/**
 * BlueSystem Delivery Enterprise — Customer Loyalty Points Screen v1.0
 * 100% Real Firestore Data, Authoritative Redemptions, Material 3 Design.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerLoyaltyPointsScreen(
    onBack: () -> Unit,
    onNavigateToCoupons: () -> Unit,
    onNavigateToLevel: () -> Unit,
    viewModel: LoyaltyViewModel = viewModel()
) {
    val context = LocalContext.current
    val globalSummary by viewModel.globalSummary.collectAsState()
    val merchantBalances by viewModel.merchantBalances.collectAsState()
    val transactions by viewModel.transactions.collectAsState()
    val activeRewards by viewModel.activeRewards.collectAsState()
    val nextRewardInfo by viewModel.nextRewardProgression.collectAsState()
    val tierInfo by viewModel.tierProgression.collectAsState()
    val redeemState by viewModel.redeemState.collectAsState()

    var showHowItWorksDialog by remember { mutableStateOf(false) }
    var selectedRewardToRedeem by remember { mutableStateOf<LoyaltyReward?>(null) }
    var unlockedCouponResult by remember { mutableStateOf<RedeemRewardResult?>(null) }

    // Manejo reactivo de estado de canje
    LaunchedEffect(redeemState) {
        when (val state = redeemState) {
            is RedeemUiState.Success -> {
                unlockedCouponResult = state.result
                selectedRewardToRedeem = null
                viewModel.resetRedeemState()
            }
            is RedeemUiState.Error -> {
                Toast.makeText(context, state.errorMessage, Toast.LENGTH_LONG).show()
                viewModel.resetRedeemState()
            }
            else -> {}
        }
    }

    // ── Dialog: ¿Cómo acumulo? ────────────────────────────────────────────────
    if (showHowItWorksDialog) {
        AlertDialog(
            onDismissRequest = { showHowItWorksDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("¿Cómo acumulas puntos? 🎁", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    HowToAccumulateStepItem(
                        icon = Icons.Default.ShoppingBag,
                        step = "1",
                        title = "Realiza un pedido",
                        desc = "Elige tus productos favoritos de cualquier comercio afiliado."
                    )
                    HowToAccumulateStepItem(
                        icon = Icons.Default.TwoWheeler,
                        step = "2",
                        title = "Recíbelo en tu puerta",
                        desc = "Nuestros repartidores certificados entregan tu orden."
                    )
                    HowToAccumulateStepItem(
                        icon = Icons.Default.CheckCircle,
                        step = "3",
                        title = "El pedido se completa",
                        desc = "Al confirmarse la entrega final como COMPLETED."
                    )
                    HowToAccumulateStepItem(
                        icon = Icons.Default.Stars,
                        step = "4",
                        title = "¡Recibes +10 Puntos!",
                        desc = "10 pts para el comercio y +10 pts en tu Saldo Global.",
                        highlight = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { showHowItWorksDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    Text("¡Entendido!")
                }
            }
        )
    }

    // ── Dialog: Confirmación de Canje ─────────────────────────────────────────
    selectedRewardToRedeem?.let { reward ->
        val userPoints = globalSummary.globalPointsBalance
        val pointsAfter = Math.max(0, userPoints - reward.pointsCost)
        val isMerchantSpecific = reward.scope == "MERCHANT_SPECIFIC"

        AlertDialog(
            onDismissRequest = { if (redeemState !is RedeemUiState.Loading) selectedRewardToRedeem = null },
            title = {
                Text("¿Canjear este premio? 🎁", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = reward.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF0F172A)
                    )
                    if (reward.description.isNotBlank()) {
                        Text(
                            text = reward.description,
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )
                    }

                    if (reward.rewardType == "COMBO" || reward.comboItems.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFFEF3C7).copy(alpha = 0.5f),
                            border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = "🎁 Este combo incluye:",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color(0xFFB45309)
                                )
                                reward.comboItems.forEach { item ->
                                    val itemText = when (item.type) {
                                        "PRODUCT" -> "🍔 ${item.productName ?: "Producto"} x${item.quantity}"
                                        "FIXED_DISCOUNT" -> "💰 C$${item.value.toInt()} de descuento"
                                        "PERCENTAGE_DISCOUNT" -> "🏷️ ${item.value.toInt()}% de descuento"
                                        "FREE_DELIVERY" -> "🛵 Delivery gratis incluido"
                                        else -> "• ${item.type}"
                                    }
                                    Text(
                                        text = itemText,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF0F172A)
                                    )
                                }
                            }
                        }
                    }

                    if (isMerchantSpecific) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFFEF3C7),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "⚠️ Válido exclusivamente para ${reward.businessName ?: "este comercio"}.",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF92400E),
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Costo del premio:", fontSize = 13.sp, color = Color(0xFF64748B))
                        Text("${reward.pointsCost} puntos", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF4F46E5))
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tus puntos actuales:", fontSize = 13.sp, color = Color(0xFF64748B))
                        Text("$userPoints puntos", fontWeight = FontWeight.Medium, fontSize = 13.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Saldo después del canje:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                        Text("$pointsAfter puntos", fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF059669))
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.redeemReward(reward) },
                    enabled = redeemState !is RedeemUiState.Loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    if (redeemState is RedeemUiState.Loading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Confirmar Canje")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { selectedRewardToRedeem = null },
                    enabled = redeemState !is RedeemUiState.Loading
                ) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ── Dialog: ¡Premio Desbloqueado / Voucher Generado! ──────────────────────
    unlockedCouponResult?.let { voucher ->
        AlertDialog(
            onDismissRequest = { unlockedCouponResult = null },
            title = {
                Text("🎉 ¡Premio Desbloqueado!", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF059669))
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = voucher.rewardName,
                        fontWeight = FontWeight.Black,
                        fontSize = 17.sp,
                        textAlign = TextAlign.Center
                    )

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFECFDF5),
                        border = BorderStroke(1.5.dp, Color(0xFF10B981)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("CÓDIGO DE CUPÓN", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF047857))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = voucher.couponCode ?: "REW-BLUESYSTEM",
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                letterSpacing = 2.sp,
                                color = Color(0xFF065F46)
                            )
                        }
                    }

                    if (voucher.comboSnapshot.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Text("Componentes desbloqueados:", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF334155))
                                voucher.comboSnapshot.forEach { item ->
                                    val itemText = when (item.type) {
                                        "PRODUCT" -> "🍔 ${item.productName ?: "Producto"} x${item.quantity}"
                                        "FIXED_DISCOUNT" -> "💰 C$${item.value.toInt()} de descuento"
                                        "PERCENTAGE_DISCOUNT" -> "🏷️ ${item.value.toInt()}% de descuento"
                                        "FREE_DELIVERY" -> "🛵 Delivery gratis incluido"
                                        else -> "• ${item.type}"
                                    }
                                    Text(text = itemText, fontSize = 11.sp, color = Color(0xFF475569))
                                }
                            }
                        }
                    }

                    Text(
                        text = "Canjeaste ${voucher.pointsRedeemed} puntos. Tu cupón ya está activo y disponible en tu próximo pedido.",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        textAlign = TextAlign.Center
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        unlockedCouponResult = null
                        onNavigateToCoupons()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5))
                ) {
                    Text("Ver en Mis Cupones")
                }
            },
            dismissButton = {
                TextButton(onClick = { unlockedCouponResult = null }) {
                    Text("Cerrar")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fidelidad & Puntos", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = { showHowItWorksDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.HelpOutline, contentDescription = "¿Cómo acumulo?")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            // 1. HERO HEADER DE PUNTOS GLOBALES
            LoyaltyHeroCard(
                globalPoints = globalSummary.globalPointsBalance,
                currentLevelName = tierInfo.currentLevel.name,
                currentLevelIcon = tierInfo.currentLevel.icon,
                nextRewardName = nextRewardInfo.nextReward?.name,
                nextRewardCost = nextRewardInfo.nextReward?.pointsCost ?: 0,
                pointsRemaining = nextRewardInfo.pointsRemaining,
                progress = nextRewardInfo.progress,
                onHowItWorksClick = { showHowItWorksDialog = true },
                onLevelClick = onNavigateToLevel
            )

            // 2. CARRUSEL HORIZONTAL "USA TUS PUNTOS" (RECOMPENSAS)
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Usa tus puntos 🎁",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    if (activeRewards.isNotEmpty()) {
                        Text(
                            text = "${activeRewards.size} disponibles",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6366F1)
                        )
                    }
                }

                if (activeRewards.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Próximamente se publicarán nuevas recompensas para canjear con tus puntos.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(16.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(horizontal = 2.dp)
                    ) {
                        items(activeRewards) { reward ->
                            val (status, statusLabel) = reward.getAvailabilityStatus(
                                userAvailablePoints = globalSummary.globalPointsBalance,
                                merchantPoints = merchantBalances.find { it.businessId == reward.businessId }?.pointsBalance
                            )

                            LoyaltyRewardCardItem(
                                reward = reward,
                                status = status,
                                statusLabel = statusLabel,
                                onRedeemClick = { selectedRewardToRedeem = reward }
                            )
                        }
                    }
                }
            }

            // 3. SECCIÓN: TUS PUNTOS POR COMERCIO
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Tus puntos por comercio 🏪",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )

                if (merchantBalances.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("Aún no tienes puntos acumulados", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Completa tu primer pedido en cualquier comercio y comenzarás a acumular +10 puntos.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    merchantBalances.forEach { merchant ->
                        MerchantPointsCardItem(merchant = merchant)
                    }
                }
            }

            // 4. SECCIÓN: MOVIMIENTO DE PUNTOS (HISTORIAL REAL)
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Movimiento de puntos 📋",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )

                if (transactions.isEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "No tienes movimientos registrados todavía.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(16.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                } else {
                    transactions.forEach { tx ->
                        LoyaltyMovementItem(transaction = tx)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ── COMPONENTES MODULARES ─────────────────────────────────────────────────────

@Composable
fun LoyaltyHeroCard(
    globalPoints: Int,
    currentLevelName: String,
    currentLevelIcon: String,
    nextRewardName: String?,
    nextRewardCost: Int,
    pointsRemaining: Int,
    progress: Float,
    onHowItWorksClick: () -> Unit,
    onLevelClick: () -> Unit
) {
    val animatedProgress by animateFloatAsState(targetValue = progress, label = "points_progress")

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, shape = RoundedCornerShape(22.dp)),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0F172A),
                            Color(0xFF1E1B4B),
                            Color(0xFF0F172A)
                        )
                    )
                )
                .padding(20.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Top Row: Level Badge + How it works
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF6366F1).copy(alpha = 0.2f),
                        border = BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.4f)),
                        modifier = Modifier.clickable { onLevelClick() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(currentLevelIcon, fontSize = 14.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Nivel $currentLevelName",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = Color(0xFFA5B4FC)
                            )
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                contentDescription = null,
                                tint = Color(0xFFA5B4FC),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    Text(
                        text = "¿Cómo acumulo?",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.clickable { onHowItWorksClick() }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Points Display
                Text(
                    text = "FIDELIDAD BLUESYSTEM",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp,
                    color = Color(0xFF94A3B8)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⭐", fontSize = 26.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "$globalPoints",
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "PUNTOS",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFCD34D)
                    )
                }
                Text(
                    text = "Tus puntos disponibles para canjear",
                    fontSize = 12.sp,
                    color = Color(0xFFCBD5E1)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Progress Bar towards next reward
                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = Color(0xFFF59E0B),
                    trackColor = Color(0xFF334155)
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (nextRewardName != null && pointsRemaining > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Te faltan $pointsRemaining pts para tu próximo premio",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFFDE68A)
                        )
                        Text(
                            text = "$globalPoints / $nextRewardCost",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8)
                        )
                    }
                } else {
                    Text(
                        text = "¡Tienes puntos suficientes para canjear recompensas!",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF6EE7B7)
                    )
                }
            }
        }
    }
}

@Composable
fun LoyaltyRewardCardItem(
    reward: LoyaltyReward,
    status: RewardAvailabilityStatus,
    statusLabel: String,
    onRedeemClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(180.dp)
            .shadow(4.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                // Scope & Type badge
                val isGlobal = reward.scope == "GLOBAL"
                val isCombo = reward.rewardType == "COMBO"

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (isCombo) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFFEF3C7)
                        ) {
                            Text(
                                text = "🎁 COMBO",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFB45309),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isGlobal) Color(0xFFEEF2FF) else Color(0xFFF1F5F9)
                    ) {
                        Text(
                            text = if (isGlobal) "🌎 GLOBAL" else (reward.businessName ?: "COMERCIO"),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isGlobal) Color(0xFF4F46E5) else Color(0xFF475569),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            maxLines = 1
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = reward.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    minLines = 2
                )

                if (isCombo && reward.comboItems.isNotEmpty()) {
                    Text(
                        text = "${reward.comboItems.size} beneficios incluidos",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFD97706),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⭐", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${reward.pointsCost} pts",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = Color(0xFFF59E0B)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Action Button based on status
            val isAvailable = status == RewardAvailabilityStatus.AVAILABLE
            Button(
                onClick = onRedeemClick,
                enabled = isAvailable,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF10B981),
                    disabledContainerColor = Color(0xFFE2E8F0),
                    disabledContentColor = Color(0xFF94A3B8)
                ),
                contentPadding = PaddingValues(vertical = 6.dp)
            ) {
                Text(
                    text = if (isAvailable) "CANJEAR" else statusLabel,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun MerchantPointsCardItem(merchant: MerchantLoyaltyBalance) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFF1F5F9)),
                contentAlignment = Alignment.Center
            ) {
                if (merchant.businessLogoUrl.isNotBlank()) {
                    AsyncImage(
                        model = merchant.businessLogoUrl,
                        contentDescription = merchant.businessName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Text(
                        text = merchant.businessName.take(1).uppercase(),
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = Color(0xFF4F46E5)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = merchant.businessName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${merchant.completedOrdersCount} pedidos completados",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFFEF3C7)
            ) {
                Text(
                    text = "${merchant.pointsBalance} pts",
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    color = Color(0xFFB45309),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}

@Composable
fun LoyaltyMovementItem(transaction: LoyaltyTransactionItem) {
    val isEarn = transaction.type == "EARN"
    val isRedeem = transaction.type == "REDEEM"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isEarn) Color(0xFFECFDF5) else Color(0xFFFEF2F2)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isEarn) Icons.Default.ShoppingBag else Icons.Default.CardGiftcard,
                    contentDescription = null,
                    tint = if (isEarn) Color(0xFF059669) else Color(0xFFDC2626),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (isEarn) "Compra" else if (isRedeem) "Canje" else "Ajuste",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "• ${transaction.getDisplayDate()}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    text = transaction.description.ifBlank { transaction.businessName },
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }

            Text(
                text = if (isEarn) "+${transaction.points} pts" else "${transaction.points} pts",
                fontWeight = FontWeight.Black,
                fontSize = 13.sp,
                color = if (isEarn) Color(0xFF059669) else Color(0xFFDC2626)
            )
        }
    }
}

@Composable
fun HowToAccumulateStepItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    step: String,
    title: String,
    desc: String,
    highlight: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (highlight) Color(0xFF6366F1).copy(alpha = 0.08f) else Color.Transparent,
                shape = RoundedCornerShape(10.dp)
            )
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(if (highlight) Color(0xFF6366F1) else Color(0xFFE2E8F0)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (highlight) Color.White else Color(0xFF475569),
                modifier = Modifier.size(16.dp)
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(
                text = "$step. $title",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = if (highlight) Color(0xFF4F46E5) else Color(0xFF0F172A)
            )
            Text(
                text = desc,
                fontSize = 11.sp,
                color = Color(0xFF64748B)
            )
        }
    }
}
