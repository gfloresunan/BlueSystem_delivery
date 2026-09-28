package com.example.eiam.domain.repository

import com.example.eiam.domain.model.DeviceInfo

/**
 * EIAM — Interface IDeviceRepository (FASE 8)
 */
interface IDeviceRepository {
    suspend fun getDeviceById(deviceId: String): DeviceInfo?
    suspend fun getDevicesByUid(uid: String): List<DeviceInfo>
    suspend fun saveDevice(device: DeviceInfo): Boolean
    suspend fun updateDeviceTrust(deviceId: String, isTrusted: Boolean): Boolean
}
