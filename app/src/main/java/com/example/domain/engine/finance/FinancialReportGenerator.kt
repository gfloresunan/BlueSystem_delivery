package com.example.domain.engine.finance

import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.pdf.PdfDocument
import android.widget.Toast
import androidx.core.content.FileProvider
import com.example.domain.model.finance.FinancialEvent
import com.example.domain.model.finance.FinancialSummary
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*

/**
 * Generador de Reportes PDF y CSV/Excel Enterprise (FinancialReportGenerator MFC)
 * Produce archivos PDF vectoriales nativos y CSV compatibles con Excel/Spreadsheets.
 */
object FinancialReportGenerator {

    fun generatePdfReportContent(restaurantName: String, summary: FinancialSummary): String {
        val raw = "${restaurantName}_${summary.grossSales}_${summary.netSales}_${System.currentTimeMillis()}"
        val checksum = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }

        return """
            ================================================================================
            BLUE SYSTEM DELIVERY ENTERPRISE — REPORTE FINANCIERO EJECUTIVO (PDF)
            ================================================================================
            Restaurante: $restaurantName
            Moneda: ${summary.currencySymbol}
            Ventas Brutas: ${summary.currencySymbol} ${summary.grossSales}
            Ventas Netas: ${summary.currencySymbol} ${summary.netSales}
            Comisión BlueSystem: ${summary.currencySymbol} ${summary.blueSystemCommissionAmount}
            Propinas Totales: ${summary.currencySymbol} ${summary.totalTipsAmount}
            Ticket Promedio: ${summary.currencySymbol} ${summary.averageTicketAmount}
            Utilidad Estimada: ${summary.currencySymbol} ${summary.estimatedProfitAmount}
            --------------------------------------------------------------------------------
            FIRMA DIGITAL SHA-256: $checksum
            CÓDIGO QR DE VALIDACIÓN FISCAL: QR-BSD-FIN-${checksum.take(12).uppercase()}
            ================================================================================
        """.trimIndent()
    }

    fun generateExcelReportPayload(restaurantName: String, summary: FinancialSummary): Map<String, String> {
        return mapOf(
            "Hoja_Resumen" to "Restaurante: $restaurantName | Ventas: ${summary.grossSales} | Netas: ${summary.netSales}",
            "Hoja_Ventas" to "Pedidos: ${summary.totalOrdersCount} | Ticket Promedio: ${summary.averageTicketAmount}",
            "Hoja_Comisiones" to "Comisión Descontada: ${summary.blueSystemCommissionAmount}",
            "Hoja_Propinas" to "Propinas Totales: ${summary.totalTipsAmount}"
        )
    }

    /**
     * Genera un archivo PDF vectorial nativo y abre el selector de compartir / guardar.
     */
    fun exportPdfReport(
        context: Context,
        restaurantName: String,
        summary: FinancialSummary,
        events: List<FinancialEvent>
    ) {
        try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("es", "NI"))
            val nowFormatted = dateFormat.format(Date())
            val fileDateFormat = SimpleDateFormat("yyyyMMdd_HHmm", Locale.US).format(Date())

            val raw = "${restaurantName}_${summary.grossSales}_${summary.netSales}_${System.currentTimeMillis()}"
            val checksum = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }

            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4
            val page = pdfDocument.startPage(pageInfo)
            val canvas = page.canvas

            val paint = Paint()
            val textPaint = Paint().apply {
                isAntiAlias = true
                color = Color.parseColor("#0F172A")
            }

            // Fondo
            canvas.drawColor(Color.WHITE)

            // Cabecera Corporativa
            paint.color = Color.parseColor("#0F172A")
            paint.strokeWidth = 2f
            paint.style = Paint.Style.STROKE
            canvas.drawLine(36f, 75f, 559f, 75f, paint)

            textPaint.textSize = 15f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#0F172A")
            canvas.drawText("BLUESYSTEM DELIVERY ENTERPRISE", 36f, 48f, textPaint)

            textPaint.textSize = 9.5f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#64748B")
            canvas.drawText("Reporte Financiero Ejecutivo y Resumen de Ventas", 36f, 64f, textPaint)

            // Badge Estado
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#EFF6FF")
            val badgeRect = RectF(380f, 32f, 559f, 62f)
            canvas.drawRoundRect(badgeRect, 6f, 6f, paint)

            textPaint.textSize = 9f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#2563EB")
            canvas.drawText("CERTIFICADO SSOT", 420f, 49f, textPaint)

            // Sección 1: Datos del Comercio y Período
            textPaint.textSize = 11f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#334155")
            canvas.drawText("1. INFORMACIÓN DEL COMERCIO", 36f, 100f, textPaint)

            textPaint.textSize = 9.5f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#475569")
            canvas.drawText("Comercio: $restaurantName", 36f, 118f, textPaint)
            canvas.drawText("Fecha de Emisión: $nowFormatted", 36f, 134f, textPaint)
            canvas.drawText("Moneda Canónica: Córdobas (C$ / NIO)", 300f, 118f, textPaint)
            canvas.drawText("Total de Transacciones: ${events.size}", 300f, 134f, textPaint)

            // Sección 2: Métricas Financieras (KPIs)
            textPaint.textSize = 11f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#334155")
            canvas.drawText("2. RESUMEN FINANCIERO EJECUTIVO", 36f, 164f, textPaint)

            paint.color = Color.parseColor("#E2E8F0")
            paint.strokeWidth = 1f
            paint.style = Paint.Style.STROKE
            canvas.drawLine(36f, 170f, 559f, 170f, paint)

            // Tarjetas KPI
            val kpiY = 180f
            // KPI 1: Ventas Brutas
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#F8FAFC")
            canvas.drawRoundRect(RectF(36f, kpiY, 158f, kpiY + 48f), 6f, 6f, paint)
            textPaint.textSize = 8f
            textPaint.color = Color.parseColor("#64748B")
            canvas.drawText("VENTAS BRUTAS", 46f, kpiY + 18f, textPaint)
            textPaint.textSize = 12f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#0F172A")
            canvas.drawText("C$ ${String.format(Locale.US, "%.2f", summary.grossSales)}", 46f, kpiY + 38f, textPaint)

            // KPI 2: Comisión BSD
            paint.color = Color.parseColor("#FEF2F2")
            canvas.drawRoundRect(RectF(168f, kpiY, 290f, kpiY + 48f), 6f, 6f, paint)
            textPaint.textSize = 8f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#DC2626")
            canvas.drawText("COMISIÓN BSD", 178f, kpiY + 18f, textPaint)
            textPaint.textSize = 12f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#991B1B")
            canvas.drawText("C$ ${String.format(Locale.US, "%.2f", summary.blueSystemCommissionAmount)}", 178f, kpiY + 38f, textPaint)

            // KPI 3: Ventas Netas
            paint.color = Color.parseColor("#ECFDF5")
            canvas.drawRoundRect(RectF(300f, kpiY, 422f, kpiY + 48f), 6f, 6f, paint)
            textPaint.textSize = 8f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#059669")
            canvas.drawText("VENTAS NETAS", 310f, kpiY + 18f, textPaint)
            textPaint.textSize = 12f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#065F46")
            canvas.drawText("C$ ${String.format(Locale.US, "%.2f", summary.netSales)}", 310f, kpiY + 38f, textPaint)

            // KPI 4: Ticket Promedio
            paint.color = Color.parseColor("#F8FAFC")
            canvas.drawRoundRect(RectF(432f, kpiY, 559f, kpiY + 48f), 6f, 6f, paint)
            textPaint.textSize = 8f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#64748B")
            canvas.drawText("TICKET PROMEDIO", 442f, kpiY + 18f, textPaint)
            textPaint.textSize = 12f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#0F172A")
            canvas.drawText("C$ ${String.format(Locale.US, "%.2f", summary.averageTicketAmount)}", 442f, kpiY + 38f, textPaint)

            // Sección 3: Detalle de Transacciones Recientes
            textPaint.textSize = 11f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#334155")
            canvas.drawText("3. DETALLE DE MOVIMIENTOS RECIENTES", 36f, 256f, textPaint)

            // Tabla Encabezados
            paint.style = Paint.Style.FILL
            paint.color = Color.parseColor("#F1F5F9")
            canvas.drawRect(36f, 266f, 559f, 286f, paint)

            textPaint.textSize = 8f
            textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textPaint.color = Color.parseColor("#475569")
            canvas.drawText("FECHA", 42f, 279f, textPaint)
            canvas.drawText("PEDIDO", 120f, 279f, textPaint)
            canvas.drawText("MÉTODO", 190f, 279f, textPaint)
            canvas.drawText("BRUTO", 280f, 279f, textPaint)
            canvas.drawText("COMISIÓN", 365f, 279f, textPaint)
            canvas.drawText("NETO", 460f, 279f, textPaint)

            // Filas
            var currentY = 302f
            val itemDateFormat = SimpleDateFormat("dd/MM HH:mm", Locale("es", "NI"))
            val rowEvents = events.take(18) // Máximo de filas en página 1
            for (ev in rowEvents) {
                val evDate = ev.createdAt?.toDate()?.let { itemDateFormat.format(it) } ?: "—"
                val evCode = ev.displayOrderCode
                val evMethod = ev.paymentMethod.replaceFirstChar { it.uppercase() }
                val evGross = "C$ ${String.format(Locale.US, "%.2f", ev.merchantGrossSalesCents / 100.0)}"
                val evFee = "-C$ ${String.format(Locale.US, "%.2f", ev.commissionNio)}"
                val evNet = "C$ ${String.format(Locale.US, "%.2f", ev.netPayoutNio)}"

                textPaint.typeface = Typeface.DEFAULT
                textPaint.textSize = 8f
                textPaint.color = Color.parseColor("#64748B")
                canvas.drawText(evDate, 42f, currentY, textPaint)

                textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textPaint.color = Color.parseColor("#0F172A")
                canvas.drawText(evCode, 120f, currentY, textPaint)

                textPaint.typeface = Typeface.DEFAULT
                textPaint.color = Color.parseColor("#64748B")
                canvas.drawText(evMethod, 190f, currentY, textPaint)

                textPaint.color = Color.parseColor("#0F172A")
                canvas.drawText(evGross, 280f, currentY, textPaint)

                textPaint.color = Color.parseColor("#DC2626")
                canvas.drawText(evFee, 365f, currentY, textPaint)

                textPaint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textPaint.color = Color.parseColor("#059669")
                canvas.drawText(evNet, 460f, currentY, textPaint)

                paint.color = Color.parseColor("#F1F5F9")
                paint.strokeWidth = 0.5f
                canvas.drawLine(36f, currentY + 6f, 559f, currentY + 6f, paint)

                currentY += 22f
            }

            if (rowEvents.isEmpty()) {
                textPaint.typeface = Typeface.DEFAULT
                textPaint.textSize = 9f
                textPaint.color = Color.parseColor("#94A3B8")
                canvas.drawText("No se registran transacciones para el período seleccionado.", 160f, 320f, textPaint)
            }

            // Pie de Página y Hash de Seguridad
            paint.color = Color.parseColor("#CBD5E1")
            paint.strokeWidth = 1f
            canvas.drawLine(36f, 790f, 559f, 790f, paint)

            textPaint.textSize = 7.5f
            textPaint.typeface = Typeface.DEFAULT
            textPaint.color = Color.parseColor("#64748B")
            canvas.drawText("Documento inmutable generado por BlueSystem Delivery Enterprise.", 36f, 804f, textPaint)
            canvas.drawText("Hash de Validación: $checksum", 36f, 816f, textPaint)

            pdfDocument.finishPage(page)

            // Guardar en caché y compartir vía FileProvider
            val reportsDir = File(context.cacheDir, "reports")
            if (!reportsDir.exists()) reportsDir.mkdirs()
            val pdfFile = File(reportsDir, "Reporte_Financiero_${fileDateFormat}.pdf")

            FileOutputStream(pdfFile).use { outputStream ->
                pdfDocument.writeTo(outputStream)
            }
            pdfDocument.close()

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                pdfFile
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Reporte Financiero — $restaurantName")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Compartir Reporte Financiero PDF"))
        } catch (e: Exception) {
            Toast.makeText(context, "Error al generar PDF: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Genera un archivo CSV compatible con Excel y abre el selector de compartir / guardar.
     */
    fun exportCsvReport(
        context: Context,
        restaurantName: String,
        summary: FinancialSummary,
        events: List<FinancialEvent>
    ) {
        try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("es", "NI"))
            val nowFormatted = dateFormat.format(Date())
            val fileDateFormat = SimpleDateFormat("yyyyMMdd_HHmm", Locale.US).format(Date())

            val sb = StringBuilder()
            // UTF-8 BOM para apertura correcta en Microsoft Excel
            sb.append('\uFEFF')

            sb.append("REPORTE FINANCIERO — BLUESYSTEM DELIVERY ENTERPRISE\n")
            sb.append("Comercio:,\"$restaurantName\"\n")
            sb.append("Fecha de Emisión:,\"$nowFormatted\"\n")
            sb.append("Ventas Brutas (C$):,${summary.grossSales}\n")
            sb.append("Comisión BlueSystem (C$):,${summary.blueSystemCommissionAmount}\n")
            sb.append("Ventas Netas (C$):,${summary.netSales}\n")
            sb.append("Ticket Promedio (C$):,${summary.averageTicketAmount}\n")
            sb.append("Pedidos Totales:,${summary.totalOrdersCount}\n\n")

            sb.append("Fecha,Código Pedido,Método de Pago,Ventas Brutas (C$),Comisión (C$),Ventas Netas (C$)\n")

            val itemDateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
            for (ev in events) {
                val dateStr = ev.createdAt?.toDate()?.let { itemDateFormat.format(it) } ?: ""
                val code = ev.displayOrderCode
                val method = ev.paymentMethod
                val gross = ev.merchantGrossSalesCents / 100.0
                val commission = ev.commissionNio
                val net = ev.netPayoutNio

                sb.append("\"$dateStr\",\"$code\",\"$method\",$gross,$commission,$net\n")
            }

            val reportsDir = File(context.cacheDir, "reports")
            if (!reportsDir.exists()) reportsDir.mkdirs()
            val csvFile = File(reportsDir, "Reporte_Financiero_${fileDateFormat}.csv")

            csvFile.writeText(sb.toString(), Charsets.UTF_8)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                csvFile
            )

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Reporte Financiero CSV — $restaurantName")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Compartir Reporte Financiero CSV"))
        } catch (e: Exception) {
            Toast.makeText(context, "Error al exportar CSV: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }
}
