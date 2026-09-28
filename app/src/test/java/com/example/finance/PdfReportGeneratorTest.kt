package com.example.finance

import com.example.domain.engine.finance.FinancialReportGenerator
import com.example.domain.model.finance.FinancialSummary
import org.junit.Assert.*
import org.junit.Test

class PdfReportGeneratorTest {

    @Test
    fun testGeneratePdfReportContentContainsSha256() {
        val summary = FinancialSummary(grossSales = 5000.0)
        val pdf = FinancialReportGenerator.generatePdfReportContent("Restaurante Test", summary)
        assertTrue(pdf.contains("SHA-256"))
        assertTrue(pdf.contains("QR-BSD-FIN"))
    }
}
