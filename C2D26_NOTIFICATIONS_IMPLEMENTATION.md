# C2D26 — PUSH NOTIFICATIONS IMPLEMENTATION

**Module:** Multiplatform Push Notifications (FCM / APNs)  
**File:** `flutter_client/lib/platform/notifications/notification_adapter.dart`  

---

## 1. Architecture & Strategy

1. **Multi-Platform Adapter:**
   - Android: Firebase Cloud Messaging (FCM).
   - iOS: Apple Push Notification Service (APNs) via FCM bridging.
2. **Token Management:**
   - `getDeviceToken()` retrieves the platform-specific registration token.
   - `registerDeviceToken()` persists token in `/user_devices/{uid}_{deviceId}`.
3. **Payload Handling:**
   - Foreground: Emits to `onNotificationReceived` stream for in-app alert display.
   - Background: Handled by platform background callbacks.
   - Deep Linking: Routes to specific order or trip based on `orderId` or `tripId` payload fields.
4. **Session Cleanup:** Invalidates/removes device token on user sign-out to prevent privacy leakage.
