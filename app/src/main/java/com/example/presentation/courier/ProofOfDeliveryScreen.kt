package com.example.presentation.courier

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.courier.ProofOfDeliveryEngine
import com.example.domain.model.courier.DeliveryProofPolicy
import com.example.domain.model.courier.ProofOfDeliveryBundle

/**
 * Pantalla de captura y validación de evidencias de entrega (Proof of Delivery - PoD).
 */
@Composable
fun ProofOfDeliveryScreen(
    orderId: String,
    policy: DeliveryProofPolicy,
    expectedOtp: String = "1234",
    onProofValidated: (ProofOfDeliveryBundle) -> Unit,
    onCancel: () -> Unit
) {
    val podEngine = remember { ProofOfDeliveryEngine() }
    var otpInput by remember { mutableStateOf("") }
    var photoUrl by remember { mutableStateOf<String?>(null) }
    var signatureCaptured by remember { mutableStateOf(false) }
    var qrPayload by remember { mutableStateOf<String?>(null) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF8FAFC)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Confirmación de Entrega (PoD)",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFF1E293B)
            )
            Text(
                text = "Política Requerida: ${policy.proofType.name}",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF6366F1)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // 1. Requisito: Código OTP
            if (policy.requireOtp) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("1. Código OTP del Cliente (4 dígitos)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = otpInput,
                            onValueChange = { if (it.length <= 4) otpInput = it },
                            label = { Text("Ingrese OTP de confirmación") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 2. Requisito: Foto CameraX
            if (policy.requirePhoto) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("2. Fotografiar Paquete Entregado", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = { photoUrl = "https://storage.bluesystem.app/pod_${orderId}.jpg" },
                            colors = ButtonDefaults.buttonColors(containerColor = if (photoUrl != null) Color(0xFF10B981) else Color(0xFF3B82F6)),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(if (photoUrl != null) "✓ Fotografía Capturada" else "Tomar Foto con CameraX")
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 3. Requisito: Firma Digital en Canvas
            if (policy.requireSignature) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("3. Firma Digital del Destinatario", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp)
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            var path by remember { mutableStateOf(Path()) }
                            Canvas(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .pointerInput(Unit) {
                                        detectDragGestures(
                                            onDragStart = { offset ->
                                                path.moveTo(offset.x, offset.y)
                                                signatureCaptured = true
                                            },
                                            onDrag = { change, _ ->
                                                path.lineTo(change.position.x, change.position.y)
                                            }
                                        )
                                    }
                            ) {
                                drawPath(path = path, color = Color.Black, style = Stroke(width = 4f))
                            }
                            if (!signatureCaptured) {
                                Text("Firme aquí con su dedo", color = Color(0xFF94A3B8), fontSize = 12.sp)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // 4. Requisito: Escaneo de QR Corporativo
            if (policy.requireQrScan) {
                Button(
                    onClick = { qrPayload = "CORP_QR_VERIFIED_${orderId}" },
                    colors = ButtonDefaults.buttonColors(containerColor = if (qrPayload != null) Color(0xFF10B981) else Color(0xFF8B5CF6)),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (qrPayload != null) "✓ QR Corporativo Escaneado" else "Escanear QR de Cliente Corporativo")
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            errorMsg?.let {
                Text(it, color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
            }

            Spacer(modifier = Modifier.weight(1f))

            // Botón de Confirmación Final
            Button(
                onClick = {
                    val bundle = ProofOfDeliveryBundle(
                        orderId = orderId,
                        otpCodeEntered = otpInput,
                        photoStorageUrl = photoUrl,
                        signatureStorageUrl = if (signatureCaptured) "https://storage.bluesystem.app/sig_${orderId}.png" else null,
                        qrPayloadScanned = qrPayload
                    )

                    val validation = podEngine.validateProof(policy, bundle, expectedOtp)
                    if (validation.isSuccess) {
                        onProofValidated(bundle)
                    } else {
                        errorMsg = validation.exceptionOrNull()?.message
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Validar Evidencias y Finalizar Entrega", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}
