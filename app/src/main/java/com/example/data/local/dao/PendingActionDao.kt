package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.PendingActionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingActionDao {
    @Query("SELECT * FROM pending_actions WHERE status = 'PENDING' ORDER BY createdAt ASC")
    fun getPendingActions(): Flow<List<PendingActionEntity>>
    
    @Query("SELECT * FROM pending_actions WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun getPendingActionsSync(): List<PendingActionEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(action: PendingActionEntity)
    
    @Update
    suspend fun update(action: PendingActionEntity)
    
    @Delete
    suspend fun delete(action: PendingActionEntity)
    
    @Query("DELETE FROM pending_actions WHERE status = 'COMPLETED'")
    suspend fun deleteCompleted()
    
    @Query("SELECT COUNT(*) FROM pending_actions WHERE status = 'PENDING'")
    fun getPendingCount(): Flow<Int>
}
