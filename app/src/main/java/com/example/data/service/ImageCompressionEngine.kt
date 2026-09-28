package com.example.data.service

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.util.Log
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

data class CompressedImageData(
    val bytes: ByteArray,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val mimeType: String
)

data class MultiResImageVariantsData(
    val thumb100: CompressedImageData,
    val thumb300: CompressedImageData,
    val medium600: CompressedImageData,
    val original1200: CompressedImageData
)

/**
 * Servicio Nativo de Compresión Multi-Resolución (100px, 300px, 600px, 1200px),
 * Corrección EXIF y Fallback Dinámico a JPEG para el Wizard de Productos.
 */
object ImageCompressionEngine {
    private const val TAG = "ImageCompressionEngine"

    fun processMultiResImageUri(
        context: Context,
        imageUri: Uri
    ): MultiResImageVariantsData? {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri) ?: return null
            val inputBytes = inputStream.use { it.readBytes() }
            if (inputBytes.isEmpty()) return null

            val orientation = getExifOrientation(context, imageUri, inputBytes)

            val thumb100 = processBytesInternal(inputBytes, orientation, 100, 70)
            val thumb300 = processBytesInternal(inputBytes, orientation, 300, 75)
            val medium600 = processBytesInternal(inputBytes, orientation, 600, 80)
            val original1200 = processBytesInternal(inputBytes, orientation, 1200, 85)

            MultiResImageVariantsData(
                thumb100 = thumb100,
                thumb300 = thumb300,
                medium600 = medium600,
                original1200 = original1200
            )
        } catch (e: Throwable) {
            Log.e(TAG, "Error procesando variantes multi-resolución de imagen Uri: ${e.message}", e)
            null
        }
    }

    fun processImageUri(
        context: Context,
        imageUri: Uri,
        maxDimensionPx: Int = 1200,
        quality: Int = 80
    ): CompressedImageData? {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri) ?: return null
            val inputBytes = inputStream.use { it.readBytes() }
            if (inputBytes.isEmpty()) return null

            val orientation = getExifOrientation(context, imageUri, inputBytes)
            processBytesInternal(inputBytes, orientation, maxDimensionPx, quality)
        } catch (e: Throwable) {
            Log.e(TAG, "Error procesando imagen Uri: ${e.message}", e)
            null
        }
    }

    fun processThumbnailUri(
        context: Context,
        imageUri: Uri,
        maxDimensionPx: Int = 300,
        quality: Int = 75
    ): CompressedImageData? {
        return processImageUri(context, imageUri, maxDimensionPx, quality)
    }

    fun compressImageBytes(
        inputBytes: ByteArray,
        maxDimensionPx: Int = 1200,
        quality: Int = 80
    ): ByteArray {
        val result = processBytesInternal(inputBytes, ExifInterface.ORIENTATION_UNDEFINED, maxDimensionPx, quality)
        return result.bytes
    }

    private fun getExifOrientation(context: Context, uri: Uri, bytes: ByteArray): Int {
        return try {
            val exifInterface = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                context.contentResolver.openInputStream(uri)?.use { stream ->
                    ExifInterface(stream)
                } ?: ExifInterface(ByteArrayInputStream(bytes))
            } else {
                ExifInterface(ByteArrayInputStream(bytes))
            }
            exifInterface.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        } catch (e: Throwable) {
            Log.w(TAG, "No se pudo leer metadatos EXIF: ${e.message}")
            ExifInterface.ORIENTATION_UNDEFINED
        }
    }

    private fun processBytesInternal(
        inputBytes: ByteArray,
        orientation: Int,
        maxDimensionPx: Int,
        quality: Int
    ): CompressedImageData {
        return try {
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeByteArray(inputBytes, 0, inputBytes.size, options)

            val srcWidth = options.outWidth
            val srcHeight = options.outHeight

            if (srcWidth <= 0 || srcHeight <= 0) {
                val mime = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) "image/webp" else "image/jpeg"
                return CompressedImageData(inputBytes, 0, 0, inputBytes.size.toLong(), mime)
            }

            var sampleSize = 1
            if (srcWidth > maxDimensionPx || srcHeight > maxDimensionPx) {
                val halfWidth = srcWidth / 2
                val halfHeight = srcHeight / 2
                while (halfWidth / sampleSize >= maxDimensionPx && halfHeight / sampleSize >= maxDimensionPx) {
                    sampleSize *= 2
                }
            }

            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }

            val decodedBitmap = BitmapFactory.decodeByteArray(inputBytes, 0, inputBytes.size, decodeOptions)
                ?: run {
                    val mime = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) "image/webp" else "image/jpeg"
                    return CompressedImageData(inputBytes, srcWidth, srcHeight, inputBytes.size.toLong(), mime)
                }

            val rotatedBitmap = rotateBitmapIfRequired(decodedBitmap, orientation)

            val width = rotatedBitmap.width
            val height = rotatedBitmap.height
            val scale = maxDimensionPx.toFloat() / Math.max(width, height)

            val finalBitmap = if (scale < 1.0f) {
                val newW = Math.max(1, (width * scale).toInt())
                val newH = Math.max(1, (height * scale).toInt())
                Bitmap.createScaledBitmap(rotatedBitmap, newW, newH, true)
            } else {
                rotatedBitmap
            }

            val outputStream = ByteArrayOutputStream()
            val (format, mimeType) = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    Pair(Bitmap.CompressFormat.WEBP_LOSSY, "image/webp")
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR_MR1) {
                    Pair(Bitmap.CompressFormat.WEBP, "image/webp")
                } else {
                    Pair(Bitmap.CompressFormat.JPEG, "image/jpeg")
                }
            } catch (e: Throwable) {
                Pair(Bitmap.CompressFormat.JPEG, "image/jpeg")
            }

            val success = finalBitmap.compress(format, quality, outputStream)
            val compressedBytes = if (success && outputStream.size() > 0) {
                outputStream.toByteArray()
            } else {
                // Fallback a JPEG si WebP falló
                val jpegStream = ByteArrayOutputStream()
                finalBitmap.compress(Bitmap.CompressFormat.JPEG, quality, jpegStream)
                jpegStream.toByteArray()
            }

            val finalW = finalBitmap.width
            val finalH = finalBitmap.height

            if (finalBitmap != decodedBitmap && !finalBitmap.isRecycled) {
                finalBitmap.recycle()
            }
            if (decodedBitmap != rotatedBitmap && !decodedBitmap.isRecycled) {
                decodedBitmap.recycle()
            }
            if (!rotatedBitmap.isRecycled) {
                rotatedBitmap.recycle()
            }

            CompressedImageData(
                bytes = compressedBytes,
                width = finalW,
                height = finalH,
                sizeBytes = compressedBytes.size.toLong(),
                mimeType = mimeType
            )
        } catch (e: Throwable) {
            Log.e(TAG, "Excepción en compresión interna: ${e.message}")
            val mime = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) "image/webp" else "image/jpeg"
            CompressedImageData(inputBytes, 0, 0, inputBytes.size.toLong(), mime)
        }
    }

    private fun rotateBitmapIfRequired(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            else -> return bitmap
        }
        return try {
            val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            if (rotated != bitmap && !bitmap.isRecycled) {
                bitmap.recycle()
            }
            rotated
        } catch (e: Throwable) {
            bitmap
        }
    }
}
