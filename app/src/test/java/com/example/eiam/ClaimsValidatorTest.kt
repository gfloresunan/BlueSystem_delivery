package com.example.eiam

import com.example.eiam.domain.model.EiamRole
import com.example.eiam.security.claims.ClaimsValidator
import com.example.eiam.security.claims.EiamClaims
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClaimsValidatorTest {

    @Test
    fun testValidateClaims_validOwner() {
        val claims = EiamClaims(
            uid = "usr_1",
            role = EiamRole.OWNER,
            businessId = "biz_100"
        )
        assertTrue(ClaimsValidator.validateClaims(claims))
    }

    @Test
    fun testValidateClaims_invalidOwnerWithoutBusinessId() {
        val claims = EiamClaims(
            uid = "usr_1",
            role = EiamRole.OWNER,
            businessId = null
        )
        assertFalse(ClaimsValidator.validateClaims(claims))
    }

    @Test
    fun testValidateClaims_validClientWithoutBusinessId() {
        val claims = EiamClaims(
            uid = "usr_2",
            role = EiamRole.CLIENT,
            businessId = null
        )
        assertTrue(ClaimsValidator.validateClaims(claims))
    }
}
