package com.example.enterprise.config

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper

/**
 * Servidor Enterprise: ConfigurationRegistryImpl (Pilar 1 y 2).
 * Única puerta de acceso desacoplada para configuraciones de plataforma, entornos y tipos de datos.
 */
class ConfigurationRegistryImpl : IConfigurationRegistry {

    private val configMemory = mutableMapOf<String, ConfigValue>()

    override fun registerConfig(configValue: ConfigValue) {
        val checksum = CanonicalJsonChecksumHelper.sha256Hex("${configValue.key}:${configValue.value}:${configValue.version}")
        val valueWithChecksum = configValue.copy(checksum = checksum)
        val lookupKey = "${configValue.environment.name}:${configValue.key}"
        configMemory[lookupKey] = valueWithChecksum
    }

    override fun getString(key: String, env: Environment, fallback: String): String {
        val lookupKey = "${env.name}:$key"
        val entry = configMemory[lookupKey] ?: return fallback
        return entry.value.toString()
    }

    override fun getBoolean(key: String, env: Environment, fallback: Boolean): Boolean {
        val lookupKey = "${env.name}:$key"
        val entry = configMemory[lookupKey] ?: return fallback
        return when (val v = entry.value) {
            is Boolean -> v
            is String -> v.toBooleanStrictOrNull() ?: fallback
            else -> fallback
        }
    }

    override fun getInteger(key: String, env: Environment, fallback: Int): Int {
        val lookupKey = "${env.name}:$key"
        val entry = configMemory[lookupKey] ?: return fallback
        return when (val v = entry.value) {
            is Int -> v
            is Number -> v.toInt()
            is String -> v.toIntOrNull() ?: fallback
            else -> fallback
        }
    }

    override fun getDouble(key: String, env: Environment, fallback: Double): Double {
        val lookupKey = "${env.name}:$key"
        val entry = configMemory[lookupKey] ?: return fallback
        return when (val v = entry.value) {
            is Double -> v
            is Number -> v.toDouble()
            is String -> v.toDoubleOrNull() ?: fallback
            else -> fallback
        }
    }
}
