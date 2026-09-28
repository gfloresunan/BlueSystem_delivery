package com.example.eiam.domain.repository

import com.example.eiam.domain.model.UserSession

/**
 * EIAM — Interface ISessionRepository (FASE 8)
 */
interface ISessionRepository {
    suspend fun getSessionById(sessionId: String): UserSession?
    suspend fun getActiveSessionsByUid(uid: String): List<UserSession>
    suspend fun saveSession(session: UserSession): Boolean
    suspend fun revokeSession(sessionId: String): Boolean
    suspend fun revokeAllSessions(uid: String): Boolean
}
