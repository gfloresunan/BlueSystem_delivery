package com.example.eiam

import com.example.eiam.domain.model.AccountStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pruebas unitarias para normalización y deserialización de AccountStatus (EIAM v2.2)
 */
class AccountStatusTest {

    @Test
    fun testTC01_ActiveStatus() {
        val status = AccountStatus.fromString("ACTIVE")
        assertEquals(AccountStatus.ACTIVE, status)
        assertTrue(status.isOperational)
    }

    @Test
    fun testTC02_InactiveStatusFallback() {
        val status = AccountStatus.fromString("INACTIVE")
        assertEquals(AccountStatus.UNKNOWN, status)
        assertFalse(status.isOperational)
    }

    @Test
    fun testTC03_SuspendedStatus() {
        val status = AccountStatus.fromString("SUSPENDED")
        assertEquals(AccountStatus.SUSPENDED, status)
        assertFalse(status.isOperational)
    }

    @Test
    fun testTC04_OperationalStatus() {
        val status = AccountStatus.fromString("OPERATIONAL")
        assertEquals(AccountStatus.OPERATIONAL, status)
        assertTrue(status.isOperational)
    }

    @Test
    fun testTC05_NullValueFallback() {
        val status = AccountStatus.fromString(null)
        assertEquals(AccountStatus.ACTIVE, status)
        assertTrue(status.isOperational)
    }

    @Test
    fun testTC06_EmptyStringFallback() {
        val status = AccountStatus.fromString("")
        assertEquals(AccountStatus.ACTIVE, status)
        assertTrue(status.isOperational)
    }

    @Test
    fun testTC07_UnknownNewStatusSafeFallback() {
        val status = AccountStatus.fromString("WHATEVER_NEW_STATUS")
        assertEquals(AccountStatus.UNKNOWN, status)
        assertFalse(status.isOperational)
    }

    @Test
    fun testTC08_RealFirestoreValuesMapping() {
        // Real values observed in Firestore /branches collection
        val fritoniStatus = AccountStatus.fromString("OPERATIONAL")
        val elChanchitoStatus = AccountStatus.fromString(null) // undefined field in doc
        val tecnohomeStatus = AccountStatus.fromString("") // empty field in doc

        assertEquals(AccountStatus.OPERATIONAL, fritoniStatus)
        assertEquals(AccountStatus.ACTIVE, elChanchitoStatus)
        assertEquals(AccountStatus.ACTIVE, tecnohomeStatus)

        assertTrue(fritoniStatus.isOperational)
        assertTrue(elChanchitoStatus.isOperational)
        assertTrue(tecnohomeStatus.isOperational)
    }
}
