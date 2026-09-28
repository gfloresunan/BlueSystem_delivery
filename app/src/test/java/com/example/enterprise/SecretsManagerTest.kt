package com.example.enterprise

import com.example.enterprise.secrets.SecretsManager
import org.junit.Assert.assertEquals
import org.junit.Test

class SecretsManagerTest {

    private val secretsManager = SecretsManager()

    @Test
    fun `test register and retrieve secret`() {
        secretsManager.registerSecret("jwt_key", "secret_key_12345")
        assertEquals("secret_key_12345", secretsManager.getSecret("jwt_key"))
    }
}
