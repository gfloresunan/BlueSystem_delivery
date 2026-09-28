package com.example.dashboard

import com.example.domain.model.dashboard.AlertActionType
import com.example.domain.model.dashboard.AlertSeverity
import com.example.domain.model.dashboard.MerchantAlert
import org.junit.Assert.*
import org.junit.Test

class AlertEngineTest {

    @Test
    fun testAlertSeverityClassification() {
        val alert = MerchantAlert(
            id = "a1",
            title = "Stock Agotado",
            severity = AlertSeverity.CRITICAL,
            actionType = AlertActionType.OPEN_PRODUCT
        )

        assertEquals(AlertSeverity.CRITICAL, alert.severity)
        assertEquals(AlertActionType.OPEN_PRODUCT, alert.actionType)
    }
}
