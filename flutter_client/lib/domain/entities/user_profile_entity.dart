/// BLUE SYSTEM DELIVERY ENTERPRISE — USER PROFILE DOMAIN ENTITY
/// User entity mirroring /users/{uid} in Firestore.

import '../../core/auth/auth_context.dart';

class UserProfileEntity {
  final String uid;
  final String email;
  final String displayName;
  final String? phoneNumber;
  final String? photoUrl;
  final EiamRole role;
  final String? activeTenantId;
  final String? activeBrandId;
  final String? activeMembershipId;
  final bool isVerified;
  final int createdAt;
  final int updatedAt;

  String? get tenantId => activeTenantId;
  String? get brandId => activeBrandId;
  String? get membershipId => activeMembershipId;

  const UserProfileEntity({
    required this.uid,
    required this.email,
    required this.displayName,
    this.phoneNumber,
    this.photoUrl,
    required this.role,
    this.activeTenantId,
    this.activeBrandId,
    this.activeMembershipId,
    required this.isVerified,
    required this.createdAt,
    required this.updatedAt,
  });

  static int _parseTimestamp(dynamic val) {
    if (val == null) return 0;
    if (val is num) return val.toInt();
    if (val is String) {
      final parsedNum = num.tryParse(val);
      if (parsedNum != null) return parsedNum.toInt();
      final parsedDate = DateTime.tryParse(val);
      if (parsedDate != null) return parsedDate.millisecondsSinceEpoch;
    }
    // Handles cloud_firestore Timestamp if present via duck-typing
    try {
      final ms = (val as dynamic).millisecondsSinceEpoch;
      if (ms is num) return ms.toInt();
    } catch (_) {}
    return 0;
  }

  factory UserProfileEntity.fromMap(Map<String, dynamic> map, String uid) {
    final rawRole = map['role'] ?? map['rol'] ?? map['eiamRole'] ?? map['userType'];
    final rawPhoto = map['photoUrl'] ?? map['photoURL'] ?? map['fotoUrl'] ?? map['profilePhotoUrl'];
    final rawName = map['displayName'] ?? map['nombre'] ?? map['name'];
    final rawPhone = map['phoneNumber'] ?? map['telefono'] ?? map['phone'];
    final rawTenant = map['activeTenantId'] ?? map['tenantId'] ?? map['commercialTenantId'];

    return UserProfileEntity(
      uid: uid,
      email: map['email'] as String? ?? '',
      displayName: rawName?.toString() ?? '',
      phoneNumber: rawPhone?.toString(),
      photoUrl: rawPhoto?.toString(),
      role: MembershipV3Entity.parseRole(rawRole?.toString()),
      activeTenantId: rawTenant?.toString(),
      activeBrandId: map['activeBrandId'] as String? ?? map['brandId'] as String?,
      activeMembershipId: map['activeMembershipId'] as String? ?? map['membershipId'] as String?,
      isVerified: map['isVerified'] == true || map['emailVerified'] == true,
      createdAt: _parseTimestamp(map['createdAt']),
      updatedAt: _parseTimestamp(map['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() => {
        'email': email,
        'displayName': displayName,
        'phoneNumber': phoneNumber,
        'photoUrl': photoUrl,
        'role': role.name.toUpperCase(),
        'activeTenantId': activeTenantId,
        'activeBrandId': activeBrandId,
        'activeMembershipId': activeMembershipId,
        'isVerified': isVerified,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
