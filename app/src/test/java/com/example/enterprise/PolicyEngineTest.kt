package com.example.enterprise

import com.example.domain.engine.order.UserRole
import com.example.enterprise.policy.PolicyAction
import com.example.enterprise.policy.PolicyEngineImpl
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PolicyEngineTest {

    private val engine = PolicyEngineImpl()

    @Test
    fun `test policy engine permits owner and admin for rollback`() {
        assertTrue(engine.evaluatePolicy(PolicyAction.EXECUTE_ROLLBACK, UserRole.OWNER))
        assertTrue(engine.evaluatePolicy(PolicyAction.EXECUTE_ROLLBACK, UserRole.ADMIN))
        assertFalse(engine.evaluatePolicy(PolicyAction.EXECUTE_ROLLBACK, UserRole.COOK))
    }
}
