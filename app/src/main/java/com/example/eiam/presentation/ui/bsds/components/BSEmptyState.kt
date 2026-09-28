package com.example.eiam.presentation.ui.bsds.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.eiam.presentation.ui.bsds.theme.BSDSBlue700

enum class BSEmptyStateType(
    val emoji: String,
    val defaultTitle: String,
    val defaultDescription: String,
    val accentColor: Color
) {
    Orders("🍔", "Sin pedidos activos", "Los nuevos pedidos recibidos aparecerán automáticamente aquí.", Color(0xFF22C55E)),
    Inventory("📦", "Sin inventario registrado", "Comienza agregando productos a tu catálogo comercial.", Color(0xFF0EA5E9)),
    Sales("💰", "Sin ventas registradas", "No se registran transacciones monetarias en esta jornada.", Color(0xFFF59E0B)),
    Drivers("🛵", "Sin repartidores en ruta", "No hay repartidores asignados a entregas en este momento.", Color(0xFF06B6D4)),
    Customers("⭐", "Sin clientes VIP registrados", "Tus clientes más frecuentes figurarán en este panel.", Color(0xFF2563EB)),
    AI("🤖", "Sin recomendaciones de IA", "BlueSystem AI está analizando tus métricas en tiempo real.", Color(0xFF4F46E5)),
    General("🔍", "Sin datos disponibles", "No se encontraron registros que coincidan con la búsqueda.", Color(0xFF6B7280))
}

/**
 * 🎨 BSEmptyState - Estado Vacío Semántico de BDL 3.0 (ADR-007)
 * Garantiza que la interfaz nunca se sienta incompleta utilizando ilustraciones e iconos propios.
 */
@Composable
fun BSEmptyState(
    type: BSEmptyStateType,
    modifier: Modifier = Modifier,
    customTitle: String? = null,
    customDescription: String? = null,
    actionButtonText: String? = null,
    onActionClick: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Contenedor circular con la ilustración semántica y resplandor
        Box(
            modifier = Modifier
                .size(96.dp)
                .clip(CircleShape)
                .background(type.accentColor.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = type.emoji,
                fontSize = 44.sp
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = customTitle ?: type.defaultTitle,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = customDescription ?: type.defaultDescription,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        if (actionButtonText != null && onActionClick != null) {
            Spacer(modifier = Modifier.height(24.dp))
            BSButton(
                text = actionButtonText,
                onClick = onActionClick,
                modifier = Modifier.fillMaxWidth(0.8f),
                variant = BSButtonVariant.Primary
            )
        }
    }
}
