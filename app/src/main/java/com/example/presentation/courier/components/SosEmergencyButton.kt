package com.example.presentation.courier.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Botón Flotante SOS de Alerta de Emergencia con confirmación defensiva.
 */
@Composable
fun SosEmergencyButton(
    onTriggerEmergency: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showConfirmDialog by remember { mutableStateOf(false) }

    FloatingActionButton(
        onClick = { showConfirmDialog = true },
        containerColor = Color(0xFFDC2626),
        contentColor = Color.White,
        shape = CircleShape,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Warning, contentDescription = "SOS Emergencia")
            Spacer(modifier = Modifier.width(6.dp))
            Text("SOS", fontWeight = FontWeight.Black, fontSize = 16.sp)
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = {
                Text("⚠️ Alerta de Emergencia SOS", fontWeight = FontWeight.Bold, color = Color(0xFFDC2626))
            },
            text = {
                Text(
                    "¿Estás seguro de activar la Alerta SOS? Esto notificará de inmediato a la central administrativa con tu ubicación GPS en tiempo real cada 2 segundos.",
                    fontSize = 13.sp,
                    color = Color(0xFF334155)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showConfirmDialog = false
                        onTriggerEmergency()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("ACTIVAR SOS AHORA", fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("Cancelar")
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }
}
