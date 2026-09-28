package com.example.enterprise.communication.advanced

import com.example.enterprise.communication.CommunicationChannel

enum class NotificationCategory {
    ORDERS,
    PROMOTIONS,
    INVOICES,
    SECURITY,
    NEWS
}

data class CategoryChannelPreference(
    val category: NotificationCategory,
    val allowedChannels: Set<CommunicationChannel>
)

data class UserCommunicationPreferences(
    val userId: String,
    val categoryPreferences: Map<NotificationCategory, Set<CommunicationChannel>> = mapOf(
        NotificationCategory.ORDERS to setOf(CommunicationChannel.IN_APP, CommunicationChannel.PUSH, CommunicationChannel.WHATSAPP),
        NotificationCategory.PROMOTIONS to setOf(CommunicationChannel.EMAIL),
        NotificationCategory.INVOICES to setOf(CommunicationChannel.EMAIL, CommunicationChannel.PUSH),
        NotificationCategory.SECURITY to setOf(CommunicationChannel.SMS, CommunicationChannel.PUSH, CommunicationChannel.EMAIL),
        NotificationCategory.NEWS to setOf(CommunicationChannel.IN_APP)
    )
)

/**
 * Servidor Enterprise: UserPreferenceCenter.
 * Centro de preferencias de notificaciones multinivel por categoría y canal.
 */
class UserPreferenceCenter {

    private val userPreferencesMap = mutableMapOf<String, UserCommunicationPreferences>()

    fun setPreferences(preferences: UserCommunicationPreferences) {
        userPreferencesMap[preferences.userId] = preferences
    }

    fun isChannelAllowed(
        userId: String,
        category: NotificationCategory,
        channel: CommunicationChannel
    ): Boolean {
        val prefs = userPreferencesMap[userId] ?: UserCommunicationPreferences(userId = userId)
        val allowedSet = prefs.categoryPreferences[category] ?: return false
        return allowedSet.contains(channel)
    }

    fun getPreferences(userId: String): UserCommunicationPreferences {
        return userPreferencesMap[userId] ?: UserCommunicationPreferences(userId = userId)
    }
}
