/// BLUE SYSTEM DELIVERY ENTERPRISE — USER PROFILE & ADDRESS FIRESTORE SERVICE
/// Implements IUserService with 1:1 Android parity (AddressRepository.kt / Models.kt).
/// Handles /users/{uid} profile data and /users/{uid}/addresses subcollection CRUD.

import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/saved_address_entity.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/services/core_service_interfaces.dart';

class UserFirestoreService implements IUserService {
  final FirebaseFirestore _firestore;

  UserFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<UserProfileEntity?> watchProfile(String uid) {
    if (uid.isEmpty) return Stream.value(null);
    AppLogger.info('UserFirestoreService', 'Watching profile for uid: $uid');
    return _firestore.collection('users').doc(uid).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return UserProfileEntity.fromMap(doc.data()!, doc.id);
    });
  }

  @override
  Future<void> updateProfile(
    String uid, {
    required String displayName,
    String? phoneNumber,
  }) async {
    final trimmedUid = uid.trim();
    final trimmedName = displayName.trim();

    if (trimmedUid.isEmpty) {
      throw ArgumentError('uid cannot be empty');
    }
    if (trimmedName.isEmpty) {
      throw ArgumentError('displayName cannot be empty');
    }

    AppLogger.info('UserFirestoreService', 'Updating profile for $trimmedUid: name="$trimmedName", phone="$phoneNumber"');

    final data = <String, dynamic>{
      'displayName': trimmedName,
      'name': trimmedName,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (phoneNumber != null) {
      final trimmedPhone = phoneNumber.trim();
      data['phoneNumber'] = trimmedPhone;
      data['phone'] = trimmedPhone;
      data['telefono'] = trimmedPhone;
    }

    await _firestore.collection('users').doc(trimmedUid).set(data, SetOptions(merge: true));
  }

  @override
  Stream<List<SavedAddressEntity>> watchAddresses(String uid) {
    if (uid.isEmpty) return Stream.value([]);
    AppLogger.info('UserFirestoreService', 'Watching addresses for uid: $uid');

    return _firestore
        .collection('users')
        .doc(uid)
        .collection('addresses')
        .snapshots()
        .map((snap) {
      final list = <SavedAddressEntity>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        list.add(SavedAddressEntity.fromMap(data, doc.id));
      }
      // Sort default address first, then by createdAt desc
      list.sort((a, b) {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return b.createdAt.compareTo(a.createdAt);
      });
      return list;
    });
  }

  @override
  Future<void> saveAddress(String uid, SavedAddressEntity address) async {
    final trimmedUid = uid.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (address.fullAddress.trim().isEmpty) {
      throw ArgumentError('fullAddress cannot be empty');
    }

    final collection = _firestore.collection('users').doc(trimmedUid).collection('addresses');
    final docRef = address.id.isNotEmpty ? collection.doc(address.id) : collection.doc();
    final addressId = docRef.id;

    AppLogger.info('UserFirestoreService', 'Saving address $addressId for uid: $trimmedUid');

    final batch = _firestore.batch();

    // If marked as default, unset existing default addresses
    if (address.isDefault) {
      final existingSnap = await collection.where('isDefault', isEqualTo: true).get();
      for (final doc in existingSnap.docs) {
        if (doc.id != addressId) {
          batch.update(doc.reference, {'isDefault': false, 'updatedAt': FieldValue.serverTimestamp()});
        }
      }
    }

    final data = <String, dynamic>{
      'id': addressId,
      'userId': trimmedUid,
      'label': address.label.trim().isEmpty ? 'Casa' : address.label.trim(),
      'fullAddress': address.fullAddress.trim(),
      'address': address.fullAddress.trim(),
      'instructions': address.instructions.trim(),
      'isDefault': address.isDefault,
      'latitude': address.latitude,
      'longitude': address.longitude,
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (address.id.isEmpty) {
      data['createdAt'] = FieldValue.serverTimestamp();
    }

    batch.set(docRef, data, SetOptions(merge: true));
    await batch.commit();
  }

  @override
  Future<void> deleteAddress(String uid, String addressId) async {
    final trimmedUid = uid.trim();
    final trimmedAddressId = addressId.trim();

    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (trimmedAddressId.isEmpty) throw ArgumentError('addressId cannot be empty');

    AppLogger.info('UserFirestoreService', 'Deleting address $trimmedAddressId for uid: $trimmedUid');
    await _firestore
        .collection('users')
        .doc(trimmedUid)
        .collection('addresses')
        .doc(trimmedAddressId)
        .delete();
  }

  @override
  Future<void> setDefaultAddress(String uid, String addressId) async {
    final trimmedUid = uid.trim();
    final trimmedAddressId = addressId.trim();

    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (trimmedAddressId.isEmpty) throw ArgumentError('addressId cannot be empty');

    AppLogger.info('UserFirestoreService', 'Setting default address $trimmedAddressId for uid: $trimmedUid');

    final collection = _firestore.collection('users').doc(trimmedUid).collection('addresses');
    final allSnap = await collection.get();

    final batch = _firestore.batch();
    for (final doc in allSnap.docs) {
      final isTarget = doc.id == trimmedAddressId;
      batch.update(doc.reference, {
        'isDefault': isTarget,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  @override
  Stream<Set<String>> watchFavoriteBusinessIds(String uid) {
    final trimmedUid = uid.trim();
    if (trimmedUid.isEmpty) return Stream.value({});
    AppLogger.info('UserFirestoreService', 'Watching favorites for uid: $trimmedUid');

    return _firestore
        .collection('users')
        .doc(trimmedUid)
        .collection('favorites')
        .snapshots()
        .map((snap) {
      final bizIds = <String>{};
      for (final doc in snap.docs) {
        final data = doc.data();
        final type = data['type']?.toString().toLowerCase() ?? '';
        final docId = doc.id;
        if (type == 'product' || docId.startsWith('prod_') || data.containsKey('productId')) {
          continue;
        }
        final bId = (data['businessId'] ?? data['targetId'] ?? docId.replaceFirst('biz_', '')).toString().trim();
        if (bId.isNotEmpty) {
          bizIds.add(bId);
          bizIds.add(docId);
        }
      }
      return bizIds;
    });
  }

  @override
  Future<void> toggleFavoriteBusiness(String uid, String businessId, {String? businessName}) async {
    final trimmedUid = uid.trim();
    final cleanBizId = businessId.trim();
    if (trimmedUid.isEmpty) throw ArgumentError('uid cannot be empty');
    if (cleanBizId.isEmpty) throw ArgumentError('businessId cannot be empty');

    final favsColl = _firestore.collection('users').doc(trimmedUid).collection('favorites');
    final docRef = favsColl.doc(cleanBizId);
    final docSnap = await docRef.get();

    final batch = _firestore.batch();
    if (docSnap.exists) {
      batch.delete(docRef);
      // Also delete legacy biz_ prefix if exists
      batch.delete(favsColl.doc('biz_$cleanBizId'));
      AppLogger.info('UserFirestoreService', 'Removed favorite business: $cleanBizId for uid: $trimmedUid');
    } else {
      final data = <String, dynamic>{
        'type': 'business',
        'businessId': cleanBizId,
        'targetId': cleanBizId,
        'addedAt': FieldValue.serverTimestamp(),
      };
      if (businessName != null && businessName.trim().isNotEmpty) {
        data['name'] = businessName.trim();
      }
      batch.set(docRef, data, SetOptions(merge: true));
      AppLogger.info('UserFirestoreService', 'Added favorite business: $cleanBizId for uid: $trimmedUid');
    }
    await batch.commit();
  }
}
