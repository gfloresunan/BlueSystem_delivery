package com.example.enterprise.secrets

interface ISecretsProvider {
    fun getSecret(secretKey: String): String?
    fun registerSecret(secretKey: String, secretValue: String)
}

/**
 * Servidor Enterprise: SecretsManager (Pilar 8).
 * Aisla llaves de API, JWT, certificados y tokens del archivo de configuración general.
 * Preparado para integración futura con Google Secret Manager.
 */
class SecretsManager : ISecretsProvider {

    private val secretsMemory = mutableMapOf<String, String>()

    override fun getSecret(secretKey: String): String? {
        return secretsMemory[secretKey]
    }

    override fun registerSecret(secretKey: String, secretValue: String) {
        secretsMemory[secretKey] = secretValue
    }
}
