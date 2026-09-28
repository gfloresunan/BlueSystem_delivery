package com.example.presentation.business.settings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.settings.RestaurantSettings
import com.example.ui.theme.BluePrimary

@Composable
fun RestaurantSetupWizardDialog(
    step: Int,
    settings: RestaurantSettings,
    onDismiss: () -> Unit,
    onNext: () -> Unit,
    onPrev: () -> Unit,
    onFinish: () -> Unit
) {
    val readinessScore = settings.readiness.readinessScorePercent

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Restaurant Setup Wizard 🚀", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, Color(0xFF10B981))
                    ) {
                        Text("Score: $readinessScore%", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF10B981), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                    }
                }
                Text("Paso $step de 8 — Configuración Inicial Asistida", fontSize = 11.sp, color = Color.Gray)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 280.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                LinearProgressIndicator(
                    progress = { step / 8f },
                    modifier = Modifier.fillMaxWidth().height(6.dp),
                    color = BluePrimary,
                    trackColor = Color(0xFFE2E8F0)
                )

                when (step) {
                    1 -> Text("1. Información del Restaurante: Verifica el nombre comercial (${settings.commercialName}) y razón social (${settings.legalName}).", fontSize = 12.sp)
                    2 -> Text("2. Horario Semanal: Revisa los turnos de atención para garantizar la apertura en tiempo real.", fontSize = 12.sp)
                    3 -> Text("3. Zona de Delivery: Cobertura actual de ${settings.maxDeliveryRadiusKm} km con costo de C$ ${settings.deliveryFee.toInt()}.", fontSize = 12.sp)
                    4 -> Text("4. Métodos de Pago: Efectivo, Tarjeta y Transferencia bancaria activos.", fontSize = 12.sp)
                    5 -> Text("5. Configuración de Menú: Verificación de productos y categorización.", fontSize = 12.sp)
                    6 -> Text("6. Cocina KDS: Configuración de estaciones para el despacho eficiente.", fontSize = 12.sp)
                    7 -> Text("7. Personal & Roles: Permisos asignados para gerencia y cajeros.", fontSize = 12.sp)
                    else -> Text("8. Diagnóstico de Readiness Checklist: ¡Tu restaurante tiene un Readiness Score de $readinessScore% y está listo para operar!", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                }
            }
        },
        confirmButton = {
            if (step < 8) {
                Button(onClick = onNext) { Text("Siguiente ➔") }
            } else {
                Button(onClick = onFinish, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))) { Text("¡Finalizar & Publicar! 🚀") }
            }
        },
        dismissButton = {
            if (step > 1) {
                TextButton(onClick = onPrev) { Text("Anterior") }
            } else {
                TextButton(onClick = onDismiss) { Text("Cancelar") }
            }
        }
    )
}
