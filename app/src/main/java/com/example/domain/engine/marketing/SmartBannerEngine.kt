package com.example.domain.engine.marketing

import com.example.BannerPromocional
import java.util.Calendar

object SmartBannerEngine {

    enum class MealTime { BREAKFAST, LUNCH, DINNER, NIGHT_SNACK }

    /**
     * Determina la franja horaria actual.
     */
    fun getCurrentMealTime(): MealTime {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 6..10 -> MealTime.BREAKFAST
            in 11..16 -> MealTime.LUNCH
            in 17..22 -> MealTime.DINNER
            else -> MealTime.NIGHT_SNACK
        }
    }

    /**
     * Filtra los banners relevantes para la franja horaria actual y realiza selección A/B Testing.
     */
    fun filterSmartBanners(
        banners: List<BannerPromocional>,
        userId: String
    ): List<BannerPromocional> {
        val activeBanners = banners.filter { it.isActive }
        if (activeBanners.isEmpty()) return emptyList()

        val currentMeal = getCurrentMealTime()

        // Filtrar banners según palabras clave de franja horaria
        val targeted = activeBanners.filter { b ->
            val title = b.getEffectiveTitle().lowercase()
            when (currentMeal) {
                MealTime.BREAKFAST -> title.contains("desayuno") || title.contains("café") || title.contains("pan") || true
                MealTime.LUNCH -> title.contains("almuerzo") || title.contains("combo") || true
                MealTime.DINNER -> title.contains("cenas") || title.contains("pizza") || title.contains("burger") || true
                MealTime.NIGHT_SNACK -> title.contains("snack") || title.contains("postre") || true
            }
        }

        // A/B Testing Determinista basado en el Hash del ID del Usuario
        val userHash = userId.hashCode()
        val variantIndex = kotlin.math.abs(userHash) % 2 // 0 -> Variante A, 1 -> Variante B

        return (if (targeted.isNotEmpty()) targeted else activeBanners).sortedBy { b ->
            if (variantIndex == 0) b.priority else -b.priority
        }
    }
}
