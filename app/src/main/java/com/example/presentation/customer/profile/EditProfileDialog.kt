package com.example.presentation.customer.profile

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import com.example.AppUser

/**
 * EditProfileDialog
 *
 * Diálogo de edición de perfil con soporte completo para:
 * - Cambio de foto de perfil con selector visual nativo (galería)
 * - Subida y compresión a Firebase Storage (/avatars/{userId}/...)
 * - Edición de nombre y teléfono con persistencia en Firestore y Firebase Auth
 */
@Composable
fun EditProfileDialog(
    currentUser: AppUser?,
    onDismiss: () -> Unit,
    onSaveProfile: (String, String, (Boolean, String?) -> Unit) -> Unit,
    onUploadAvatar: (Uri, (Boolean, String?) -> Unit) -> Unit
) {
    val context = LocalContext.current

    val initialName = currentUser?.nombre?.ifBlank { currentUser.name } ?: ""
    val initialPhone = currentUser?.telefono?.ifBlank { currentUser.phone } ?: ""
    val currentPhotoUrl = currentUser?.photoUrl ?: ""

    var nameInput by remember { mutableStateOf(initialName) }
    var phoneInput by remember { mutableStateOf(initialPhone) }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }

    var isProcessing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
        }
    }

    Dialog(onDismissRequest = { if (!isProcessing) onDismiss() }) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Editar Perfil ✏️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Avatar con selector de imagen
                Box(
                    contentAlignment = Alignment.BottomEnd,
                    modifier = Modifier.size(90.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(90.dp)
                            .clip(CircleShape)
                            .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        if (selectedImageUri != null) {
                            AsyncImage(
                                model = selectedImageUri,
                                contentDescription = "Preview Avatar",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else if (currentPhotoUrl.isNotBlank()) {
                            AsyncImage(
                                model = currentPhotoUrl,
                                contentDescription = "Avatar Actual",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Text(
                                text = initialName.take(1).uppercase().ifEmpty { "C" },
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    // Botón flotante para seleccionar foto
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary,
                        shadowElevation = 4.dp,
                        modifier = Modifier
                            .size(30.dp)
                            .clickable(enabled = !isProcessing) {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "Cambiar Foto",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                Text(
                    text = "Toca la cámara para cambiar foto",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Campo Nombre
                OutlinedTextField(
                    value = nameInput,
                    onValueChange = { nameInput = it },
                    label = { Text("Nombre Completo") },
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    },
                    singleLine = true,
                    enabled = !isProcessing,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Campo Teléfono
                OutlinedTextField(
                    value = phoneInput,
                    onValueChange = { phoneInput = it },
                    label = { Text("Teléfono de Contacto") },
                    leadingIcon = {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    },
                    singleLine = true,
                    enabled = !isProcessing,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Campo Correo (Solo Lectura)
                OutlinedTextField(
                    value = currentUser?.email ?: com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.email ?: "",
                    onValueChange = {},
                    label = { Text("Correo Electrónico (Protegido)") },
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null, tint = Color.Gray)
                    },
                    readOnly = true,
                    enabled = false,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = errorMessage ?: "",
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Botones Cancelar / Guardar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        enabled = !isProcessing,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar")
                    }

                    Button(
                        onClick = {
                            if (nameInput.isBlank()) {
                                errorMessage = "El nombre no puede estar vacío"
                                return@Button
                            }
                            isProcessing = true
                            errorMessage = null

                            // Si se seleccionó una nueva foto, subir primero
                            val uriToUpload = selectedImageUri
                            if (uriToUpload != null) {
                                onUploadAvatar(uriToUpload) { successUpload, uploadErr ->
                                    if (!successUpload) {
                                        isProcessing = false
                                        errorMessage = uploadErr ?: "Error al subir foto"
                                    } else {
                                        // Luego guardar nombre y teléfono
                                        onSaveProfile(nameInput, phoneInput) { successProfile, profileErr ->
                                            isProcessing = false
                                            if (successProfile) {
                                                Toast.makeText(context, "¡Perfil actualizado con éxito!", Toast.LENGTH_SHORT).show()
                                                onDismiss()
                                            } else {
                                                errorMessage = profileErr ?: "Error al guardar datos"
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Solo actualizar datos de texto
                                onSaveProfile(nameInput, phoneInput) { successProfile, profileErr ->
                                    isProcessing = false
                                    if (successProfile) {
                                        Toast.makeText(context, "¡Perfil actualizado con éxito!", Toast.LENGTH_SHORT).show()
                                        onDismiss()
                                    } else {
                                        errorMessage = profileErr ?: "Error al guardar datos"
                                    }
                                }
                            }
                        },
                        enabled = !isProcessing,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Guardar")
                        }
                    }
                }
            }
        }
    }
}
