package com.example.data.repository

import android.util.Log
import com.example.domain.model.Category
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class CategoryRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(businessId: String? = null) {
        if (listenerRegistration != null) return

        var query: Query = firestore.collection("categories")
            .whereEqualTo("active", true)
        if (!businessId.isNullOrBlank()) {
            query = query.whereEqualTo("businessId", businessId)
        }

        listenerRegistration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("CategoryRepo", "Error listening to categories collection", error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toCategorySafely()
                }.sortedBy { it.orderIndex }
                _categories.value = list
                Log.d("CategoryRepo", "Categories updated: count=${list.size}")
            }
        }
    }

    fun stopListening() {
        listenerRegistration?.remove()
        listenerRegistration = null
        _categories.value = emptyList()
    }

    fun getHomeCategoriesFlow(): Flow<List<Category>> = callbackFlow {
        val query = firestore.collection("categories")
            .whereEqualTo("active", true)

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("CategoryRepo", "Error listening to home categories flow", error)
                close(error)
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { doc ->
                doc.toCategorySafely()
            }?.filter { it.showInHome }?.sortedBy { it.orderIndex } ?: emptyList()
            
            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    fun getCategoriesFlow(businessId: String? = null): Flow<List<Category>> = callbackFlow {
        var query: Query = firestore.collection("categories")
            .whereEqualTo("active", true)
        if (!businessId.isNullOrBlank()) {
            query = query.whereEqualTo("businessId", businessId)
        }

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("CategoryRepo", "Error listening to categories collection flow", error)
                close(error)
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { doc ->
                doc.toCategorySafely()
            }?.sortedBy { it.orderIndex } ?: emptyList()
            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    fun getProductCategoriesFlow(): Flow<List<Category>> = callbackFlow {
        val query = firestore.collection("categories")
            .whereEqualTo("active", true)

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("CategoryRepo", "Error fetching product categories", error)
                trySend(emptyList())
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { doc ->
                doc.toCategorySafely()
            }?.filter { cat ->
                val t = cat.type.trim().uppercase()
                t == "PRODUCT" || t == "PRODUCTO"
            }?.sortedBy { it.orderIndex } ?: emptyList()

            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    companion object {
        private val localSubCategoriesCache = java.util.concurrent.CopyOnWriteArrayList<Category>()
    }

    fun getMerchantSubCategoriesFlow(businessId: String): Flow<List<Category>> = callbackFlow {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val allDocs = mutableMapOf<String, Category>()

        fun emitMerged() {
            localSubCategoriesCache.filter { it.businessId == effectiveBizId }.forEach {
                allDocs[it.id] = it
            }
            val list = allDocs.values
                .filter { it.active }
                .distinctBy { it.name.trim().lowercase() }
                .sortedBy { it.orderIndex }
            trySend(list)
        }

        emitMerged()

        val listeners = mutableListOf<ListenerRegistration>()

        // 1. /businesses/{businessId}/subcategories
        try {
            listeners.add(
                firestore.collection("businesses").document(effectiveBizId).collection("subcategories")
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            Log.e("CategoryRepo", "Error fetching subcategories from subcollection for $effectiveBizId", error)
                        }
                        snapshot?.documents?.forEach { doc ->
                            doc.toCategorySafely()?.let { allDocs[it.id] = it }
                        }
                        emitMerged()
                    }
            )
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Listener failed for subcategories", e)
        }

        // 2. /categories where businessId == effectiveBizId
        try {
            listeners.add(
                firestore.collection("categories")
                    .whereEqualTo("businessId", effectiveBizId)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            Log.e("CategoryRepo", "Error fetching categories from root collection for $effectiveBizId", error)
                        }
                        snapshot?.documents?.forEach { doc ->
                            doc.toCategorySafely()?.let { allDocs[it.id] = it }
                        }
                        emitMerged()
                    }
            )
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Listener failed for root categories", e)
        }

        awaitClose { listeners.forEach { it.remove() } }
    }

    fun getAllMerchantSubCategoriesFlow(businessId: String): Flow<List<Category>> = callbackFlow {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val allDocs = mutableMapOf<String, Category>()

        fun emitMerged() {
            localSubCategoriesCache.filter { it.businessId == effectiveBizId }.forEach {
                allDocs[it.id] = it
            }
            val list = allDocs.values
                .distinctBy { it.name.trim().lowercase() }
                .sortedBy { it.orderIndex }
            trySend(list)
        }

        emitMerged()

        val listeners = mutableListOf<ListenerRegistration>()

        // 1. /businesses/{businessId}/subcategories
        try {
            listeners.add(
                firestore.collection("businesses").document(effectiveBizId).collection("subcategories")
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            Log.e("CategoryRepo", "Error fetching all subcategories from subcollection for $effectiveBizId", error)
                        }
                        snapshot?.documents?.forEach { doc ->
                            doc.toCategorySafely()?.let { allDocs[it.id] = it }
                        }
                        emitMerged()
                    }
            )
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Listener failed for subcategories", e)
        }

        // 2. /categories where businessId == effectiveBizId
        try {
            listeners.add(
                firestore.collection("categories")
                    .whereEqualTo("businessId", effectiveBizId)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            Log.e("CategoryRepo", "Error fetching all categories from root for $effectiveBizId", error)
                        }
                        snapshot?.documents?.forEach { doc ->
                            doc.toCategorySafely()?.let { allDocs[it.id] = it }
                        }
                        emitMerged()
                    }
            )
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Listener failed for root categories", e)
        }

        awaitClose { listeners.forEach { it.remove() } }
    }

    suspend fun addMerchantSubCategory(
        businessId: String,
        name: String,
        description: String = "",
        active: Boolean = true
    ): Result<Category> {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank() || name.isBlank()) return Result.failure(IllegalArgumentException("businessId y nombre son requeridos"))
        return try {
            val docRef = firestore.collection("businesses").document(effectiveBizId).collection("subcategories").document()
            val category = Category(
                id = docRef.id,
                businessId = effectiveBizId,
                name = name.trim(),
                description = description.trim(),
                active = active,
                type = "SUBCATEGORY",
                orderIndex = 0
            )

            // Guardar inmediatamente en cache local
            localSubCategoriesCache.removeAll { it.id == category.id || it.name.equals(category.name, ignoreCase = true) }
            localSubCategoriesCache.add(category)

            val data = hashMapOf(
                "id" to docRef.id,
                "businessId" to effectiveBizId,
                "restaurantId" to effectiveBizId,
                "name" to name.trim(),
                "description" to description.trim(),
                "active" to active,
                "type" to "SUBCATEGORY",
                "orderIndex" to 0,
                "createdAt" to com.google.firebase.Timestamp.now(),
                "updatedAt" to com.google.firebase.Timestamp.now()
            )

            // 1. Intentar en /categories
            try {
                firestore.collection("categories").document(docRef.id).set(data).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Escritura en /categories: ${e.message}")
            }

            // 2. Intentar en subcolección
            try {
                docRef.set(data).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Escritura en subcolección: ${e.message}")
            }

            Log.i("CategoryRepo", "[SUBCAT_SUCCESS] Subcategoría creada: id=${docRef.id} businessId=$effectiveBizId name=$name")
            Result.success(category)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error adding merchant subcategory", e)
            Result.failure(e)
        }
    }

    suspend fun updateMerchantSubCategory(
        businessId: String,
        subCategoryId: String,
        name: String,
        description: String = "",
        active: Boolean = true
    ): Result<Unit> {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank() || subCategoryId.isBlank()) return Result.failure(IllegalArgumentException("businessId y subCategoryId requeridos"))
        return try {
            val existing = localSubCategoriesCache.find { it.id == subCategoryId }
            val updatedCat = (existing ?: Category(id = subCategoryId, businessId = effectiveBizId)).copy(
                name = name.trim(),
                description = description.trim(),
                active = active
            )
            localSubCategoriesCache.removeAll { it.id == subCategoryId }
            localSubCategoriesCache.add(updatedCat)

            val updates = mapOf(
                "name" to name.trim(),
                "description" to description.trim(),
                "active" to active,
                "updatedAt" to com.google.firebase.Timestamp.now()
            )

            try {
                firestore.collection("categories").document(subCategoryId)
                    .set(updates, com.google.firebase.firestore.SetOptions.merge()).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Update en /categories: ${e.message}")
            }

            try {
                firestore.collection("businesses").document(effectiveBizId)
                    .collection("subcategories").document(subCategoryId)
                    .set(updates, com.google.firebase.firestore.SetOptions.merge()).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Update en subcolección: ${e.message}")
            }

            Log.i("CategoryRepo", "[SUBCAT_SUCCESS] Subcategoría actualizada: id=$subCategoryId")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error updating merchant subcategory", e)
            Result.failure(e)
        }
    }

    suspend fun toggleMerchantSubCategoryStatus(
        businessId: String,
        subCategoryId: String,
        newActiveState: Boolean
    ): Result<Unit> {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank() || subCategoryId.isBlank()) return Result.failure(IllegalArgumentException("businessId y subCategoryId requeridos"))
        return try {
            val existing = localSubCategoriesCache.find { it.id == subCategoryId }
            if (existing != null) {
                localSubCategoriesCache.remove(existing)
                localSubCategoriesCache.add(existing.copy(active = newActiveState))
            }

            val updates = mapOf(
                "active" to newActiveState,
                "updatedAt" to com.google.firebase.Timestamp.now()
            )

            try {
                firestore.collection("categories").document(subCategoryId)
                    .set(updates, com.google.firebase.firestore.SetOptions.merge()).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Toggle en /categories: ${e.message}")
            }

            try {
                firestore.collection("businesses").document(effectiveBizId)
                    .collection("subcategories").document(subCategoryId)
                    .set(updates, com.google.firebase.firestore.SetOptions.merge()).await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Toggle en subcolección: ${e.message}")
            }

            Log.i("CategoryRepo", "[SUBCAT_SUCCESS] Estado subcategoría cambiado: id=$subCategoryId active=$newActiveState")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error toggling subcategory status", e)
            Result.failure(e)
        }
    }

    suspend fun deleteMerchantSubCategory(
        businessId: String,
        subCategoryId: String
    ): Result<Unit> {
        val effectiveBizId = businessId.ifBlank {
            try { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" } catch (e: Exception) { "" }
        }
        if (effectiveBizId.isBlank() || subCategoryId.isBlank()) return Result.failure(IllegalArgumentException("businessId y subCategoryId requeridos"))
        return try {
            localSubCategoriesCache.removeAll { it.id == subCategoryId }

            try {
                firestore.collection("categories").document(subCategoryId).delete().await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Delete en /categories: ${e.message}")
            }

            try {
                firestore.collection("businesses").document(effectiveBizId)
                    .collection("subcategories").document(subCategoryId)
                    .delete().await()
            } catch (e: Exception) {
                Log.w("CategoryRepo", "Delete en subcolección: ${e.message}")
            }

            Log.i("CategoryRepo", "[SUBCAT_SUCCESS] Subcategoría eliminada: id=$subCategoryId")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error deleting merchant subcategory", e)
            Result.failure(e)
        }
    }

    suspend fun addCategory(name: String, icon: String = "📁", businessId: String = ""): Result<Unit> {
        return try {
            val docRef = firestore.collection("categories").document()
            val categoryData = hashMapOf(
                "id" to docRef.id,
                "name" to name.trim(),
                "icon" to icon,
                "businessId" to businessId,
                "active" to true,
                "orderIndex" to (_categories.value.size + 1),
                "createdAt" to com.google.firebase.Timestamp.now()
            )
            docRef.set(categoryData).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error adding category to Firestore", e)
            Result.failure(e)
        }
    }

    suspend fun updateCategory(categoryId: String, newName: String, icon: String = "📁"): Result<Unit> {
        return try {
            firestore.collection("categories")
                .document(categoryId)
                .update(mapOf(
                    "name" to newName.trim(),
                    "icon" to icon,
                    "updatedAt" to com.google.firebase.Timestamp.now()
                ))
                .await()
            Log.i("CategoryRepo", "Category updated: ID=$categoryId, name=$newName")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error updating category", e)
            Result.failure(e)
        }
    }

    suspend fun deleteCategory(categoryId: String): Result<Unit> {
        return try {
            firestore.collection("categories")
                .document(categoryId)
                .update(mapOf(
                    "active" to false,
                    "updatedAt" to com.google.firebase.Timestamp.now()
                ))
                .await()
            Log.i("CategoryRepo", "Category deactivated: ID=$categoryId")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error deleting category", e)
            Result.failure(e)
        }
    }

    suspend fun updateCategoryOrder(categoryIds: List<String>): Result<Unit> {
        return try {
            firestore.runBatch { batch ->
                categoryIds.forEachIndexed { index, categoryId ->
                    val ref = firestore.collection("categories").document(categoryId)
                    batch.update(ref, mapOf("orderIndex" to index + 1))
                }
            }.await()
            Log.i("CategoryRepo", "Category order updated successfully for ${categoryIds.size} categories")
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("CategoryRepo", "Error updating category order", e)
            Result.failure(e)
        }
    }
}

fun com.google.firebase.firestore.DocumentSnapshot.toCategorySafely(): Category? {
    try {
        val direct = this.toObject(Category::class.java)
        if (direct != null && direct.name.isNotBlank()) {
            return direct.copy(id = this.id)
        }
    } catch (e: Exception) {
        // Fallback al parseo resiliente manual
    }
    return try {
        val name = this.getString("name") ?: this.getString("nombre") ?: this.getString("title") ?: ""
        if (name.isBlank()) return null

        val busId = this.getString("businessId") ?: this.getString("restaurantId") ?: this.getString("comercioId") ?: ""
        val desc = this.getString("description") ?: this.getString("descripcion") ?: ""
        val slug = this.getString("slug") ?: ""
        val type = this.getString("type") ?: this.getString("tipo") ?: "PRODUCT"
        val activeAny = this.get("active") ?: this.get("activo")
        val active = when (activeAny) {
            is Boolean -> activeAny
            is String -> activeAny.equals("true", ignoreCase = true)
            is Number -> activeAny.toInt() == 1
            else -> true
        }
        val orderAny = this.get("orderIndex") ?: this.get("order") ?: this.get("orden")
        val orderIndex = when (orderAny) {
            is Number -> orderAny.toInt()
            is String -> orderAny.toIntOrNull() ?: 0
            else -> 0
        }
        val icon = this.getString("icon") ?: this.getString("icono") ?: "📁"
        val imageUrl = this.getString("imageUrl") ?: this.getString("imagen") ?: ""

        Category(
            id = this.id,
            businessId = busId,
            name = name.trim(),
            slug = slug,
            type = type,
            description = desc,
            active = active,
            orderIndex = orderIndex,
            icon = icon,
            imageUrl = imageUrl
        )
    } catch (e: Exception) {
        Log.e("CategoryRepo", "Error parseando categoría ${this.id}: ${e.message}")
        null
    }
}

