package com.example.presentation.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.courier.Vehicle

/**
 * Pantalla de Estado del Vehículo y Registro de Mantenimiento / Combustible.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleStatusScreen(
    vehicle: Vehicle?,
    onBack: () -> Unit,
    onAddFuelLog: (liters: Double, cost: Double, odometer: Double) -> Unit,
    onAddMaintenanceLog: (serviceType: String, cost: Double, odometer: Double, notes: String) -> Unit
) {
    var showFuelDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gestión de Vehículo y Flota", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF8FAFC))
                .padding(20.dp)
        ) {
            if (vehicle == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No hay ningún vehículo asignado actualmente.", color = Color(0xFF64748B))
                }
            } else {
                // Ficha de Vehículo
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = Color(0xFF6366F1), modifier = Modifier.size(32.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("${vehicle.brand} ${vehicle.model} (${vehicle.year})", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("Placa: ${vehicle.documents.licensePlate} • Color: ${vehicle.color}", fontSize = 12.sp, color = Color(0xFF64748B))
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Odómetro Actual:", fontSize = 13.sp, color = Color(0xFF475569))
                            Text("${vehicle.currentOdometerKm} Km", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        }
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Estado Documental / SOAT:", fontSize = 13.sp, color = Color(0xFF475569))
                            Text(
                                text = if (vehicle.isRoadworthy) "✓ Apto para Operar" else "⚠️ Documentos Vencidos",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (vehicle.isRoadworthy) Color(0xFF10B981) else Color(0xFFEF4444)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Bitácora de Cargas de Combustible", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    IconButton(onClick = { showFuelDialog = true }) {
                        Icon(Icons.Default.LocalGasStation, contentDescription = "Registrar Carga", tint = Color(0xFF3B82F6))
                    }
                }

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(vehicle.fuelHistory) { fuelLog ->
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("${fuelLog.litersRefueled} Litros refuelados", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    Text("Odómetro: ${fuelLog.odometerKm} Km", fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                                Text("C$ ${fuelLog.totalCost}", fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
                            }
                        }
                    }
                }
            }
        }
    }
}
