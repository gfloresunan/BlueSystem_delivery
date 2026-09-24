/// BLUE SYSTEM DELIVERY ENTERPRISE — COURIER CASH CLOSURE SERVICE
/// Manages courier balance reading (/courier_balances/{courierId}),
/// deposit receipt upload (/courier_deposits/{courierId}/{timestamp}.jpg),
/// and closure initiation via authoritative Cloud Function (ADR-018).

import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/entities/courier_balance_entity.dart';

abstract class ICourierCashClosureService {
  Stream<CourierBalanceEntity?> watchCourierBalance(String courierId);
  Future<CourierBalanceEntity?> getCourierBalance(String courierId);
  Stream<List<CourierDailyClosureEntity>> watchClosureHistory(String courierId);
  Future<String> uploadDepositReceipt({
    required String courierId,
    required File imageFile,
  });
  Future<Map<String, dynamic>> initiateDailyClosure({
    required String courierId,
    required String bankReference,
    required String receiptUrl,
    required int totalCollectedCents,
  });
}

class CourierCashClosureService implements ICourierCashClosureService {
  final FirebaseFirestore _firestore;
  final FirebaseStorage _storage;
  final FirebaseFunctions _functions;

  CourierCashClosureService({
    FirebaseFirestore? firestore,
    FirebaseStorage? storage,
    FirebaseFunctions? functions,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _storage = storage ?? FirebaseStorage.instance,
        _functions = functions ?? FirebaseFunctions.instance;

  @override
  Stream<CourierBalanceEntity?> watchCourierBalance(String courierId) {
    return _firestore
        .collection('courier_balances')
        .doc(courierId)
        .snapshots()
        .map((doc) {
          if (!doc.exists || doc.data() == null) {
            return CourierBalanceEntity(
              courierId: courierId,
              cashOutstandingCents: 0,
              effectiveCashLimitCents: 300000,
            );
          }
          return CourierBalanceEntity.fromMap(doc.data()!, doc.id);
        })
        .handleError((error, st) {
          AppLogger.error('CourierCashClosureService', 'Error watching balance for $courierId', error, st);
          return null;
        });
  }

  @override
  Future<CourierBalanceEntity?> getCourierBalance(String courierId) async {
    try {
      final doc = await _firestore.collection('courier_balances').doc(courierId).get();
      if (!doc.exists || doc.data() == null) {
        return CourierBalanceEntity(
          courierId: courierId,
          cashOutstandingCents: 0,
          effectiveCashLimitCents: 300000,
        );
      }
      return CourierBalanceEntity.fromMap(doc.data()!, doc.id);
    } catch (e, st) {
      AppLogger.error('CourierCashClosureService', 'Failed getting balance for $courierId', e, st);
      return null;
    }
  }

  @override
  Stream<List<CourierDailyClosureEntity>> watchClosureHistory(String courierId) {
    return _firestore
        .collection('courier_daily_closures')
        .where('courierId', isEqualTo: courierId)
        .orderBy('createdAt', descending: true)
        .limit(20)
        .snapshots()
        .map((snap) => snap.docs
            .map((d) => CourierDailyClosureEntity.fromMap(d.data(), d.id))
            .toList())
        .handleError((error, st) {
          AppLogger.error('CourierCashClosureService', 'Error watching closures', error, st);
          return <CourierDailyClosureEntity>[];
        });
  }

  @override
  Future<String> uploadDepositReceipt({
    required String courierId,
    required File imageFile,
  }) async {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final path = 'courier_deposits/$courierId/$timestamp.jpg';

    try {
      final ref = _storage.ref().child(path);
      final metadata = SettableMetadata(
        contentType: 'image/jpeg',
        customMetadata: {
          'courierId': courierId,
          'uploadedAt': timestamp.toString(),
          'platform': 'iOS',
        },
      );

      final uploadTask = await ref.putFile(imageFile, metadata);
      final downloadUrl = await uploadTask.ref.getDownloadURL();
      AppLogger.info('CourierCashClosureService', 'Deposit receipt uploaded successfully: $path');
      return downloadUrl;
    } catch (e, st) {
      AppLogger.error('CourierCashClosureService', 'Failed uploading deposit receipt', e, st);
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> initiateDailyClosure({
    required String courierId,
    required String bankReference,
    required String receiptUrl,
    required int totalCollectedCents,
  }) async {
    try {
      final callable = _functions.httpsCallable('initiateCourierDailyClosure');
      final result = await callable.call<Map<String, dynamic>>({
        'courierId': courierId,
        'bankReference': bankReference,
        'depositReceiptUrl': receiptUrl,
        'totalCollectedCents': totalCollectedCents,
        'platform': 'iOS',
      });

      AppLogger.info('CourierCashClosureService', 'Closure initiated successfully');
      return Map<String, dynamic>.from(result.data);
    } catch (e, st) {
      AppLogger.error('CourierCashClosureService', 'Error in initiateDailyClosure callable', e, st);
      rethrow;
    }
  }
}
