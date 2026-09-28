package com.example.presentation.customer.profile

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Construction
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * ProfileComingSoonCard
 *
 * Composable informativo para secciones del perfil cuyo backend aún no está implementado.
 *
 * FASE 1 — FALSE-FUNCTION CONTAINMENT
 * Reemplaza secciones que antes mostraban datos ficticios (Wallet, Loyalty)
 * con un estado claro, honesto y no engañoso para el usuario.
 *
 * PROHIBIDO:
 * - Mostrar balances ficticios
 * - Mostrar puntos ficticios
 * - Mostrar botones que generen confirmaciones de éxito sin backend real
 *
 * FASE FUTURA: Cuando el backend esté implementado, reemplazar este composable
 * en ProfileScreen.kt con el composable real correspondiente.
 */
@Composable
fun ProfileComingSoonCard(
    featureName: String,
    description: String = "Esta función estará disponible próximamente.",
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Construction,
                contentDescription = null,
                tint = Color(0xFF94A3B8),
                modifier = Modifier.size(28.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = featureName,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = Color(0xFF475569)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFE2E8F0)
            ) {
                Text(
                    text = "Próximamente",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF64748B),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}
