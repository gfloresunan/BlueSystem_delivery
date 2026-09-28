package com.example.eiam

import com.example.eiam.domain.model.Organization
import org.junit.Assert.assertEquals
import org.junit.Test

class OrganizationEngineTest {

    @Test
    fun testOrganizationCreation() {
        val org = Organization(
            organizationId = "org_tip_top",
            name = "Grupo Tip Top",
            taxId = "J0310000000001",
            ownerUid = "usr_owner_1",
            businessIds = listOf("biz_pizza_tiptop", "biz_burgers_tiptop")
        )

        assertEquals("Grupo Tip Top", org.name)
        assertEquals(2, org.businessIds.size)
        assertEquals("org_tip_top", org.organizationId)
    }
}
