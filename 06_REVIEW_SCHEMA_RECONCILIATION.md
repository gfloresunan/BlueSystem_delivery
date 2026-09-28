# 06. Reconciliación de Esquema de Reseñas — Firestore vs Android DTO

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Ubicación Canónica:** `/businesses/{businessId}/reviews/{reviewId}` (y espejo en `/reviews/{reviewId}`)  

---

## 1. Esquema Canónico del Modelo `CommerceReview`

```kotlin
@com.google.firebase.firestore.IgnoreExtraProperties
data class CommerceReview(
    val id: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val uid: String = "",
    val userName: String = "Cliente BlueSystem",
    val authorName: String = "",
    val userPhotoUrl: String = "",
    val rating: Double = 5.0,
    val comment: String = "",
    val date: String = "",
    val createdAt: com.google.firebase.Timestamp? = null
) {
    fun getEffectiveAuthor(): String = userName.ifBlank { authorName.ifBlank { "Cliente BlueSystem" } }
}
```

---

## 2. Mapa de Campos en Firestore Document

| Campo en Firestore | Tipo de Dato | Fuente en Cliente | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Generado (`rev_1787...`) | Identificador único de la reseña |
| `businessId` | `String` | `currentBusinessId` | ID del comercio sujeto a evaluación |
| `branchId` | `String` | `selectedBranch.branchId` | ID de la sucursal seleccionada |
| `uid` | `String` | `auth.currentUser.uid` | UID del usuario autor de la reseña |
| `userName` | `String` | `auth.currentUser.displayName` | Nombre para mostrar del autor |
| `authorName` | `String` | `auth.currentUser.displayName` | Alias de compatibilidad |
| `userPhotoUrl` | `String` | `auth.currentUser.photoUrl` | Foto de perfil del cliente |
| `rating` | `Double` | Selección de estrellas (1.0 a 5.0) | Calificación cuantitativa |
| `comment` | `String` | Input de texto | Comentario textual de la experiencia |
| `date` | `String` | Formato `dd/MM/yyyy` | Cadena legible de fecha local |
| `createdAt` | `Timestamp` | `Timestamp.now()` | Estampa de tiempo del servidor Firebase |
