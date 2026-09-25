/// BLUE SYSTEM DELIVERY ENTERPRISE — PLATFORM NOTIFICATION ADAPTER (v2.2 / v2.3)
/// Canonical Multi-Platform Push Notification Adapter (FCM + APNs)
/// Implements strict schema alignment with /user_devices/{uid}_{deviceId} and FcmManager.kt.

import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/observability/app_logger.dart';
import '../../domain/services/core_service_interfaces.dart';

/// Top-level background message handler required by FlutterFire
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  AppLogger.info('PlatformNotificationAdapter', 'Handling background message: ${message.messageId}');
}

class PlatformNotificationAdapter implements INotificationService {
  final FirebaseMessaging? _fcmInstance;
  final FirebaseFirestore? _firestoreInstance;
  final FlutterLocalNotificationsPlugin? _localNotificationsInstance;

  FirebaseMessaging get _fcm => _fcmInstance ?? FirebaseMessaging.instance;
  FirebaseFirestore get _firestore => _firestoreInstance ?? FirebaseFirestore.instance;
  FlutterLocalNotificationsPlugin get _localNotifications =>
      _localNotificationsInstance ?? FlutterLocalNotificationsPlugin();

  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _deepLinkController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onDeepLinkOpened => _deepLinkController.stream;

  PlatformNotificationAdapter({
    FirebaseMessaging? fcm,
    FirebaseFirestore? firestore,
    FlutterLocalNotificationsPlugin? localNotifications,
  })  : _fcmInstance = fcm,
        _firestoreInstance = firestore,
        _localNotificationsInstance = localNotifications;

  Future<void> initialize() async {
    // 1. Request iOS / Android 13+ Notification Permissions
    final settings = await _fcm.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    AppLogger.info(
      'PlatformNotificationAdapter',
      'APNs / Notification authorization status: ${settings.authorizationStatus}',
    );

    // 2. Set foreground presentation options for iOS
    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 3. Register background handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 4. Initialize local notifications display
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null && response.payload!.isNotEmpty) {
          try {
            // Emitted for deep-link handling
            _deepLinkController.add({'payload': response.payload});
          } catch (e) {
            AppLogger.error('PlatformNotificationAdapter', 'Failed parsing response payload', e);
          }
        }
      },
    );

    // 5. Handle foreground notifications
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      AppLogger.info('PlatformNotificationAdapter', 'Foreground message received: ${message.messageId}');
      _notificationController.add(message.data);
      _showLocalNotification(message);
    });

    // 6. Handle notification click from background state
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      AppLogger.info('PlatformNotificationAdapter', 'App opened from notification: ${message.data}');
      handleDeepLink(message.data);
    });

    // 7. Check if app was opened from terminated state
    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      AppLogger.info('PlatformNotificationAdapter', 'App launched from terminated state via notification');
      handleDeepLink(initialMessage.data);
    }
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    const androidDetails = AndroidNotificationDetails(
      'bluesystem_channel',
      'BlueSystem Notifications',
      channelDescription: 'Canal principal de notificaciones de BlueSystem Delivery',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
    );
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const details = NotificationDetails(android: androidDetails, iOS: darwinDetails);

    await _localNotifications.show(
      message.hashCode,
      notification.title,
      notification.body,
      details,
    );
  }

  @override
  Future<String?> getDeviceToken() async {
    try {
      return await _fcm.getToken();
    } catch (e, st) {
      AppLogger.error('PlatformNotificationAdapter', 'Failed getting device token', e, st);
      return null;
    }
  }

  /// Registers or refreshes the device token in canonical collections:
  /// 1. /users/{uid} (fcmToken and array of fcmTokens)
  /// 2. /user_devices/{uid}_{deviceId} strictly satisfying backend Cloud Functions
  @override
  Future<void> registerDeviceToken({
    required String uid,
    required String token,
    String? role,
    String? deviceId,
  }) async {
    if (token.isEmpty || uid.isEmpty) return;

    final resolvedDeviceId = deviceId ?? 'ios_device_${uid.hashCode.abs()}';
    final effectiveRole = (role ?? 'customer').toLowerCase();

    try {
      // 1. Update /users/{uid}
      if (!uid.startsWith('guest_') && !uid.startsWith('device_')) {
        final docRef = _firestore.collection('users').doc(uid);
        await docRef.set({
          'fcmToken': token,
          'fcmTokens': FieldValue.arrayUnion([token]),
          'lastTokenUpdate': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }

      // 2. Canonical Multi-Device Document: /user_devices/{uid}_{deviceId}
      // CRITICAL: Must use 'fcmToken', 'isActive: true', and 'platform: iOS' for backend compatibility
      final deviceRef = _firestore.collection('user_devices').doc('${uid}_$resolvedDeviceId');
      await deviceRef.set({
        'deviceId': resolvedDeviceId,
        'uid': uid,
        'fcmToken': token,
        'platform': 'iOS',
        'deviceType': 'Smartphone',
        'role': effectiveRole,
        'isTokenValid': true,
        'isActive': true,
        'lastActiveAt': FieldValue.serverTimestamp(),
        'lastTokenUpdate': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // 3. Listen to token refresh
      _fcm.onTokenRefresh.listen((newToken) {
        AppLogger.info('PlatformNotificationAdapter', 'FCM Token refreshed automatically');
        registerDeviceToken(
          uid: uid,
          token: newToken,
          role: effectiveRole,
          deviceId: resolvedDeviceId,
        );
      });

      // 4. Topic subscriptions according to role
      if (['courier', 'motorizado', 'driver'].contains(effectiveRole)) {
        await _fcm.subscribeToTopic('available_orders');
      } else {
        await _fcm.subscribeToTopic('customer_alerts');
      }

      AppLogger.info('PlatformNotificationAdapter', 'Device token registered canonically for user: $uid');
    } catch (e, st) {
      AppLogger.error('PlatformNotificationAdapter', 'Failed registering device token', e, st);
    }
  }

  @override
  void handleDeepLink(Map<String, dynamic> data) {
    AppLogger.info('PlatformNotificationAdapter', 'Routing deep link: $data');
    _deepLinkController.add(data);
  }

  @override
  Stream<Map<String, dynamic>> get onNotificationReceived => _notificationController.stream;
}
