/// BLUE SYSTEM DELIVERY ENTERPRISE — ADMIN FIRESTORE SERVICE v2.2
/// Canonical Data Service for Mobile Admin Console (iOS/Multiplatform Track B).
/// Consumes official Firestore collections with Zero Mock and strict EIAM audit traceability.

import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

// ─── DATA MODELS ─────────────────────────────────────────────────────────────

class MerchantApplicationModel {
  final String id;
  final String businessName;
  final String contactName;
  final String email;
  final String phone;
  final String category;
  final String address;
  final String status; // PENDING, APPROVED, REJECTED
  final String rejectionReason;
  final DateTime createdAt;

  MerchantApplicationModel({
    required this.id,
    required this.businessName,
    required this.contactName,
    required this.email,
    required this.phone,
    required this.category,
    required this.address,
    required this.status,
    required this.rejectionReason,
    required this.createdAt,
  });

  factory MerchantApplicationModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['createdAt'] as Timestamp?;
    return MerchantApplicationModel(
      id: doc.id,
      businessName: d['businessName'] ?? d['nombreComercio'] ?? d['comercio'] ?? 'Sin Nombre',
      contactName: d['contactName'] ?? d['nombreContacto'] ?? d['representante'] ?? '',
      email: d['email'] ?? d['correo'] ?? '',
      phone: d['phone'] ?? d['telefono'] ?? d['celular'] ?? '',
      category: d['category'] ?? d['categoria'] ?? 'General',
      address: d['address'] ?? d['direccion'] ?? '',
      status: (d['status'] ?? d['estado'] ?? 'PENDING').toString().toUpperCase(),
      rejectionReason: d['rejectionReason'] ?? d['motivoRechazo'] ?? '',
      createdAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class CourierApplicationModel {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String vehicleType; // MOTO, BICI, AUTO
  final String licensePlate;
  final String status; // PENDING, APPROVED, REJECTED
  final String rejectionReason;
  final DateTime createdAt;

  CourierApplicationModel({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.vehicleType,
    required this.licensePlate,
    required this.status,
    required this.rejectionReason,
    required this.createdAt,
  });

  factory CourierApplicationModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['createdAt'] as Timestamp?;
    return CourierApplicationModel(
      id: doc.id,
      fullName: d['fullName'] ?? d['nombre'] ?? d['name'] ?? 'Sin Nombre',
      email: d['email'] ?? '',
      phone: d['phone'] ?? d['telefono'] ?? '',
      vehicleType: d['vehicleType'] ?? d['tipoVehiculo'] ?? 'MOTO',
      licensePlate: d['licensePlate'] ?? d['placa'] ?? '',
      status: (d['status'] ?? d['estado'] ?? 'PENDING').toString().toUpperCase(),
      rejectionReason: d['rejectionReason'] ?? d['motivoRechazo'] ?? '',
      createdAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class CourierProfileRequestModel {
  final String id;
  final String courierId;
  final String courierName;
  final String requestType; // VEHICLE_CHANGE, PHONE_UPDATE, DOCUMENT_RENEWAL
  final String description;
  final String status; // PENDING, APPROVED, REJECTED
  final String reviewNote;
  final DateTime createdAt;

  CourierProfileRequestModel({
    required this.id,
    required this.courierId,
    required this.courierName,
    required this.requestType,
    required this.description,
    required this.status,
    required this.reviewNote,
    required this.createdAt,
  });

  factory CourierProfileRequestModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['createdAt'] as Timestamp?;
    return CourierProfileRequestModel(
      id: doc.id,
      courierId: d['courierId'] ?? d['motorizadoId'] ?? '',
      courierName: d['courierName'] ?? d['nombre'] ?? 'Motorizado',
      requestType: d['requestType'] ?? d['tipo'] ?? 'GENERAL',
      description: d['description'] ?? d['descripcion'] ?? '',
      status: (d['status'] ?? d['estado'] ?? 'PENDING').toString().toUpperCase(),
      reviewNote: d['reviewNote'] ?? d['nota'] ?? '',
      createdAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class AdminUserModel {
  final String uid;
  final String name;
  final String email;
  final String phone;
  final String role; // CLIENT, DRIVER, OWNER, ADMIN, SUPER_ADMIN
  final String eiamRole;
  final bool active;
  final DateTime createdAt;

  AdminUserModel({
    required this.uid,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.eiamRole,
    required this.active,
    required this.createdAt,
  });

  factory AdminUserModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['createdAt'] as Timestamp?;
    return AdminUserModel(
      uid: doc.id,
      name: d['nombre'] ?? d['name'] ?? d['displayName'] ?? 'Usuario',
      email: d['email'] ?? '',
      phone: d['telefono'] ?? d['phone'] ?? '',
      role: (d['role'] ?? d['rol'] ?? d['userType'] ?? 'CLIENT').toString().toUpperCase(),
      eiamRole: (d['eiamRole'] ?? '').toString().toUpperCase(),
      active: d['active'] ?? true,
      createdAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class SupportTicketModel {
  final String id;
  final String userId;
  final String userName;
  final String userRole;
  final String subject;
  final String lastMessage;
  final String status; // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  final String priority; // LOW, MEDIUM, HIGH, URGENT
  final DateTime updatedAt;

  SupportTicketModel({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userRole,
    required this.subject,
    required this.lastMessage,
    required this.status,
    required this.priority,
    required this.updatedAt,
  });

  factory SupportTicketModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = (d['updatedAt'] ?? d['createdAt']) as Timestamp?;
    return SupportTicketModel(
      id: doc.id,
      userId: d['userId'] ?? d['clienteId'] ?? '',
      userName: d['userName'] ?? d['nombre'] ?? 'Usuario',
      userRole: d['userRole'] ?? d['rol'] ?? 'CLIENT',
      subject: d['subject'] ?? d['asunto'] ?? 'Consulta de Soporte',
      lastMessage: d['lastMessage'] ?? d['ultimoMensaje'] ?? '',
      status: (d['status'] ?? d['estado'] ?? 'OPEN').toString().toUpperCase(),
      priority: (d['priority'] ?? d['prioridad'] ?? 'MEDIUM').toString().toUpperCase(),
      updatedAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class SupportMessageModel {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final bool isAdmin;
  final DateTime timestamp;

  SupportMessageModel({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.isAdmin,
    required this.timestamp,
  });

  factory SupportMessageModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['timestamp'] as Timestamp?;
    return SupportMessageModel(
      id: doc.id,
      senderId: d['senderId'] ?? '',
      senderName: d['senderName'] ?? '',
      text: d['text'] ?? d['mensaje'] ?? '',
      isAdmin: d['isAdmin'] ?? false,
      timestamp: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class CourierDailyClosureModel {
  final String id;
  final String courierId;
  final String courierName;
  final String actNumber;
  final int totalOrders;
  final double collectedCash;
  final double appCommission;
  final double courierEarnings;
  final double depositedAmount;
  final String bankReference;
  final String depositReceiptUrl;
  final String status; // PENDING_REVIEW, APPROVED, REJECTED
  final DateTime closureDate;

  CourierDailyClosureModel({
    required this.id,
    required this.courierId,
    required this.courierName,
    required this.actNumber,
    required this.totalOrders,
    required this.collectedCash,
    required this.appCommission,
    required this.courierEarnings,
    required this.depositedAmount,
    required this.bankReference,
    required this.depositReceiptUrl,
    required this.status,
    required this.closureDate,
  });

  factory CourierDailyClosureModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = (d['closureDate'] ?? d['createdAt']) as Timestamp?;
    return CourierDailyClosureModel(
      id: doc.id,
      courierId: d['courierId'] ?? '',
      courierName: d['courierName'] ?? d['nombreMotorizado'] ?? 'Motorizado',
      actNumber: d['actNumber'] ?? doc.id,
      totalOrders: (d['totalOrders'] ?? 0) as int,
      collectedCash: (d['collectedCash'] ?? d['totalEfectivoRecaudado'] ?? 0.0).toDouble(),
      appCommission: (d['appCommission'] ?? d['comisionApp'] ?? 0.0).toDouble(),
      courierEarnings: (d['courierEarnings'] ?? d['gananciasMotorizado'] ?? 0.0).toDouble(),
      depositedAmount: (d['depositedAmount'] ?? d['montoDepositado'] ?? 0.0).toDouble(),
      bankReference: d['bankReference'] ?? d['referenciaBancaria'] ?? '',
      depositReceiptUrl: d['depositReceiptUrl'] ?? d['comprobanteUrl'] ?? '',
      status: (d['status'] ?? d['estado'] ?? 'PENDING_REVIEW').toString().toUpperCase(),
      closureDate: ts?.toDate() ?? DateTime.now(),
    );
  }
}

class ActiveCourierGpsModel {
  final String id;
  final String courierId;
  final String name;
  final double latitude;
  final double longitude;
  final String availabilityStatus; // disponible, ocupado, inactivo
  final String phone;
  final DateTime lastUpdate;

  ActiveCourierGpsModel({
    required this.id,
    required this.courierId,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.availabilityStatus,
    required this.phone,
    required this.lastUpdate,
  });

  factory ActiveCourierGpsModel.fromFirestore(DocumentSnapshot doc, {String resolvedName = '', String resolvedPhone = ''}) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final coords = d['coordenadas'] as Map<String, dynamic>? ?? {};
    final lat = (coords['latitud'] ?? d['lat'] ?? 0.0).toDouble();
    final lng = (coords['longitud'] ?? d['lng'] ?? 0.0).toDouble();
    
    final docName = d['nombre'] ?? d['name'] ?? d['motorizadoNombre'] ?? '';
    final finalName = resolvedName.isNotEmpty 
        ? resolvedName 
        : (docName.isNotEmpty ? docName : 'Motorizado ${doc.id.length > 4 ? doc.id.substring(doc.id.length - 4) : doc.id}');

    return ActiveCourierGpsModel(
      id: doc.id,
      courierId: d['motorizadoId'] ?? doc.id,
      name: finalName,
      latitude: lat,
      longitude: lng,
      availabilityStatus: (d['estadoDisponibilidad'] ?? d['estado'] ?? 'activo').toString(),
      phone: resolvedPhone.isNotEmpty ? resolvedPhone : (d['telefono'] ?? d['phone'] ?? ''),
      lastUpdate: DateTime.now(),
    );
  }
}

class BusinessAdminModel {
  final String id;
  final String name;
  final String category;
  final String address;
  final String phone;
  final bool active;
  final String logoUrl;
  final double rating;

  BusinessAdminModel({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    required this.phone,
    required this.active,
    required this.logoUrl,
    required this.rating,
  });

  factory BusinessAdminModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    return BusinessAdminModel(
      id: doc.id,
      name: d['name'] ?? d['nombre'] ?? 'Comercio',
      category: d['category'] ?? d['categoria'] ?? 'Restaurante',
      address: d['address'] ?? d['direccion'] ?? '',
      phone: d['phone'] ?? d['telefono'] ?? '',
      active: d['active'] ?? d['activo'] ?? true,
      logoUrl: d['logoUrl'] ?? d['photoUrl'] ?? d['image'] ?? '',
      rating: (d['rating'] ?? 5.0).toDouble(),
    );
  }
}

class GlobalConfigModel {
  final double x2yBaseFee;
  final double x2yPerKmRate;
  final double minCourierVersion;
  final bool maintenanceMode;
  final String supportPhone;
  final String supportWhatsapp;
  final String supportEmail;
  final double merchantCommissionRate;
  final double commissionPercent;

  GlobalConfigModel({
    required this.x2yBaseFee,
    required this.x2yPerKmRate,
    required this.minCourierVersion,
    required this.maintenanceMode,
    required this.supportPhone,
    required this.supportWhatsapp,
    required this.supportEmail,
    required this.merchantCommissionRate,
    required this.commissionPercent,
  });

  factory GlobalConfigModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final xToYPricing = d['xToYPricing'] as Map<String, dynamic>?;
    final resolvedBaseFee = (xToYPricing?['baseFee'] ?? d['x2yBaseFee'] ?? d['tarifaBase'] ?? 35.0).toDouble();
    final resolvedPerKmRate = (xToYPricing?['pricePerKm'] ?? xToYPricing?['perKmRate'] ?? d['x2yPerKmRate'] ?? d['tarifaKm'] ?? 15.0).toDouble();
    final merchantCommissionRate = (d['merchantCommissionRate'] as num?)?.toDouble() ?? 0.15;
    final commissionPercent = (d['commissionPercent'] as num?)?.toDouble() ?? (merchantCommissionRate * 100.0);

    return GlobalConfigModel(
      x2yBaseFee: resolvedBaseFee,
      x2yPerKmRate: resolvedPerKmRate,
      minCourierVersion: (d['minCourierVersion'] ?? 1.0).toDouble(),
      maintenanceMode: d['maintenanceMode'] ?? d['mantenimiento'] ?? false,
      supportPhone: d['supportPhone'] ?? d['telefonoSoporte'] ?? '+50588888888',
      supportWhatsapp: d['supportWhatsapp'] ?? d['whatsappSoporte'] ?? '+50588888888',
      supportEmail: d['supportEmail'] ?? 'soporte@bluesystemdelivery.com',
      merchantCommissionRate: merchantCommissionRate,
      commissionPercent: commissionPercent,
    );
  }
}

class AdminNotificationModel {
  final String id;
  final String type;
  final String title;
  final String body;
  final String priority;
  final String deepLink;
  final String targetModule;
  final bool isRead;
  final DateTime createdAt;

  AdminNotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.priority,
    required this.deepLink,
    required this.targetModule,
    required this.isRead,
    required this.createdAt,
  });

  factory AdminNotificationModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final ts = d['createdAt'] as Timestamp?;
    return AdminNotificationModel(
      id: doc.id,
      type: d['type'] ?? 'ADMIN_SYSTEM_ALERT',
      title: d['title'] ?? 'Alerta Administrativa',
      body: d['body'] ?? d['message'] ?? '',
      priority: (d['priority'] ?? 'NORMAL').toString().toUpperCase(),
      deepLink: d['deepLink'] ?? d['destinationRoute'] ?? '',
      targetModule: d['targetModule'] ?? '',
      isRead: d['isRead'] ?? false,
      createdAt: ts?.toDate() ?? DateTime.now(),
    );
  }
}

// ─── ADMIN SERVICE ───────────────────────────────────────────────────────────

class AdminFirestoreService {
  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;

  AdminFirestoreService({FirebaseFirestore? firestore, FirebaseFunctions? functions})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _functions = functions ?? FirebaseFunctions.instance;

  // 1. Merchant Requests (/merchant_applications)
  Stream<List<MerchantApplicationModel>> getMerchantApplicationsStream() {
    return _firestore
        .collection('merchant_applications')
        .snapshots()
        .map((snap) => snap.docs.map((d) => MerchantApplicationModel.fromFirestore(d)).toList());
  }

  Future<void> updateMerchantApplicationStatus({
    required String applicationId,
    required String status,
    String rejectionReason = '',
    required String adminUid,
  }) async {
    final batch = _firestore.batch();
    final appRef = _firestore.collection('merchant_applications').doc(applicationId);
    batch.update(appRef, {
      'status': status,
      'rejectionReason': rejectionReason,
      'reviewedBy': adminUid,
      'reviewedAt': FieldValue.serverTimestamp(),
    });

    final auditRef = _firestore.collection('audit_events').doc();
    batch.set(auditRef, {
      'eventType': 'MERCHANT_APPLICATION_STATUS_UPDATED',
      'targetId': applicationId,
      'status': status,
      'adminUid': adminUid,
      'timestamp': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  // 2. Courier Requests (/courier_applications)
  Stream<List<CourierApplicationModel>> getCourierApplicationsStream() {
    return _firestore
        .collection('courier_applications')
        .snapshots()
        .map((snap) => snap.docs.map((d) => CourierApplicationModel.fromFirestore(d)).toList());
  }

  Future<void> updateCourierApplicationStatus({
    required String applicationId,
    required String status,
    String rejectionReason = '',
    required String adminUid,
  }) async {
    final batch = _firestore.batch();
    final appRef = _firestore.collection('courier_applications').doc(applicationId);
    batch.update(appRef, {
      'status': status,
      'rejectionReason': rejectionReason,
      'reviewedBy': adminUid,
      'reviewedAt': FieldValue.serverTimestamp(),
    });

    final auditRef = _firestore.collection('audit_events').doc();
    batch.set(auditRef, {
      'eventType': 'COURIER_APPLICATION_STATUS_UPDATED',
      'targetId': applicationId,
      'status': status,
      'adminUid': adminUid,
      'timestamp': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  // 3. Courier Profile Requests (/courier_profile_requests)
  Stream<List<CourierProfileRequestModel>> getCourierProfileRequestsStream() {
    return _firestore
        .collection('courier_profile_requests')
        .snapshots()
        .map((snap) => snap.docs.map((d) => CourierProfileRequestModel.fromFirestore(d)).toList());
  }

  Future<void> updateCourierProfileRequestStatus({
    required String requestId,
    required String status,
    String reviewNote = '',
    required String adminUid,
  }) async {
    await _firestore.collection('courier_profile_requests').doc(requestId).update({
      'status': status,
      'reviewNote': reviewNote,
      'reviewedBy': adminUid,
      'reviewedAt': FieldValue.serverTimestamp(),
    });
  }

  // 4. Identity Center (/users)
  Stream<List<AdminUserModel>> getAllUsersStream() {
    return _firestore.collection('users').snapshots().map((snap) {
      return snap.docs.map((d) => AdminUserModel.fromFirestore(d)).toList();
    });
  }

  Future<void> updateUserRole({
    required String targetUid,
    required String newRole,
    required bool active,
    required String adminUid,
  }) async {
    final batch = _firestore.batch();
    final userRef = _firestore.collection('users').doc(targetUid);
    batch.update(userRef, {
      'role': newRole,
      'eiamRole': newRole,
      'active': active,
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final auditRef = _firestore.collection('audit_events').doc();
    batch.set(auditRef, {
      'eventType': 'USER_ROLE_MUTATED',
      'targetUid': targetUid,
      'newRole': newRole,
      'active': active,
      'adminUid': adminUid,
      'timestamp': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  // 5. Support Tickets (/support_tickets)
  Stream<List<SupportTicketModel>> getSupportTicketsStream() {
    return _firestore
        .collection('support_tickets')
        .snapshots()
        .map((snap) => snap.docs.map((d) => SupportTicketModel.fromFirestore(d)).toList());
  }

  Stream<List<SupportMessageModel>> getTicketMessagesStream(String ticketId) {
    return _firestore
        .collection('support_tickets')
        .doc(ticketId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snap) => snap.docs.map((d) => SupportMessageModel.fromFirestore(d)).toList());
  }

  Future<void> sendSupportMessage({
    required String ticketId,
    required String text,
    required String adminUid,
    required String adminName,
  }) async {
    final batch = _firestore.batch();
    final msgRef = _firestore.collection('support_tickets').doc(ticketId).collection('messages').doc();
    batch.set(msgRef, {
      'senderId': adminUid,
      'senderName': adminName,
      'text': text,
      'isAdmin': true,
      'timestamp': FieldValue.serverTimestamp(),
    });

    final ticketRef = _firestore.collection('support_tickets').doc(ticketId);
    batch.update(ticketRef, {
      'lastMessage': text,
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  Future<void> updateTicketStatus(String ticketId, String newStatus) async {
    await _firestore.collection('support_tickets').doc(ticketId).update({
      'status': newStatus,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // 6. Courier Daily Closures (/courier_daily_closures)
  Stream<List<CourierDailyClosureModel>> getCourierDailyClosuresStream() {
    return _firestore
        .collection('courier_daily_closures')
        .snapshots()
        .map((snap) => snap.docs.map((d) => CourierDailyClosureModel.fromFirestore(d)).toList());
  }

  Future<Map<String, dynamic>> approveCourierDailyClosure({
    required String closureId,
    required String adminUid,
  }) async {
    final callable = _functions.httpsCallable('verifyCourierDailyClosure');
    final result = await callable.call({
      'closureId': closureId,
      'action': 'VERIFY',
    });
    return Map<String, dynamic>.from(result.data as Map? ?? {});
  }

  Future<Map<String, dynamic>> rejectCourierDailyClosure({
    required String closureId,
    required String reason,
    required String adminUid,
  }) async {
    final callable = _functions.httpsCallable('verifyCourierDailyClosure');
    final result = await callable.call({
      'closureId': closureId,
      'action': 'REJECT',
      'rejectionReason': reason,
    });
    return Map<String, dynamic>.from(result.data as Map? ?? {});
  }

  // 7. Live Courier GPS Telemetry (/ubicaciones_repartidores)
  Stream<List<ActiveCourierGpsModel>> getActiveCouriersGpsStream() {
    return _firestore.collection('ubicaciones_repartidores').snapshots().map((snap) {
      return snap.docs.map((d) => ActiveCourierGpsModel.fromFirestore(d)).toList();
    });
  }

  // 8. Businesses Directory (/businesses)
  Stream<List<BusinessAdminModel>> getAllBusinessesStream() {
    return _firestore.collection('businesses').snapshots().map((snap) {
      return snap.docs.map((d) => BusinessAdminModel.fromFirestore(d)).toList();
    });
  }

  Future<void> toggleBusinessStatus({
    required String businessId,
    required bool active,
    required String adminUid,
  }) async {
    final batch = _firestore.batch();
    final bizRef = _firestore.collection('businesses').doc(businessId);
    batch.update(bizRef, {
      'active': active,
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final auditRef = _firestore.collection('audit_events').doc();
    batch.set(auditRef, {
      'eventType': 'BUSINESS_STATUS_TOGGLED',
      'businessId': businessId,
      'active': active,
      'adminUid': adminUid,
      'timestamp': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  // 9. Global Config (/system_config/global)
  Stream<GlobalConfigModel> getGlobalConfigStream() {
    return _firestore.collection('system_config').doc('global').snapshots().map((doc) {
      return GlobalConfigModel.fromFirestore(doc);
    });
  }

  Future<void> updateGlobalConfig({
    required double commissionPercent,
    required bool maintenanceMode,
    required String supportPhone,
    required String supportWhatsapp,
    required String adminUid,
  }) async {
    final canonicalCommissionRate = commissionPercent / 100.0;
    final batch = _firestore.batch();
    final configRef = _firestore.collection('system_config').doc('global');
    batch.set(configRef, {
      'merchantCommissionRate': canonicalCommissionRate,
      'commissionPercent': commissionPercent,
      'maintenanceMode': maintenanceMode,
      'supportPhone': supportPhone,
      'supportWhatsapp': supportWhatsapp,
      'updatedAt': FieldValue.serverTimestamp(),
      'updatedBy': adminUid,
    }, SetOptions(merge: true));

    final auditRef = _firestore.collection('audit_events').doc();
    batch.set(auditRef, {
      'actorUid': adminUid,
      'actorRole': 'ADMIN',
      'action': 'ADMIN_UPDATE_GLOBAL_CONFIG',
      'module': 'GLOBAL_CONFIGURATION',
      'targetType': 'system_config',
      'targetId': 'global',
      'maintenanceMode': maintenanceMode,
      'merchantCommissionRate': canonicalCommissionRate,
      'commissionPercent': commissionPercent,
      'supportPhone': supportPhone,
      'supportWhatsapp': supportWhatsapp,
      'timestamp': FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }

  // 10. Admin Notifications (/users/{adminUid}/notifications)
  Stream<List<AdminNotificationModel>> getAdminNotificationsStream(String adminUid) {
    if (adminUid.isEmpty) return Stream.value([]);
    return _firestore
        .collection('users')
        .doc(adminUid)
        .collection('notifications')
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snap) => snap.docs.map((d) => AdminNotificationModel.fromFirestore(d)).toList());
  }

  Future<void> markNotificationAsRead(String adminUid, String notificationId) async {
    await _firestore
        .collection('users')
        .doc(adminUid)
        .collection('notifications')
        .doc(notificationId)
        .update({'isRead': true});
  }
}
