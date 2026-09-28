package com.example.domain.model.identity

import com.example.eiam.domain.model.Membership as LegacyMembership

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.3)
 * Dual-Read Membership Resolver en Kotlin (Read-Only / Zero Mutation).
 */

enum class DualReadStatus {
    RESOLVED_V3,
    RESOLVED_LEGACY,
    MIGRATION_PENDING,
    AMBIGUOUS,
    NOT_FOUND,
    INVALID,
    SECURITY_MISMATCH,
    NEVER_RESOLVE
}

data class DualReadConflict(
    val membershipId: String,
    val uid: String,
    val discrepantFields: List<String>
)

data class DualReadResult(
    val status: DualReadStatus,
    val membership: MembershipV3? = null,
    val source: String = "NONE", // "V3", "LEGACY", "NONE"
    val conflict: DualReadConflict? = null,
    val errorDetail: String? = null,
    val readCount: Int = 0,
    val writeCount: Int = 0 // Invariante: Siempre 0
)

/**
 * Fuente de datos desacoplada para lecturas Dual-Read
 */
interface MembershipDataSource {
    suspend fun getV3MembershipById(membershipId: String): MembershipV3?
    suspend fun getV3MembershipsByUid(uid: String): List<MembershipV3>
    suspend fun getLegacyMembershipById(membershipId: String): LegacyMembership?
    suspend fun getLegacyMembershipsByUid(uid: String): List<LegacyMembership>
    suspend fun resolveTenantContextForBusiness(businessId: String): ResolvedTenantContext?
}

/**
 * Implementación en Memoria para Pruebas Aisladas
 */
class InMemoryMembershipDataSource : MembershipDataSource {
    private val v3Map = mutableMapOf<String, MembershipV3>()
    private val legacyMap = mutableMapOf<String, LegacyMembership>()
    private val tenantMap = mutableMapOf<String, ResolvedTenantContext>()

    var readCount: Int = 0
        private set
    var writeCount: Int = 0
        private set

    override suspend fun getV3MembershipById(membershipId: String): MembershipV3? {
        readCount++
        return v3Map[membershipId]
    }

    override suspend fun getV3MembershipsByUid(uid: String): List<MembershipV3> {
        readCount++
        return v3Map.values.filter { it.uid == uid }
    }

    override suspend fun getLegacyMembershipById(membershipId: String): LegacyMembership? {
        readCount++
        return legacyMap[membershipId]
    }

    override suspend fun getLegacyMembershipsByUid(uid: String): List<LegacyMembership> {
        readCount++
        return legacyMap.values.filter { it.uid == uid }
    }

    override suspend fun resolveTenantContextForBusiness(businessId: String): ResolvedTenantContext? {
        readCount++
        return tenantMap[businessId]
    }

    fun seedV3(membership: MembershipV3) {
        v3Map[membership.membershipId] = membership
    }

    fun seedLegacy(legacy: LegacyMembership) {
        val id = if (legacy.membershipId.isNotBlank()) legacy.membershipId else "mem_leg_${legacy.uid}_${legacy.businessId}"
        legacyMap[id] = legacy
    }

    fun seedBusinessTenant(businessId: String, context: ResolvedTenantContext) {
        tenantMap[businessId] = context
    }
}

/**
 * Motor Dual-Read Membership Resolver
 */
class DualReadMembershipResolver(private val dataSource: MembershipDataSource) {

    suspend fun resolveByMembershipId(requestedUid: String, membershipId: String): DualReadResult {
        var reads = 0

        // 1. Consultar V3
        val v3Doc = dataSource.getV3MembershipById(membershipId)
        reads++

        if (v3Doc != null) {
            // Anti-Spoofing
            if (v3Doc.uid != requestedUid) {
                return DualReadResult(
                    status = DualReadStatus.SECURITY_MISMATCH,
                    source = "NONE",
                    errorDetail = "Violación de Seguridad: La membresía no pertenece al UID solicitado.",
                    readCount = reads,
                    writeCount = 0
                )
            }

            // Validar V3
            val valResult = MembershipV3Validators.validateMembershipV3(v3Doc)
            if (!valResult.isValid) {
                return DualReadResult(
                    status = DualReadStatus.INVALID,
                    source = "V3",
                    errorDetail = valResult.errors.joinToString("; "),
                    readCount = reads,
                    writeCount = 0
                )
            }

            // Verificar si existe Legacy y comparar
            val legDoc = dataSource.getLegacyMembershipById(membershipId)
            reads++
            if (legDoc != null && legDoc.uid == requestedUid) {
                val discrepancies = mutableListOf<String>()
                if (v3Doc.role != legDoc.role) {
                    discrepancies.add("role (${v3Doc.role} vs ${legDoc.role})")
                }
                if (discrepancies.isNotEmpty()) {
                    return DualReadResult(
                        status = DualReadStatus.AMBIGUOUS,
                        source = "NONE",
                        conflict = DualReadConflict(membershipId, requestedUid, discrepancies),
                        errorDetail = "Discrepancia entre V3 y Legacy detectada.",
                        readCount = reads,
                        writeCount = 0
                    )
                }
            }

            return DualReadResult(
                status = DualReadStatus.RESOLVED_V3,
                membership = v3Doc,
                source = "V3",
                readCount = reads,
                writeCount = 0
            )
        }

        // 2. Si no existe V3, consultar Legacy
        val legDoc = dataSource.getLegacyMembershipById(membershipId)
        reads++

        if (legDoc != null) {
            // Anti-Spoofing
            if (legDoc.uid != requestedUid) {
                return DualReadResult(
                    status = DualReadStatus.SECURITY_MISMATCH,
                    source = "NONE",
                    errorDetail = "Violación de Seguridad: La membresía legacy no pertenece al UID.",
                    readCount = reads,
                    writeCount = 0
                )
            }

            val tenantContext = dataSource.resolveTenantContextForBusiness(legDoc.businessId)
            reads++

            // Bloquear tenant default ficticio
            if (tenantContext?.tenantId?.contains("default", ignoreCase = true) == true) {
                return DualReadResult(
                    status = DualReadStatus.NEVER_RESOLVE,
                    source = "NONE",
                    errorDetail = "Violación de Gobernanza: Intento de resolución a tenant default ficticio bloqueado.",
                    readCount = reads,
                    writeCount = 0
                )
            }

            val adapted = LegacyMembershipAdapter.transformLegacyToV3(legDoc, tenantContext)
            return when (adapted.status) {
                ResolutionStatus.RESOLVED -> DualReadResult(
                    status = DualReadStatus.RESOLVED_LEGACY,
                    membership = adapted.entity,
                    source = "LEGACY",
                    readCount = reads,
                    writeCount = 0
                )
                ResolutionStatus.AMBIGUOUS -> DualReadResult(
                    status = DualReadStatus.AMBIGUOUS,
                    source = "LEGACY",
                    errorDetail = adapted.errorDetail,
                    readCount = reads,
                    writeCount = 0
                )
                else -> DualReadResult(
                    status = DualReadStatus.MIGRATION_PENDING,
                    source = "LEGACY",
                    errorDetail = adapted.errorDetail,
                    readCount = reads,
                    writeCount = 0
                )
            }
        }

        // 3. Ninguna existe
        return DualReadResult(
            status = DualReadStatus.NOT_FOUND,
            source = "NONE",
            readCount = reads,
            writeCount = 0
        )
    }

    suspend fun resolveActiveMembership(requestedUid: String): DualReadResult {
        val v3List = dataSource.getV3MembershipsByUid(requestedUid)
        val activeV3 = v3List.find { it.status == MembershipV3Status.ACTIVE }
        if (activeV3 != null) {
            return resolveByMembershipId(requestedUid, activeV3.membershipId)
        }

        val legList = dataSource.getLegacyMembershipsByUid(requestedUid)
        if (legList.isNotEmpty()) {
            val first = legList.first()
            val id = if (first.membershipId.isNotBlank()) first.membershipId else "mem_leg_${first.uid}_${first.businessId}"
            return resolveByMembershipId(requestedUid, id)
        }

        return DualReadResult(
            status = DualReadStatus.NOT_FOUND,
            source = "NONE",
            readCount = 2,
            writeCount = 0
        )
    }
}
