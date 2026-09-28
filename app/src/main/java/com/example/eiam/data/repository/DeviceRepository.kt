package com.example.eiam.data.repository

import com.example.eiam.domain.model.DeviceInfo
import com.example.eiam.domain.repository.IDeviceRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — DeviceRepository (FASE 8)
 * Implementación de Firestore para dispositivos.
 */
class DeviceRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IDeviceRepository {

    private val collection = firestore.collection("devices")

    override suspend fun getDeviceById(deviceId: String): DeviceInfo? {
        return try {
            val snapshot = collection.document(deviceId).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(DeviceInfo::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getDevicesByUid(uid: String): List<DeviceInfo> {
        return try {
            val snapshot = collection.whereEqualTo("uid", uid).get().await()
            snapshot.toObjects(DeviceInfo::class.java)
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveDevice(device: DeviceInfo): Boolean {
        return try {
            collection.document(device.deviceId).set(device).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateDeviceTrust(deviceId: String, isTrusted: Boolean): Boolean {
        return try {
            collection.document(deviceId).update("isTrusted", isTrusted).await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
