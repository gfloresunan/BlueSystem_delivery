package com.example.finance

import com.example.domain.engine.finance.FinancialReportGenerator
import com.example.domain.model.finance.FinancialSummary
import org.junit.Assert.*
import org.junit.Test

class ExcelExportTest {

    @Test
    fun testGenerateExcelPayloadContainsMultipleSheets() {
        val summary = FinancialSummary(grossSales = 8000.0)
        val payload = FinancialReportGenerator.generateExcelReportPayload("Restaurante Test", summary)
        assertTrue(payload.containsKey("Hoja_Resumen"))
        assertTrue(payload.containsKey("Hoja_Comisiones"))
    }
}
