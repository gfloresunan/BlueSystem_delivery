package com.example.presentation.customer.profile

import com.google.firebase.Timestamp

data class SupportTicket(
    val id: String = "",
    val ticketId: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val customerEmail: String = "",
    val subject: String = "",
    val status: String = "OPEN", // OPEN, IN_PROGRESS, WAITING_CUSTOMER, WAITING_ADMIN, RESOLVED, CLOSED
    val lastMessage: String = "",
    val lastMessageSender: String = "CUSTOMER",
    val lastMessageAt: Timestamp? = null,
    val unreadByCustomer: Int = 0,
    val unreadByAdmin: Int = 0,
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class SupportTicketMessage(
    val id: String = "",
    val ticketId: String = "",
    val senderId: String = "",
    val senderRole: String = "CUSTOMER", // CUSTOMER, ADMIN
    val senderName: String = "",
    val text: String = "",
    val isRead: Boolean = false,
    val createdAt: Timestamp? = null
)

data class DirectSupportConfig(
    val whatsappActive: Boolean = true,
    val whatsappNumber: String = "+505 8888-0000",
    val whatsappText: String = "WhatsApp Soporte",
    val emailActive: Boolean = true,
    val supportEmail: String = "soporte@bluesystemdelivery.com",
    val emailText: String = "Correo Electrónico",
    val scheduleDays: String = "Lun-Dom",
    val scheduleHours: String = "8:00am a 8:00pm",
    val availabilityMessage: String = "Respondemos usualmente en menos de 15 minutos durante horario hábil."
)
