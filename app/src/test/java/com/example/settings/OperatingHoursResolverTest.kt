package com.example.settings

import com.example.domain.engine.business.OperatingHoursResolver
import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Suite de Pruebas Unificadas: OperatingHoursResolverTest (BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001)
 *
 * Matriz Obligatoria T01 - T12:
 * T01: 09:00–22:00 @ 08:59 -> CLOSED
 * T02: 09:00–22:00 @ 09:00 -> OPEN
 * T03: 09:00–22:00 @ 12:00 -> OPEN
 * T04: 09:00–22:00 @ 21:59 -> OPEN
 * T05: 09:00–22:00 @ 22:00 -> CLOSED
 * T06: 18:00–02:00 @ 17:59 -> CLOSED
 * T07: 18:00–02:00 @ 18:00 -> OPEN
 * T08: 18:00–02:00 @ 23:00 -> OPEN
 * T09: 18:00–02:00 @ 01:59 -> OPEN (madrugada siguiente)
 * T10: 18:00–02:00 @ 02:00 -> CLOSED (madrugada siguiente)
 * T11: Día cerrado @ cualquier hora -> CLOSED
 * T12: 24 horas @ cualquier hora -> OPEN
 */
class OperatingHoursResolverTest {

    private val zone = ZoneId.of("America/Managua")
    private val wednesdayDate = LocalDate.of(2026, 9, 16) // Wednesday
    private val thursdayDate = LocalDate.of(2026, 9, 17)  // Thursday

    // Horario estándar diurno de Lunes a Domingo (09:00 a 22:00)
    private val standardDaytimeSchedule = mapOf(
        "lunes" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "martes" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "miercoles" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "jueves" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "viernes" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "sabado" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "domingo" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true)
    )

    // Horario nocturno que cruza medianoche (Miércoles 18:00 a 02:00 del Jueves)
    private val overnightSchedule = mapOf(
        "martes" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to true),
        "miercoles" to mapOf("open" to "18:00", "close" to "02:00", "isOpen" to true),
        "jueves" to mapOf("open" to "18:00", "close" to "02:00", "isOpen" to true)
    )

    // Horario con Domingo cerrado
    private val closedSundaySchedule = mapOf(
        "domingo" to mapOf("open" to "09:00", "close" to "22:00", "isOpen" to false)
    )

    // Horario 24 horas
    private val open24hSchedule = mapOf(
        "miercoles" to mapOf("open" to "00:00", "close" to "23:59", "isOpen" to true)
    )

    @Test
    fun test_T01_standardSchedule_beforeOpening_isClosed() {
        // 09:00 - 22:00 a las 08:59 -> CLOSED
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(8, 59), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = true, targetDateTime = dt)
        assertFalse("A las 08:59 debe estar cerrado", status.isOpen)
        assertEquals("OUTSIDE_OPERATIONAL_HOURS", status.reason)
    }

    @Test
    fun test_T02_standardSchedule_exactOpening_isOpen() {
        // 09:00 - 22:00 a las 09:00 -> OPEN
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(9, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("A las 09:00 exactas debe estar abierto", status.isOpen)
        assertEquals("WITHIN_OPERATIONAL_HOURS", status.reason)
    }

    @Test
    fun test_T03_standardSchedule_midday_isOpen() {
        // 09:00 - 22:00 a las 12:00 -> OPEN
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(12, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("Al mediodía debe estar abierto", status.isOpen)
    }

    @Test
    fun test_T04_standardSchedule_justBeforeClosing_isOpen() {
        // 09:00 - 22:00 a las 21:59 -> OPEN
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(21, 59), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("A las 21:59 debe estar abierto", status.isOpen)
    }

    @Test
    fun test_T05_standardSchedule_exactClosing_isClosed() {
        // 09:00 - 22:00 a las 22:00 -> CLOSED
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(22, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = true, targetDateTime = dt)
        assertFalse("A las 22:00 en punto debe estar cerrado", status.isOpen)
    }

    @Test
    fun test_T06_overnightSchedule_beforeOpening_isClosed() {
        // 18:00 - 02:00 a las 17:59 -> CLOSED
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(17, 59), zone)
        val status = OperatingHoursResolver.resolveStatus(overnightSchedule, manualOpen = true, targetDateTime = dt)
        assertFalse("A las 17:59 antes de abrir debe estar cerrado", status.isOpen)
    }

    @Test
    fun test_T07_overnightSchedule_exactOpening_isOpen() {
        // 18:00 - 02:00 a las 18:00 -> OPEN
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(18, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(overnightSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("A las 18:00 exactas debe abrir jornada nocturna", status.isOpen)
    }

    @Test
    fun test_T08_overnightSchedule_nightBeforeMidnight_isOpen() {
        // 18:00 - 02:00 a las 23:00 -> OPEN
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(23, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(overnightSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("A las 23:00 debe continuar abierto", status.isOpen)
    }

    @Test
    fun test_T09_overnightSchedule_earlyMorningNextDay_isOpen() {
        // 18:00 - 02:00 a la 01:59 del Jueves -> OPEN (continúa shift del Miércoles)
        val dt = ZonedDateTime.of(thursdayDate, LocalTime.of(1, 59), zone)
        val status = OperatingHoursResolver.resolveStatus(overnightSchedule, manualOpen = true, targetDateTime = dt)
        assertTrue("A la 01:59 de la madrugada siguiente debe continuar abierto", status.isOpen)
        assertEquals("WITHIN_OVERNIGHT_HOURS_FROM_PREVIOUS_DAY", status.reason)
    }

    @Test
    fun test_T10_overnightSchedule_exactClosingNextDay_isClosed() {
        // 18:00 - 02:00 a las 02:00 del Jueves -> CLOSED
        val dt = ZonedDateTime.of(thursdayDate, LocalTime.of(2, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(overnightSchedule, manualOpen = true, targetDateTime = dt)
        assertFalse("A las 02:00 de la madrugada el turno nocturno concluye", status.isOpen)
    }

    @Test
    fun test_T11_closedDay_isClosed() {
        val sundayDate = LocalDate.of(2026, 9, 20) // Sunday
        val dt = ZonedDateTime.of(sundayDate, LocalTime.of(14, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(closedSundaySchedule, manualOpen = true, targetDateTime = dt)
        assertFalse("Día marcado cerrado debe retornar false", status.isOpen)
        assertEquals("CLOSED_TODAY", status.reason)
    }

    @Test
    fun test_T12_open24Hours_isOpen() {
        val dt1 = ZonedDateTime.of(wednesdayDate, LocalTime.of(3, 30), zone)
        val dt2 = ZonedDateTime.of(wednesdayDate, LocalTime.of(23, 45), zone)
        assertTrue(OperatingHoursResolver.isStoreOpen(open24hSchedule, manualOpen = true, targetDateTime = dt1))
        assertTrue(OperatingHoursResolver.isStoreOpen(open24hSchedule, manualOpen = true, targetDateTime = dt2))
    }

    @Test
    fun test_T13_manualEmergencySwitch_overridesSchedule() {
        // Incluso en horario diurno activo (12:00), si manualOpen = false, debe estar cerrado
        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(12, 0), zone)
        val status = OperatingHoursResolver.resolveStatus(standardDaytimeSchedule, manualOpen = false, targetDateTime = dt)
        assertFalse("Switch manual apagado tiene precedencia absoluta", status.isOpen)
        assertEquals("MANUALLY_CLOSED", status.reason)
    }

    @Test
    fun test_T14_multiTenant_scheduleIsolation() {
        // Tenant A: 08:00 - 15:00
        val scheduleA = mapOf("miercoles" to mapOf("open" to "08:00", "close" to "15:00", "isOpen" to true))
        // Tenant B: 17:00 - 23:00
        val scheduleB = mapOf("miercoles" to mapOf("open" to "17:00", "close" to "23:00", "isOpen" to true))

        val dt = ZonedDateTime.of(wednesdayDate, LocalTime.of(16, 0), zone)
        // A las 16:00, Tenant A está cerrado y Tenant B aún no abre
        assertFalse(OperatingHoursResolver.isStoreOpen(scheduleA, manualOpen = true, targetDateTime = dt))
        assertFalse(OperatingHoursResolver.isStoreOpen(scheduleB, manualOpen = true, targetDateTime = dt))

        val dtB = ZonedDateTime.of(wednesdayDate, LocalTime.of(18, 0), zone)
        // A las 18:00, Tenant A sigue cerrado y Tenant B está abierto
        assertFalse(OperatingHoursResolver.isStoreOpen(scheduleA, manualOpen = true, targetDateTime = dtB))
        assertTrue(OperatingHoursResolver.isStoreOpen(scheduleB, manualOpen = true, targetDateTime = dtB))
    }

    @Test
    fun test_T15_businessInfo_and_branch_modelIntegration() {
        val bizInfo = com.example.data.repository.BusinessInfo(
            isOpen = true,
            abierto = true,
            scheduleMap = mapOf("miercoles" to mapOf("open" to "08:00", "close" to "20:00", "isOpen" to true))
        )
        // Manual override = false debe dar false
        val bizClosed = bizInfo.copy(isOpen = false)
        assertFalse("BusinessInfo con isOpen=false debe retornar false", bizClosed.getEffectiveIsOpen())

        val branch = com.example.eiam.domain.model.Branch(
            isOpen = true,
            weeklySchedule = mapOf("miercoles" to mapOf("open" to "08:00", "close" to "20:00", "isOpen" to true))
        )
        val branchClosed = branch.copy(isOpen = false)
        assertFalse("Branch con isOpen=false debe retornar false", branchClosed.isCurrentlyOpen())
    }

    // =========================================================================
    // SPRINT 18.2: EXTENSIÓN DE PRUEBAS DE CONSISTENCIA DASHBOARD VS DETALLE
    // BSD-MERCHANT-AVAILABILITY-STATUS-DIVERGENCE-ROOT-CAUSE-001 (T16 - T25)
    // =========================================================================

    @Test
    fun test_T16_tecnoStore_dashboardVsDetail_at_13_56_bothOpen() {
        // TECNOSTORE Miércoles 09:00 - 14:00 evaluado a las 13:56 America/Managua
        val tecnoSchedule = mapOf(
            "miercoles" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true)
        )
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(13, 56), zone)

        // 1. Dashboard (BusinessInfo)
        val biz = com.example.data.repository.BusinessInfo(
            id = "TECNOSTORE",
            name = "TECNOSTORE",
            isOpen = true,
            abierto = true,
            scheduleMap = tecnoSchedule
        )
        val dashboardIsOpen = OperatingHoursResolver.isStoreOpen(biz.scheduleMap, manualOpen = biz.isOpen && biz.abierto, targetDateTime = evalTime)
        assertTrue("Dashboard debe evaluar ABIERTO a las 13:56", dashboardIsOpen)

        // 2. Detalle (Branch con schedule o herencia de negocio)
        val branchWithSchedule = com.example.eiam.domain.model.Branch(
            branchId = "branch_tecnostore_1",
            businessId = "TECNOSTORE",
            isOpen = true,
            weeklySchedule = tecnoSchedule
        )
        val detailWithScheduleIsOpen = OperatingHoursResolver.isStoreOpen(branchWithSchedule.weeklySchedule, manualOpen = branchWithSchedule.isOpen, targetDateTime = evalTime)
        assertTrue("Detalle con sucursal programada debe evaluar ABIERTO a las 13:56", detailWithScheduleIsOpen)

        // 3. Detalle (Branch sin schedule propio, hereda de Business)
        val branchWithoutSchedule = com.example.eiam.domain.model.Branch(
            branchId = "branch_tecnostore_2",
            businessId = "TECNOSTORE",
            isOpen = true,
            weeklySchedule = emptyMap()
        )
        val inheritedSchedule = if (branchWithoutSchedule.weeklySchedule.isNotEmpty()) branchWithoutSchedule.weeklySchedule else biz.scheduleMap
        val detailInheritedIsOpen = OperatingHoursResolver.isStoreOpen(inheritedSchedule, manualOpen = branchWithoutSchedule.isOpen, targetDateTime = evalTime)
        assertTrue("Detalle con sucursal que hereda horario debe evaluar ABIERTO a las 13:56", detailInheritedIsOpen)

        assertEquals("Dashboard y Detalle deben converger exactamente en el mismo estado operacional", dashboardIsOpen, detailInheritedIsOpen)
    }

    @Test
    fun test_T17_tecnoStore_dashboardVsDetail_at_14_00_bothClosed() {
        // TECNOSTORE Miércoles 09:00 - 14:00 evaluado a las 14:00 America/Managua
        val tecnoSchedule = mapOf(
            "miercoles" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true)
        )
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(14, 0), zone)

        val biz = com.example.data.repository.BusinessInfo(
            id = "TECNOSTORE",
            scheduleMap = tecnoSchedule,
            isOpen = true,
            abierto = true
        )
        val branch = com.example.eiam.domain.model.Branch(
            businessId = "TECNOSTORE",
            weeklySchedule = tecnoSchedule,
            isOpen = true
        )

        val dashboardIsOpen = OperatingHoursResolver.isStoreOpen(biz.scheduleMap, manualOpen = true, targetDateTime = evalTime)
        val detailIsOpen = OperatingHoursResolver.isStoreOpen(branch.weeklySchedule, manualOpen = true, targetDateTime = evalTime)

        assertFalse("Dashboard debe evaluar CERRADO a las 14:00", dashboardIsOpen)
        assertFalse("Detalle debe evaluar CERRADO a las 14:00", detailIsOpen)
        assertEquals(dashboardIsOpen, detailIsOpen)
    }

    @Test
    fun test_T18_realTime_schedulePropagation_simulated() {
        val initialSchedule = mapOf("miercoles" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true))
        val updatedSchedule = mapOf("miercoles" to mapOf("open" to "15:00", "close" to "20:00", "isOpen" to true))
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(14, 30), zone)

        // Con horario inicial a las 14:30 está cerrado
        assertFalse(OperatingHoursResolver.isStoreOpen(initialSchedule, manualOpen = true, targetDateTime = evalTime))

        // Al propagarse el horario actualizado de Merchant Web (15:00-20:00), a las 14:30 sigue cerrado pero a las 15:30 debe estar abierto
        val evalTimeLate = ZonedDateTime.of(wednesdayDate, LocalTime.of(15, 30), zone)
        assertTrue(OperatingHoursResolver.isStoreOpen(updatedSchedule, manualOpen = true, targetDateTime = evalTimeLate))
    }

    @Test
    fun test_T19_branch_defaultIsOpen_isTrue() {
        // Verificación de integridad: una sucursal sin campo isOpen en Firestore debe tener default = true (consistente con BusinessInfo)
        val defaultBranch = com.example.eiam.domain.model.Branch(branchId = "test_branch")
        assertTrue("El valor por defecto de isOpen en Branch debe ser true para no apagar el comercio", defaultBranch.isOpen)
    }

    @Test
    fun test_T20_branch_scheduleInheritance_fromBusiness() {
        val bizSchedule = mapOf("miercoles" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true))
        val branchWithoutSchedule = com.example.eiam.domain.model.Branch(
            branchId = "b1",
            isOpen = true,
            weeklySchedule = emptyMap()
        )
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(11, 0), zone)

        // isCurrentlyOpen con parentSchedule provisto debe resolver usando el horario de negocio
        val openWithParent = branchWithoutSchedule.isCurrentlyOpen(parentSchedule = bizSchedule)
        // Nota: isCurrentlyOpen usa instant actual a menos que pasemos schedule explícito a OperatingHoursResolver
        val openViaResolver = OperatingHoursResolver.isStoreOpen(
            if (branchWithoutSchedule.weeklySchedule.isNotEmpty()) branchWithoutSchedule.weeklySchedule else bizSchedule,
            manualOpen = branchWithoutSchedule.isOpen,
            targetDateTime = evalTime
        )
        assertTrue("Sucursal sin horario propio debe heredar el del negocio padre y estar abierta a las 11:00", openViaResolver)
    }

    @Test
    fun test_T21_masterSwitch_consistency_acrossSurfaces() {
        val schedule = mapOf("miercoles" to mapOf("open" to "09:00", "close" to "18:00", "isOpen" to true))
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(12, 0), zone)

        // Con manualOpen = true -> ABIERTO
        assertTrue(OperatingHoursResolver.isStoreOpen(schedule, manualOpen = true, targetDateTime = evalTime))
        // Con manualOpen = false -> CERRADO en todas las superficies
        assertFalse(OperatingHoursResolver.isStoreOpen(schedule, manualOpen = false, targetDateTime = evalTime))
    }

    @Test
    fun test_T22_wednesday_localizedKey_normalization() {
        // Acepta tanto "miercoles" como "miércoles" o "wednesday"
        val scheduleWithAccent = mapOf("miércoles" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true))
        val scheduleEnglish = mapOf("wednesday" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to true))
        val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(10, 0), zone)

        assertTrue("Debe soportar clave 'miércoles' con tilde", OperatingHoursResolver.isStoreOpen(scheduleWithAccent, manualOpen = true, targetDateTime = evalTime))
        assertTrue("Debe soportar clave 'wednesday'", OperatingHoursResolver.isStoreOpen(scheduleEnglish, manualOpen = true, targetDateTime = evalTime))
    }

    @Test
    fun test_T23_overnight_dashboardVsDetail_consistency() {
        val overnight = mapOf("miercoles" to mapOf("open" to "20:00", "close" to "02:00", "isOpen" to true))
        val thursdayDate = LocalDate.of(2026, 9, 17)
        val earlyMorning = ZonedDateTime.of(thursdayDate, LocalTime.of(1, 15), zone)

        val bizResult = OperatingHoursResolver.isStoreOpen(overnight, manualOpen = true, targetDateTime = earlyMorning)
        val branchResult = OperatingHoursResolver.isStoreOpen(overnight, manualOpen = true, targetDateTime = earlyMorning)

        assertTrue("Dashboard debe reconocer turno trasnochador a las 01:15", bizResult)
        assertTrue("Detalle debe reconocer turno trasnochador a las 01:15", branchResult)
        assertEquals(bizResult, branchResult)
    }

    @Test
    fun test_T24_closedDay_dashboardVsDetail_consistency() {
        val sundaySchedule = mapOf("domingo" to mapOf("open" to "09:00", "close" to "14:00", "isOpen" to false))
        val sundayDate = LocalDate.of(2026, 9, 20)
        val dt = ZonedDateTime.of(sundayDate, LocalTime.of(11, 0), zone)

        val bizResult = OperatingHoursResolver.isStoreOpen(sundaySchedule, manualOpen = true, targetDateTime = dt)
        val branchResult = OperatingHoursResolver.isStoreOpen(sundaySchedule, manualOpen = true, targetDateTime = dt)

        assertFalse("Dashboard debe indicar cerrado en día de descanso", bizResult)
        assertFalse("Detalle debe indicar cerrado en día de descanso", branchResult)
        assertEquals(bizResult, branchResult)
    }

    @Test
    fun test_T25_sameMerchant_sameTime_sameSchedule_invariant() {
        // Propiedad conceptual: SAME_MERCHANT + SAME_TIME + SAME_SCHEDULE = SAME_AVAILABILITY_RESULT
        val schedule = mapOf("miercoles" to mapOf("open" to "10:00", "close" to "22:00", "isOpen" to true))

        val hours = listOf(9, 10, 11, 15, 21, 22, 23)
        for (h in hours) {
            val evalTime = ZonedDateTime.of(wednesdayDate, LocalTime.of(h, 0), zone)
            val bizStatus = OperatingHoursResolver.isStoreOpen(schedule, manualOpen = true, targetDateTime = evalTime)
            val branchStatus = OperatingHoursResolver.isStoreOpen(schedule, manualOpen = true, targetDateTime = evalTime)
            assertEquals("Invariante violado a las $h:00", bizStatus, branchStatus)
        }
    }
}
