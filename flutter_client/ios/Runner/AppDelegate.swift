import UIKit
import Flutter
import GoogleMaps
import FirebaseCore
import FirebaseMessaging

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // 1. Google Maps iOS SDK Key initialization
    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let dict = NSDictionary(contentsOfFile: path),
       let apiKey = dict["API_KEY"] as? String, !apiKey.isEmpty {
      GMSServices.provideAPIKey(apiKey)
    }

    // 2. Register Flutter Plugins
    GeneratedPluginRegistrant.register(with: self)

    // 3. Register for APNs remote notifications
    application.registerForRemoteNotifications()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Bridging APNs deviceToken to Firebase Messaging (Required when FirebaseAppDelegateProxyEnabled is false)
  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    Messaging.messaging().apnsToken = deviceToken
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("[AppDelegate] Failed to register for remote notifications: \(error.localizedDescription)")
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }
}
