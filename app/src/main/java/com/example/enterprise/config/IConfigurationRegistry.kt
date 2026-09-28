package com.example.enterprise.config

enum class Environment {
    DEV,
    QA,
    STAGING,
    PRODUCTION
}

enum class ConfigType {
    STRING,
    BOOLEAN,
    INTEGER,
    DOUBLE,
    JSON,
    DURATION,
    PERCENTAGE,
    CURRENCY
}

data class ConfigValue(
    val key: String,
    val value: Any,
    val type: ConfigType,
    val version: Long = 1L,
    val checksum: String = "",
    val environment: Environment = Environment.PRODUCTION
)

interface IConfigurationRegistry {
    fun getString(key: String, env: Environment = Environment.PRODUCTION, fallback: String = ""): String
    fun getBoolean(key: String, env: Environment = Environment.PRODUCTION, fallback: Boolean = false): Boolean
    fun getInteger(key: String, env: Environment = Environment.PRODUCTION, fallback: Int = 0): Int
    fun getDouble(key: String, env: Environment = Environment.PRODUCTION, fallback: Double = 0.0): Double
    fun registerConfig(configValue: ConfigValue)
}
