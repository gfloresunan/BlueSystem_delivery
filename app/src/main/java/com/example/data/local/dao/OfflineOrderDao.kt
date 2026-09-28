package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.OfflineOrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OfflineOrderDao {
    @Query("SELECT * FROM offline_orders WHERE assignedCourierId = :courierId AND status IN ('ready', 'in_transit')")
    fun getActiveOrdersForCourier(courierId: String): Flow<List<OfflineOrderEntity>>
    
    @Query("SELECT * FROM offline_orders WHERE orderId = :orderId")
    suspend fun getOrderById(orderId: String): OfflineOrderEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(order: OfflineOrderEntity)
    
    @Update
    suspend fun update(order: OfflineOrderEntity)
    
    @Delete
    suspend fun delete(order: OfflineOrderEntity)
    
    @Query("UPDATE offline_orders SET status = :status, courierPhase = :phase, updatedAt = :updatedAt WHERE orderId = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: String, phase: Int?, updatedAt: Long)
}
