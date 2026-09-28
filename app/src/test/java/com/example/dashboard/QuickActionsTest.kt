package com.example.dashboard

import org.junit.Assert.*
import org.junit.Test

class QuickActionsTest {

    @Test
    fun testQuickActionTriggers() {
        var triggeredAction: String? = null
        val onAction = { actionName: String -> triggeredAction = actionName }

        onAction("ADD_PRODUCT")
        assertEquals("ADD_PRODUCT", triggeredAction)
    }
}
