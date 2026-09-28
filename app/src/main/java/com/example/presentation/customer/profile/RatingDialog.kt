package com.example.presentation.customer.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.Pedido

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RatingDialog(
    order: Pedido,
    initialTab: Int = 0,
    allowRateBusiness: Boolean = true,
    allowRateCourier: Boolean = true,
    isSubmitting: Boolean = false,
    onDismiss: () -> Unit,
    onSubmit: (businessRating: Int, courierRating: Int, businessComment: String, courierComment: String) -> Unit
) {
    var selectedTab by remember { mutableStateOf(initialTab) }

    var businessRating by remember { mutableStateOf(if (order.rating > 0) order.rating else 5) }
    var businessComment by remember { mutableStateOf(order.ratingComment) }

    var courierRating by remember { mutableStateOf(if (order.courierRating > 0) order.courierRating else 5) }
    var courierComment by remember { mutableStateOf(order.courierRatingComment) }

    val courierId = remember(order) {
        OrderPresentationResolver.resolveCanonicalCourierId(order)
    }

    var courierName by remember { mutableStateOf("Repartidor Asignado") }
    var courierPhotoUrl by remember { mutableStateOf("") }

    // Cargar datos en vivo del motorizado (Nombre completo y foto)
    LaunchedEffect(courierId) {
        if (courierId.isNotEmpty()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("users").document(courierId).get().addOnSuccessListener { doc ->
                    if (doc != null && doc.exists()) {
                        val name = doc.getString("nombre") ?: doc.getString("name") ?: ""
                        val photo = doc.getString("photoUrl") ?: doc.getString("foto") ?: doc.getString("profileImage") ?: ""
                        if (name.isNotBlank()) courierName = name
                        if (photo.isNotBlank()) courierPhotoUrl = photo
                    }
                }
                db.collection("couriers").document(courierId).get().addOnSuccessListener { cDoc ->
                    if (cDoc != null && cDoc.exists()) {
                        val name = cDoc.getString("name") ?: cDoc.getString("fullName") ?: ""
                        val photo = cDoc.getString("photoUrl") ?: cDoc.getString("photo") ?: ""
                        if (name.isNotBlank()) courierName = name
                        if (photo.isNotBlank()) courierPhotoUrl = photo
                    }
                }
            } catch (_: Exception) {}
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .imePadding()
            ) {
                // Barra Superior
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(40.dp)) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Calificar y reseñar",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                // Pestañas (Artículo | Repartidor)
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = Color(0xFFE11D48),
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = Color(0xFFE11D48),
                            height = 3.dp
                        )
                    }
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = {
                            Text(
                                "Artículo",
                                fontWeight = if (selectedTab == 0) FontWeight.Black else FontWeight.Medium,
                                fontSize = 15.sp,
                                color = if (selectedTab == 0) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = {
                            Text(
                                "repartidor",
                                fontWeight = if (selectedTab == 1) FontWeight.Black else FontWeight.Medium,
                                fontSize = 15.sp,
                                color = if (selectedTab == 1) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Contenedor scrollable para que todos los campos y el botón sean 100% visibles y no se corten
                val scrollState = rememberScrollState()
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(scrollState)
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 36.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (selectedTab == 0) {
                        // TAB ARTÍCULO / COMERCIO
                        Text(
                            text = "artículo / comercio",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        // Tarjeta de información del comercio
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFFE11D48).copy(alpha = 0.12f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Store,
                                        contentDescription = null,
                                        tint = Color(0xFFE11D48),
                                        modifier = Modifier.size(26.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    val bizName = order.businessName.ifEmpty { order.origen.nombreComercio.ifEmpty { "Comercio" } }
                                    Text(
                                        text = bizName,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    val itemNames = order.items.joinToString(", ") { "${it.quantity}x ${it.name}" }
                                    Text(
                                        text = if (itemNames.isNotBlank()) itemNames else "Pedido #${order.displayOrderCode}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }

                        // Tarjeta de Calificación y Comentarios del Comercio
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                            shadowElevation = 2.dp
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                if (!allowRateBusiness) {
                                    Surface(
                                        color = Color(0xFF10B981).copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(12.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(20.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Comercio ya calificado con $businessRating ⭐", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF10B981))
                                        }
                                    }
                                }

                                Text(
                                    text = "Valora el servicio del comercio",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(14.dp))
                                StarRatingBar(
                                    rating = businessRating,
                                    onRatingChanged = { if (allowRateBusiness) businessRating = it }
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Text(
                                    text = "Comparte tu opinión sobre el producto",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                OutlinedTextField(
                                    value = businessComment,
                                    onValueChange = { if (allowRateBusiness) businessComment = it },
                                    enabled = allowRateBusiness,
                                    placeholder = { Text("Escribe tu reseña aquí....", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(120.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f),
                                        focusedBorderColor = Color(0xFFE11D48)
                                    )
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                // Botones de Navegación / Envío
                                if (allowRateCourier && courierId.isNotBlank()) {
                                    Button(
                                        onClick = { selectedTab = 1 },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFFE11D48),
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp),
                                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                                    ) {
                                        Text(
                                            text = "Siguiente: Calificar Repartidor ➔",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                    }

                                    if (allowRateBusiness) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        TextButton(
                                            onClick = {
                                                onSubmit(businessRating, 0, businessComment, "")
                                            },
                                            enabled = !isSubmitting,
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            if (isSubmitting) {
                                                CircularProgressIndicator(
                                                    modifier = Modifier.size(20.dp),
                                                    color = Color(0xFFE11D48),
                                                    strokeWidth = 2.dp
                                                )
                                            } else {
                                                Text(
                                                    text = "Omitir repartidor y Guardar solo comercio",
                                                    fontSize = 13.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }
                                    }
                                } else {
                                    Button(
                                        onClick = {
                                            onSubmit(businessRating, 0, businessComment, "")
                                        },
                                        enabled = !isSubmitting && allowRateBusiness,
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFFE11D48),
                                            contentColor = Color.White,
                                            disabledContainerColor = Color(0xFFE11D48).copy(alpha = 0.6f),
                                            disabledContentColor = Color.White.copy(alpha = 0.8f)
                                        ),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(50.dp),
                                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                                    ) {
                                        if (isSubmitting) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(24.dp),
                                                color = Color.White,
                                                strokeWidth = 2.5.dp
                                            )
                                        } else {
                                            Text(
                                                text = "Guardar Calificación del Comercio",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // TAB REPARTIDOR
                        Text(
                            text = "repartidor",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        // Tarjeta con Foto y Nombre del Motorizado
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Foto Circular con Borde Destacado
                                Box(
                                    modifier = Modifier
                                        .size(54.dp)
                                        .clip(CircleShape)
                                        .border(2.dp, Color(0xFFE11D48).copy(alpha = 0.6f), CircleShape)
                                        .background(MaterialTheme.colorScheme.surfaceVariant),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (courierPhotoUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = courierPhotoUrl,
                                            contentDescription = courierName,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    } else {
                                        Icon(
                                            Icons.AutoMirrored.Filled.DirectionsBike,
                                            contentDescription = null,
                                            tint = Color(0xFFE11D48),
                                            modifier = Modifier.size(28.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    Text(
                                        text = courierName,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "Repartidor Oficial",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        // Tarjeta de Calificación del Repartidor
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                            shadowElevation = 2.dp
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Califica su servicio",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(14.dp))
                                StarRatingBar(
                                    rating = courierRating,
                                    onRatingChanged = { courierRating = it }
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Text(
                                    text = "Comparte tu opinión",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                OutlinedTextField(
                                    value = courierComment,
                                    onValueChange = { courierComment = it },
                                    placeholder = { Text("Escribe tu reseña aquí....", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(120.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f),
                                        focusedBorderColor = Color(0xFFE11D48)
                                    )
                                )

                                Spacer(modifier = Modifier.height(20.dp))

                                // Botón de Enviar Calificación Repartidor
                                Button(
                                    onClick = {
                                        val bToSend = if (allowRateBusiness) businessRating else 0
                                        val cToSend = if (allowRateCourier) courierRating else 0
                                        val bComm = if (allowRateBusiness) businessComment else ""
                                        onSubmit(bToSend, cToSend, bComm, courierComment)
                                    },
                                    enabled = !isSubmitting && allowRateCourier,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFFE11D48),
                                        contentColor = Color.White,
                                        disabledContainerColor = Color(0xFFE11D48).copy(alpha = 0.6f),
                                        disabledContentColor = Color.White.copy(alpha = 0.8f)
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(50.dp),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                                ) {
                                    if (isSubmitting) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(24.dp),
                                            color = Color.White,
                                            strokeWidth = 2.5.dp
                                        )
                                    } else {
                                        Text(
                                            text = if (allowRateBusiness) "Finalizar y Guardar Calificación" else "Guardar Calificación del Repartidor",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(
                                    onClick = { selectedTab = 0 },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = "← Volver a Valoración del Comercio",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 13.sp
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

@Composable
fun StarRatingBar(
    rating: Int,
    maxRating: Int = 5,
    onRatingChanged: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        for (i in 1..maxRating) {
            Icon(
                imageVector = if (i <= rating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                contentDescription = "Star $i",
                tint = if (i <= rating) Color(0xFFFFC107) else MaterialTheme.colorScheme.outlineVariant,
                modifier = Modifier
                    .size(42.dp)
                    .clickable { onRatingChanged(i) }
                    .padding(4.dp)
            )
        }
    }
}
