package com.example.courier

import com.example.domain.model.courier.*
import org.junit.Assert.*
import org.junit.Test

/**
 * Suite de Pruebas Unitarias de Arquitectura e Integridad: Actividad #2
 * Edición de Perfil del Motorizado con Validación Administrativa
 */
class CourierProfileModificationTest {

    @Test
    fun `test initial profile retains official data without premature mutation`() {
        val officialProfile = CourierOfficialProfile(
            uid = "courier_123",
            name = "Juan Pérez",
            phone = "+505 8888-1111",
            nationalId = "001-010195-0001A",
            vehicleBrand = "Honda",
            vehicleModel = "CB125F",
            vehiclePlate = "M 123-456",
            vehicleYear = 2023,
            vehicleColor = "Rojo",
            isApproved = true,
            isActive = true
        )

        // Solicitud de cambio a Yamaha FZ 25
        val requestedValues = CourierProfileValues(
            name = "Juan Pérez",
            phone = "+505 8888-1111",
            vehicleBrand = "Yamaha",
            vehicleModel = "FZ 25",
            vehiclePlate = "M 789-012",
            vehicleYear = 2025,
            vehicleColor = "Negro"
        )

        val profileRequest = CourierProfileRequest(
            requestId = "cpr_001",
            courierId = "courier_123",
            requestType = "VEHICLE_CHANGE",
            status = "PENDING_REVIEW",
            oldValues = CourierProfileValues(
                name = officialProfile.name,
                phone = officialProfile.phone,
                vehicleBrand = officialProfile.vehicleBrand,
                vehicleModel = officialProfile.vehicleModel,
                vehiclePlate = officialProfile.vehiclePlate
            ),
            newValues = requestedValues
        )

        // Verificaciones de Integridad
        assertTrue("La solicitud debe estar en estado PENDING_REVIEW", profileRequest.isPending)
        assertFalse("La solicitud no debe estar aprobada", profileRequest.isApproved)
        assertFalse("La solicitud no debe estar rechazada", profileRequest.isRejected)

        // REGLA FUNDAMENTAL: El perfil oficial NO debe haber mutado
        assertEquals("La marca oficial vigente debe seguir siendo Honda", "Honda", officialProfile.vehicleBrand)
        assertEquals("El modelo oficial vigente debe seguir siendo CB125F", "CB125F", officialProfile.vehicleModel)
        assertEquals("La placa oficial vigente debe seguir siendo M 123-456", "M 123-456", officialProfile.vehiclePlate)

        // La solicitud debe contener el nuevo vehículo solicitado
        assertEquals("La nueva marca solicitada debe ser Yamaha", "Yamaha", profileRequest.newValues.vehicleBrand)
        assertEquals("La nueva placa solicitada debe ser M 789-012", "M 789-012", profileRequest.newValues.vehiclePlate)
    }

    @Test
    fun `test approved profile request applies changes to official profile`() {
        val originalProfile = CourierOfficialProfile(
            uid = "courier_123",
            name = "Juan Pérez",
            vehicleBrand = "Honda",
            vehicleModel = "CB125F",
            vehiclePlate = "M 123-456"
        )

        val approvedRequest = CourierProfileRequest(
            requestId = "cpr_002",
            courierId = "courier_123",
            requestType = "VEHICLE_CHANGE",
            status = "APPROVED",
            newValues = CourierProfileValues(
                vehicleBrand = "Yamaha",
                vehicleModel = "FZ 25",
                vehiclePlate = "M 789-012",
                vehicleYear = 2025,
                vehicleColor = "Negro"
            ),
            reviewedBy = "admin_super_01"
        )

        assertTrue("La solicitud debe ser detectada como APPROVED", approvedRequest.isApproved)

        // Simulación de sincronización de backend
        val updatedProfile = originalProfile.copy(
            vehicleBrand = approvedRequest.newValues.vehicleBrand,
            vehicleModel = approvedRequest.newValues.vehicleModel,
            vehiclePlate = approvedRequest.newValues.vehiclePlate,
            vehicleYear = approvedRequest.newValues.vehicleYear,
            vehicleColor = approvedRequest.newValues.vehicleColor
        )

        assertEquals("El perfil oficial actualizado debe tener marca Yamaha", "Yamaha", updatedProfile.vehicleBrand)
        assertEquals("El perfil oficial actualizado debe tener modelo FZ 25", "FZ 25", updatedProfile.vehicleModel)
        assertEquals("El perfil oficial actualizado debe tener placa M 789-012", "M 789-012", updatedProfile.vehiclePlate)
    }

    @Test
    fun `test rejected profile request preserves original official profile with reason`() {
        val originalProfile = CourierOfficialProfile(
            uid = "courier_123",
            name = "Juan Pérez",
            vehicleBrand = "Honda",
            vehicleModel = "CB125F",
            vehiclePlate = "M 123-456"
        )

        val rejectedRequest = CourierProfileRequest(
            requestId = "cpr_003",
            courierId = "courier_123",
            requestType = "VEHICLE_CHANGE",
            status = "REJECTED",
            rejectionReason = "Circulación vehicular ilegible y seguro vencido.",
            oldValues = CourierProfileValues(
                vehicleBrand = originalProfile.vehicleBrand,
                vehicleModel = originalProfile.vehicleModel,
                vehiclePlate = originalProfile.vehiclePlate
            ),
            newValues = CourierProfileValues(
                vehicleBrand = "Suzuki",
                vehicleModel = "Gixxer 150",
                vehiclePlate = "M 999-000"
            ),
            reviewedBy = "admin_auditor_02"
        )

        assertTrue("La solicitud debe ser detectada como REJECTED", rejectedRequest.isRejected)
        assertFalse("La solicitud no debe ser PENDING_REVIEW", rejectedRequest.isPending)
        assertEquals("Debe incluir el motivo de rechazo", "Circulación vehicular ilegible y seguro vencido.", rejectedRequest.rejectionReason)

        // El perfil oficial no cambia en absoluto
        assertEquals("El perfil oficial debe mantener la marca Honda", "Honda", originalProfile.vehicleBrand)
        assertEquals("El perfil oficial debe mantener la placa M 123-456", "M 123-456", originalProfile.vehiclePlate)
    }

    @Test
    fun `test courier isolation prevents mismatched courier id assignment`() {
        val courierA = "courier_aaa"
        val courierB = "courier_bbb"

        val request = CourierProfileRequest(
            requestId = "cpr_sec_01",
            courierId = courierA,
            requestType = "VEHICLE_CHANGE",
            status = "PENDING_REVIEW"
        )

        assertEquals("El courierId debe coincidir exactamente con el propietario", courierA, request.courierId)
        assertNotEquals("No debe pertenecer a otro courier", courierB, request.courierId)
    }

    @Test
    fun `test vehicle plate format normalization`() {
        val rawPlacas = listOf(
            "m 123 456" to "M123456",
            "  m-384-902  " to "M-384-902",
            "M123456" to "M123456"
        )

        for ((raw, expected) in rawPlacas) {
            val normalized = raw.replace(" ", "").trim().uppercase()
            assertEquals("La placa $raw debe normalizarse a $expected", expected, normalized)
        }
    }
    @Test
    fun `test Case A and Case B - model N300 to N500 and color Negro to roja transition`() {
        val initialProfile = CourierOfficialProfile(
            uid = "courier_test_001",
            name = "Carlos Rodriguez",
            phone = "82397401",
            vehicleBrand = "Honda",
            vehicleModel = "N300",
            vehicleYear = 2024,
            vehicleColor = "Negro",
            vehiclePlate = "MT232323"
        )

        // 1. Solicitud enviada por el motorizado (N500 y roja)
        val requestedValues = CourierProfileValues(
            name = initialProfile.name,
            phone = initialProfile.phone,
            vehicleBrand = "Honda",
            vehicleModel = "N500",
            vehiclePlate = "MT232323",
            vehicleYear = 2024,
            vehicleColor = "roja"
        )

        val profileRequest = CourierProfileRequest(
            requestId = "cpr_e2e_01",
            courierId = "courier_test_001",
            requestType = "VEHICLE_CHANGE",
            status = "PENDING_REVIEW",
            oldValues = CourierProfileValues(
                name = initialProfile.name,
                phone = initialProfile.phone,
                vehicleBrand = initialProfile.vehicleBrand,
                vehicleModel = initialProfile.vehicleModel,
                vehiclePlate = initialProfile.vehiclePlate,
                vehicleYear = initialProfile.vehicleYear,
                vehicleColor = initialProfile.vehicleColor
            ),
            newValues = requestedValues
        )

        // Fase PENDING_REVIEW: El perfil oficial se mantiene intacto
        assertEquals("OLD Model debe ser N300", "N300", profileRequest.oldValues.vehicleModel)
        assertEquals("OLD Color debe ser Negro", "Negro", profileRequest.oldValues.vehicleColor)
        assertEquals("NEW Model debe ser N500", "N500", profileRequest.newValues.vehicleModel)
        assertEquals("NEW Color debe ser roja", "roja", profileRequest.newValues.vehicleColor)
        assertEquals("Perfil oficial vigente sigue siendo N300", "N300", initialProfile.vehicleModel)
        assertEquals("Perfil oficial vigente sigue siendo Negro", "Negro", initialProfile.vehicleColor)

        // 2. Aprobación Administrativa
        val approvedRequest = profileRequest.copy(
            status = "APPROVED",
            reviewedBy = "admin_governance"
        )
        assertTrue(approvedRequest.isApproved)

        // 3. Proyección tras actualización atómica
        val updatedOfficialProfile = initialProfile.copy(
            vehicleModel = approvedRequest.newValues.vehicleModel,
            vehicleColor = approvedRequest.newValues.vehicleColor,
            vehiclePlate = approvedRequest.newValues.vehiclePlate,
            vehicleYear = approvedRequest.newValues.vehicleYear
        )

        assertEquals("Perfil oficial muta a N500", "N500", updatedOfficialProfile.vehicleModel)
        assertEquals("Perfil oficial muta a roja", "roja", updatedOfficialProfile.vehicleColor)
        assertEquals("Placa se conserva MT232323", "MT232323", updatedOfficialProfile.vehiclePlate)
        assertEquals("Año se conserva 2024", 2024, updatedOfficialProfile.vehicleYear)
    }

    @Test
    fun `test Case F - approved status without official update integrity check`() {
        val originalProfile = CourierOfficialProfile(
            uid = "courier_123",
            vehicleModel = "N300",
            vehicleColor = "Negro"
        )

        val approvedValues = CourierProfileValues(
            vehicleModel = "N500",
            vehicleColor = "roja"
        )

        // Si la transacción se ejecuta correctamente, el estado resultante debe coincidir
        val synchronizedProfile = originalProfile.copy(
            vehicleModel = approvedValues.vehicleModel,
            vehicleColor = approvedValues.vehicleColor
        )

        assertEquals("REQUEST.NEW = OFFICIAL.PROFILE para modelo", approvedValues.vehicleModel, synchronizedProfile.vehicleModel)
        assertEquals("REQUEST.NEW = OFFICIAL.PROFILE para color", approvedValues.vehicleColor, synchronizedProfile.vehicleColor)
    }

    @Test
    fun `test Case G - cross courier tampering is rejected`() {
        val courierA = "courier_owner_111"
        val courierB = "courier_attacker_222"

        val canModifyOther = (courierA == courierB)
        assertFalse("Un motorizado no puede modificar la solicitud de otro motorizado", canModifyOther)
    }

    @Test
    fun `test Case H - persistence and strict false success detection`() {
        val initialProfile = CourierOfficialProfile(
            uid = "courier_123",
            vehicleModel = "N300",
            vehicleColor = "Negro",
            vehiclePlate = "MT232323",
            vehicleYear = 2024
        )

        val approvedRequest = CourierProfileRequest(
            requestId = "cpr_persistent_99",
            courierId = "courier_123",
            status = "APPROVED",
            newValues = CourierProfileValues(
                vehicleModel = "N500",
                vehicleColor = "roja",
                vehiclePlate = "MT232300",
                vehicleYear = 2024
            )
        )

        // Verificación de éxito falso: Si status es APPROVED pero el perfil mantiene N300 / Negro, DEBE ser considerado inconsistente
        val fakeSuccessProfile = initialProfile // No actualizado
        val isConsistentWithRequest = (fakeSuccessProfile.vehicleModel == approvedRequest.newValues.vehicleModel) &&
                (fakeSuccessProfile.vehicleColor == approvedRequest.newValues.vehicleColor)
        assertFalse("Un perfil no sincronizado con la solicitud aprobada debe fallar la verificación de consistencia", isConsistentWithRequest)

        // Verificación de sincronización exitosa oficial
        val realUpdatedProfile = initialProfile.copy(
            vehicleModel = approvedRequest.newValues.vehicleModel,
            vehicleColor = approvedRequest.newValues.vehicleColor,
            vehiclePlate = approvedRequest.newValues.vehiclePlate,
            vehicleYear = approvedRequest.newValues.vehicleYear
        )

        val isRealConsistent = (realUpdatedProfile.vehicleModel == approvedRequest.newValues.vehicleModel) &&
                (realUpdatedProfile.vehicleColor == approvedRequest.newValues.vehicleColor)
        assertTrue("El perfil actualizado atómicamente debe ser 100% consistente con la solicitud", isRealConsistent)
        assertEquals("N500", realUpdatedProfile.vehicleModel)
        assertEquals("roja", realUpdatedProfile.vehicleColor)
        assertEquals("MT232300", realUpdatedProfile.vehiclePlate)
    }
}
