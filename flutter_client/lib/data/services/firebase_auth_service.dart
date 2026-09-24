/// BLUE SYSTEM DELIVERY ENTERPRISE — FIREBASE AUTH SERVICE IMPLEMENTATION
/// Connects to Firebase Auth, extracts JWT claims and hydrates UserProfileEntity.

import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/auth/auth_context.dart';
import '../../core/errors/app_exceptions.dart';
import '../../core/observability/app_logger.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class FirebaseAuthService implements IAuthService {
  final fb_auth.FirebaseAuth _firebaseAuth;
  final FirebaseFirestore _firestore;

  FirebaseAuthService({
    fb_auth.FirebaseAuth? firebaseAuth,
    FirebaseFirestore? firestore,
  })  : _firebaseAuth = firebaseAuth ?? fb_auth.FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<UserProfileEntity?> get authStateChanges {
    return _firebaseAuth.authStateChanges().asyncMap((fbUser) async {
      if (fbUser == null) return null;
      return await getCurrentUser();
    });
  }

  @override
  Future<UserProfileEntity?> getCurrentUser() async {
    final fbUser = _firebaseAuth.currentUser;
    if (fbUser == null) return null;

    try {
      final userDoc = await _firestore.collection('users').doc(fbUser.uid).get();
      if (!userDoc.exists) {
        return UserProfileEntity(
          uid: fbUser.uid,
          email: fbUser.email ?? '',
          displayName: fbUser.displayName ?? '',
          phoneNumber: fbUser.phoneNumber,
          photoUrl: fbUser.photoURL,
          role: EiamRole.guest,
          isVerified: fbUser.emailVerified,
          createdAt: DateTime.now().millisecondsSinceEpoch,
          updatedAt: DateTime.now().millisecondsSinceEpoch,
        );
      }

      return UserProfileEntity.fromMap(userDoc.data()!, fbUser.uid);
    } catch (e, st) {
      AppLogger.error('FirebaseAuthService', 'Error getting current user', e, st);
      return null;
    }
  }

  @override
  Future<CanonicalCustomClaimsV3?> getCustomClaims() async {
    final fbUser = _firebaseAuth.currentUser;
    if (fbUser == null) return null;

    try {
      final tokenResult = await fbUser.getIdTokenResult(true);
      if (tokenResult.claims == null) return null;
      return CanonicalCustomClaimsV3.fromTokenMap(tokenResult.claims!);
    } catch (e, st) {
      AppLogger.error('FirebaseAuthService', 'Error getting custom claims', e, st);
      return null;
    }
  }

  @override
  Future<UserProfileEntity> signInWithEmailPassword(String email, String password) async {
    try {
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      final user = await getCurrentUser();
      if (user == null) {
        throw BlueSystemException(
          code: ErrorCode.unauthenticated,
          message: 'Error al recuperar perfil de usuario tras autenticación exitosa.',
        );
      }

      AppLogger.audit(
        'FirebaseAuthService',
        'LOGIN_SUCCESS',
        tenantId: user.activeTenantId ?? 'TENANT_UNKNOWN',
        uid: user.uid,
      );

      return user;
    } on fb_auth.FirebaseAuthException catch (e) {
      AppLogger.warn('FirebaseAuthService', 'Login failed: ${e.code}');
      throw BlueSystemException(
        code: ErrorCode.unauthenticated,
        message: e.message ?? 'Credenciales inválidas.',
        technicalDetails: e.code,
      );
    }
  }

  @override
  Future<void> signOut() async {
    final uid = _firebaseAuth.currentUser?.uid;
    await _firebaseAuth.signOut();
    if (uid != null) {
      AppLogger.audit(
        'FirebaseAuthService',
        'LOGOUT_SUCCESS',
        tenantId: 'N/A',
        uid: uid,
      );
    }
  }

  @override
  Future<void> refreshIdToken() async {
    await _firebaseAuth.currentUser?.getIdTokenResult(true);
  }
}
