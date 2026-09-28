package com.example.presentation.courier.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.courier.CourierIncidentType
import com.example.domain.model.courier.IncidentCategory

/**
 * Diálogo interactivo para reporte de incidencias (~25 tipos categorizados).
 */
@Composable
fun IncidentReportDialog(
    onDismiss: () -> Unit,
    onReportSubmitted: (incidentType: CourierIncidentType, description: String, photoUrl: String?) -> Unit
) {
    var selectedCategory by remember { mutableStateOf(IncidentCategory.CLIENTE) }
    var selectedIncidentType by remember { mutableStateOf<CourierIncidentType?>(null) }
    var descriptionInput by remember { mutableStateOf("") }
    var photoUrlInput by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val incidentTypesForCategory = remember(selectedCategory) {
        CourierIncidentType.values().filter { it.category == selectedCategory }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color(0xFFEF4444)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Reportar Incidencia en Ruta", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B), fontSize = 18.sp)
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Selector de Categoría (Tabs)
                ScrollableTabRow(
                    selectedTabIndex = selectedCategory.ordinal,
                    edgePadding = 0.dp,
                    containerColor = Color(0xFFF1F5F9)
                ) {
                    IncidentCategory.values().forEach { category ->
                        Tab(
                            selected = (selectedCategory == category),
                            onClick = {
                                selectedCategory = category
                                selectedIncidentType = null
                            },
                            text = {
                                Text(
                                    text = category.name.replace("_", " "),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Lista de Tipos de Incidencia de la Categoría
                Text("Selecciona el tipo específico de evento:", fontSize = 12.sp, color = Color(0xFF64748B))
                Spacer(modifier = Modifier.height(6.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                ) {
                    LazyColumn(modifier = Modifier.padding(8.dp)) {
                        items(incidentTypesForCategory) { incident ->
                            val isSelected = (selectedIncidentType == incident)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (isSelected) Color(0xFFFEE2E2) else Color.Transparent,
                                        RoundedCornerShape(8.dp)
                                    )
                                    .clickable { selectedIncidentType = incident }
                                    .padding(horizontal = 8.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = isSelected,
                                    onClick = { selectedIncidentType = incident }
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Column {
                                    Text(
                                        text = incident.displayName,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        color = if (isSelected) Color(0xFFB91C1C) else Color(0xFF334155)
                                    )
                                    if (incident.requiresEvidence) {
                                        Text("Requiere foto de evidencia", fontSize = 10.sp, color = Color(0xFFDC2626))
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Campo de Descripción
                OutlinedTextField(
                    value = descriptionInput,
                    onValueChange = { descriptionInput = it },
                    label = { Text("Detalle o descripción de la incidencia") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2
                )

                // Simulación de Botón / Captura de Foto de Evidencia
                if (selectedIncidentType?.requiresEvidence == true) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            // Simulación de URL de almacenamiento
                            photoUrlInput = "https://storage.bluesystem.app/evidence_${System.currentTimeMillis()}.jpg"
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (photoUrlInput != null) Color(0xFF10B981) else Color(0xFF6366F1)
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (photoUrlInput != null) "✓ Evidencia Fotográfica Adjunta" else "Capturar Foto con CameraX", fontSize = 12.sp)
                    }
                }

                errorMsg?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(it, color = Color.Red, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val incident = selectedIncidentType
                    if (incident == null) {
                        errorMsg = "Selecciona un tipo de incidencia."
                    } else if (incident.requiresEvidence && photoUrlInput.isNullOrBlank()) {
                        errorMsg = "Esta incidencia requiere captura de foto obligatoria."
                    } else {
                        onReportSubmitted(incident, descriptionInput, photoUrlInput)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Enviar Reporte", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        },
        shape = RoundedCornerShape(20.dp),
        containerColor = Color.White
    )
}
