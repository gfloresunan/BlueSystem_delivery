package com.example

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "offline_locations")
data class OfflineLocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val motorizadoId: String,
    val latitud: Double,
    val longitud: Double,
    val timestamp: Long
)

@Dao
interface OfflineLocationDao {
    @Insert
    suspend fun insertLocation(location: OfflineLocationEntity)

    @Query("SELECT * FROM offline_locations ORDER BY timestamp ASC")
    suspend fun getAllPendingLocations(): List<OfflineLocationEntity>

    @Query("DELETE FROM offline_locations WHERE id IN (:ids)")
    suspend fun deleteLocations(ids: List<Long>)

    @Query("SELECT COUNT(*) FROM offline_locations")
    suspend fun getPendingCount(): Int
}

@Database(entities = [OfflineLocationEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun offlineLocationDao(): OfflineLocationDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "delivery_tracking_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
