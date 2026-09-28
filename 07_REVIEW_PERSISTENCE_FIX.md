# 07. Informe de Persistencia Real de Reseñas (Eliminación de Optimistic UI Engañoso)

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Archivo Modificado:** `app/src/main/java/com/example/ComercioDetalleViewModel.kt`  
**Estatus:** 🟢 APLICADO Y VERIFICADO  

---

## 1. Regla de Oro Aplicada

Se elimina totalmente el "Optimistic UI Success" en la publicación de opiniones.  
Bajo ninguna circunstancia se agregará una reseña a la lista visible ni se cerrará el modal hasta recibir confirmación explícita de escritura desde la base de datos de Firestore.

---

## 2. Flujo de Ejecución Síncrono Garantizado

```text
[Cliente pulsa Publicar]
       │
       ▼
submittingReview = true (Deshabilita botón, previene doble clic)
       │
       ▼
firestore.collection("businesses").document(id).collection("reviews").document(reviewId).set(newReview).await()
       │
       ├──────────────────────────────────────────┐
       ▼ (Éxito Confirmado)                      ▼ (Error / Rechazo)
1. _uiState actualiza lista de reviews     1. _uiState.submittingReview = false
2. _uiState.submittingReview = false        2. Lista local permanece sin alteración
3. onFinished(true)                         3. onFinished(false)
4. Cierra modal y Toast Éxito ⭐           4. Mantiene modal abierto, Toast Error
```

---

## 3. Código Fuente Aplicado

```kotlin
    fun submitReview(rating: Double, comment: String, onFinished: (Boolean) -> Unit) {
        if (currentBusinessId.isBlank() || comment.isBlank()) {
            onFinished(false)
            return
        }
        _uiState.update { it.copy(submittingReview = true) }

        viewModelScope.launch {
            try {
                val currentUser = FirebaseAuth.getInstance().currentUser
                val uid = currentUser?.uid ?: ""
                val name = currentUser?.displayName
                    ?: currentUser?.email?.substringBefore("@")
                    ?: "Cliente BlueSystem"
                val photo = currentUser?.photoUrl?.toString() ?: ""

                val reviewId = "rev_" + System.currentTimeMillis() + "_" + (1000..9999).random()

                val newReview = CommerceReview(
                    id = reviewId,
                    businessId = currentBusinessId,
                    branchId = _uiState.value.selectedBranch?.branchId ?: "",
                    uid = uid,
                    userName = name,
                    authorName = name,
                    userPhotoUrl = photo,
                    rating = rating,
                    comment = comment,
                    date = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date()),
                    createdAt = com.google.firebase.Timestamp.now()
                )

                // 1. Guardar en subcolección /businesses/{id}/reviews y esperar confirmación explícita de Firestore
                firestore.collection("businesses").document(currentBusinessId)
                    .collection("reviews")
                    .document(reviewId)
                    .set(newReview)
                    .await()

                // 2. Guardar en colección raíz /reviews para redundancia
                try {
                    firestore.collection("reviews")
                        .document(reviewId)
                        .set(newReview)
                        .await()
                } catch (e: Exception) {
                    Log.w("REVIEW_E2E", "Subcolección guardada OK, aviso en raíz /reviews: ${e.message}")
                }

                Log.d("REVIEW_E2E", "Reseña confirmada en Firestore: id=$reviewId, businessId=$currentBusinessId")

                // 3. SOLO TRAS CONFIRMACIÓN REAL DE FIRESTORE: Actualizar UI y marcar éxito
                _uiState.update { state ->
                    val updatedList = listOf(newReview) + state.reviews.filter { it.id != newReview.id }
                    state.copy(submittingReview = false, reviews = updatedList)
                }
                onFinished(true)
            } catch (e: Exception) {
                Log.e("REVIEW_E2E", "Error confirmando persistencia de reseña en Firestore", e)
                _uiState.update { it.copy(submittingReview = false) }
                onFinished(false)
            }
        }
    }
```
