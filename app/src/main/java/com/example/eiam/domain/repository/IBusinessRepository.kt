package com.example.eiam.domain.repository

import com.example.eiam.domain.model.Business

/**
 * EIAM — Interface IBusinessRepository (FASE 6)
 */
interface IBusinessRepository {
    suspend fun getBusinessById(businessId: String): Business?
    suspend fun saveBusiness(business: Business): Boolean
    suspend fun updateBusinessStatus(businessId: String, status: String): Boolean
}
