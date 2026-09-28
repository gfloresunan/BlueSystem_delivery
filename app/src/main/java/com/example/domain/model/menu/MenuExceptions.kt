package com.example.domain.model.menu

/**
 * Excepción Base de Dominio del Menu Engine v2.2.
 */
abstract class MenuDomainException(
    val errorCode: String,
    message: String
) : Exception(message)

/**
 * Excepción de Conflicto de Concurrencia (Optimistic Locking - ADR-002).
 */
class MenuConflictException(
    val restaurantId: String,
    val localVersion: Long,
    val serverVersion: Long,
    errorCode: String = "MENU_CONFLICT_001",
    message: String = "Conflicto de concurrencia [$errorCode]: La versión local ($localVersion) es inferior a la versión del servidor ($serverVersion). Realice un Pull para actualizar."
) : MenuDomainException(errorCode, message)

/**
 * Excepción de Límite de Batch en Firestore.
 */
class FirestoreBatchLimitExceededException(
    val operationCount: Int,
    errorCode: String = "BATCH_LIMIT_001",
    message: String = "Límite de operaciones excedido [$errorCode]: La publicación contiene $operationCount operaciones, superando el límite máximo de 500 por batch."
) : MenuDomainException(errorCode, message)

/**
 * Excepción de Validación de Estructura de Menú.
 */
class MenuValidationException(
    val errors: List<String>,
    errorCode: String = "MENU_VALIDATION_001",
    message: String = "Falló la validación del menú [$errorCode]: ${errors.joinToString(", ")}"
) : MenuDomainException(errorCode, message)
