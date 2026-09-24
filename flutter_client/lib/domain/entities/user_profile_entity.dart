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
  final bool isVerified;
  final int createdAt;
  final int updatedAt;

  const UserProfileEntity({
    required this.uid,
    required this.email,
    required this.displayName,
    this.phoneNumber,
    this.photoUrl,
    required this.role,
    this.activeTenantId,
    this.activeBrandId,
    required this.isVerified,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfileEntity.fromMap(Map<String, dynamic> map, String uid) {
    return UserProfileEntity(
      uid: uid,
      email: map['email'] as String? ?? '',
      displayName: map['displayName'] as String? ?? map['nombre'] as String? ?? '',
      phoneNumber: map['phoneNumber'] as String? ?? map['telefono'] as String?,
      photoUrl: map['photoUrl'] as String?,
      role: MembershipV3Entity._parseRole(map['role'] as String? ?? map['eiamRole'] as String?),
      activeTenantId: map['activeTenantId'] as String? ?? map['tenantId'] as String?,
      activeBrandId: map['activeBrandId'] as String? ?? map['brandId'] as String?,
      isVerified: map['isVerified'] as bool? ?? false,
      createdAt: (map['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (map['updatedAt'] as num?)?.toInt() ?? 0,
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
        'isVerified': isVerified,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };
}
