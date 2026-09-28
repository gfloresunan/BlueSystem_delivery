package com.example

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

data class MotorizadoCandidato(
    val motorizadoId: String,
    val nombre: String,
    val telefono: String,
    val distanciaMetros: Int,
    val fotoUrl: String? = null,
    val vehiculoColor: String,
    val vehiculoMarca: String,
    val vehiculoModelo: String,
    val vehiculoPlaca: String
)

@Composable
fun PanelAdministradorMotorizados(
    pedidoId: String,
    candidatos: List<MotorizadoCandidato>,
    onAsignarClick: suspend (String, String) -> Unit
) {
    var asignandoId by remember { mutableStateOf<String?>(null) }
    var mostrarConfirmacion by remember { mutableStateOf<MotorizadoCandidato?>(null) }
    val coroutineScope = rememberCoroutineScope()

    if (mostrarConfirmacion != null) {
        val motorizado = mostrarConfirmacion!!
        AlertDialog(
            onDismissRequest = { mostrarConfirmacion = null },
            title = { Text("Confirmar Asignación") },
            text = { Text("¿Deseas asignar el pedido #${pedidoId.takeLast(5)} a ${motorizado.nombre}?") },
            confirmButton = {
                TextButton(onClick = {
                    mostrarConfirmacion = null
                    coroutineScope.launch {
                        try {
                            asignandoId = motorizado.motorizadoId
                            onAsignarClick(pedidoId, motorizado.motorizadoId)
                        } finally {
                            asignandoId = null
                        }
                    }
                }) {
                    Text("Asignar")
                }
            },
            dismissButton = {
                TextButton(onClick = { mostrarConfirmacion = null }) {
                    Text("Cancelar")
                }
            }
        )
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Motorizados Cercanos",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Surface(
                    color = Color(0xFFD1FAE5), // emerald-100
                    shape = CircleShape
                ) {
                    Text(
                        text = "${candidatos.size} sugeridos",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF047857) // emerald-700
                    )
                }
            }

            Text(
                text = "Sugerencias ordenadas por cercanía al comercio utilizando cálculo de distancia en tiempo real.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)
            )

            if (candidatos.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp))
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No hay motorizados disponibles en el radio de cobertura.",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    itemsIndexed(candidatos) { index, candidato ->
                        MotorizadoItem(
                            repartidor = candidato,
                            esMasCercano = index == 0,
                            estaAsignando = asignandoId == candidato.motorizadoId,
                            onAssign = { mostrarConfirmacion = candidato }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MotorizadoItem(
    repartidor: MotorizadoCandidato,
    esMasCercano: Boolean,
    estaAsignando: Boolean,
    onAssign: () -> Unit
) {
    val backgroundColor = if (esMasCercano) Color(0xFFECFDF5) else MaterialTheme.colorScheme.surfaceVariant // emerald-50 or surfaceVariant
    val borderColor = if (esMasCercano) Color(0xFFA7F3D0) else MaterialTheme.colorScheme.outlineVariant // emerald-200

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = backgroundColor,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Avatar Placeholder
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    val initials = repartidor.nombre.split(" ").take(2).joinToString("") { it.take(1) }.uppercase()
                    Text(
                        text = initials,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = repartidor.nombre,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1
                        )
                        if (esMasCercano) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                color = Color(0xFF059669), // emerald-600
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = "TOP 1",
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                                    fontWeight = FontWeight.Black,
                                    color = Color.White
                                )
                            }
                        }
                    }
                    
                    Text(
                        text = "${repartidor.vehiculoColor} • ${repartidor.vehiculoMarca} ${repartidor.vehiculoModelo}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                    
                    val distanciaKm = String.format("%.2f", repartidor.distanciaMetros / 1000f)
                    Text(
                        text = "A $distanciaKm km (${repartidor.distanciaMetros} m)",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Button(
                onClick = onAssign,
                enabled = !estaAsignando,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (esMasCercano) Color(0xFF059669) else MaterialTheme.colorScheme.primary
                ),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.defaultMinSize(minWidth = 90.dp)
            ) {
                if (estaAsignando) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Asignar",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge
                    )
                }
            }
        }
    }
}
