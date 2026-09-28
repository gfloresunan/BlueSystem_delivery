package com.example.data.queue

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.util.Log
import com.example.data.repository.ProductRepository
import com.example.domain.model.Product
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentLinkedQueue

data class PendingProductUpload(
    val product: Product,
    val localUriString: String,
    val isEdit: Boolean = false
)

/**
 * Gestor Offline-First de Cola de Subidas de Imágenes y Productos (Requisito 7)
 * Permite guardar productos sin conexión a internet y sincronizarlos automáticamente al reconectar.
 */
object ProductUploadQueueManager {
    private const val TAG = "ProductUploadQueueManager"

    private val queue = ConcurrentLinkedQueue<PendingProductUpload>()
    private val scope = CoroutineScope(Dispatchers.IO + Job())

    private val _pendingQueueCount = MutableStateFlow(0)
    val pendingQueueCount: StateFlow<Int> = _pendingQueueCount.asStateFlow()

    private val _isUploading = MutableStateFlow(false)
    val isUploading: StateFlow<Boolean> = _isUploading.asStateFlow()

    private var isNetworkAvailable = false

    fun init(context: Context, productRepository: ProductRepository) {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        if (connectivityManager == null) return

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "Conexión a Internet detectada. Procesando cola de subidas offline...")
                isNetworkAvailable = true
                processQueue(context, productRepository)
            }

            override fun onLost(network: Network) {
                Log.w(TAG, "Conexión a Internet perdida. Modo offline activo.")
                isNetworkAvailable = false
            }
        })
    }

    fun enqueueUpload(product: Product, localUriString: String, isEdit: Boolean = false) {
        queue.add(PendingProductUpload(product, localUriString, isEdit))
        _pendingQueueCount.value = queue.size
        try {
            Log.i(TAG, "Producto '${product.name}' encolado para subida offline. Total en cola: ${queue.size}")
        } catch (e: Throwable) {}
    }

    fun processQueue(context: Context, productRepository: ProductRepository) {
        if (queue.isEmpty() || _isUploading.value) return

        scope.launch {
            _isUploading.value = true
            while (queue.isNotEmpty()) {
                val item = queue.peek() ?: break
                try {
                    Log.i(TAG, "Procesando subida en cola para producto: ${item.product.name}")
                    val localUri = try { Uri.parse(item.localUriString) } catch (e: Throwable) { null }

                    if (localUri != null) {
                        val uploadResult = productRepository.uploadProductImage(
                            context = context,
                            productId = item.product.id,
                            localImageUri = localUri
                        )

                        uploadResult.onSuccess { res ->
                            val updatedProduct = item.product.copy(
                                imageUrl = res.imageUrl,
                                thumbnailUrl = res.thumbnailUrl,
                                storagePath = res.storagePath,
                                mimeType = res.mimeType,
                                width = res.width,
                                height = res.height,
                                sizeBytes = res.sizeBytes,
                                imageVariants = res.imageVariants
                            )

                            val saveResult = if (item.isEdit) {
                                productRepository.updateProduct(
                                    productId = updatedProduct.id,
                                    updates = mapOf(
                                        "imageUrl" to updatedProduct.imageUrl,
                                        "thumbnailUrl" to updatedProduct.thumbnailUrl,
                                        "storagePath" to updatedProduct.storagePath,
                                        "mimeType" to updatedProduct.mimeType,
                                        "width" to updatedProduct.width,
                                        "height" to updatedProduct.height,
                                        "sizeBytes" to updatedProduct.sizeBytes,
                                        "imageVariants" to updatedProduct.imageVariants
                                    )
                                )
                            } else {
                                productRepository.addProduct(updatedProduct)
                            }

                            if (saveResult.isSuccess) {
                                Log.i(TAG, "Producto sincronizado con éxito desde la cola offline: ${item.product.name}")
                                queue.poll()
                                _pendingQueueCount.value = queue.size
                            } else {
                                Log.e(TAG, "Fallo al guardar producto en Firestore desde cola offline")
                                break
                            }
                        }.onFailure { err ->
                            Log.e(TAG, "Fallo al subir imágenes en cola offline: ${err.message}")
                            break
                        }
                    } else {
                        queue.poll()
                        _pendingQueueCount.value = queue.size
                    }
                } catch (e: Throwable) {
                    Log.e(TAG, "Excepción procesando elemento en cola: ${e.message}")
                    break
                }
            }
            _isUploading.value = false
        }
    }
}
