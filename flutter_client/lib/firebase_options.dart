// File generated for BlueSystem Delivery Enterprise (Project: bluesystem-7c9af)
// Do not modify manually unless project keys change in Firebase Console.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI',
    appId: '1:514416631826:web:6543bcae6e16f7374b3419',
    messagingSenderId: '514416631826',
    projectId: 'bluesystem-7c9af',
    authDomain: 'bluesystem-7c9af.firebaseapp.com',
    storageBucket: 'bluesystem-7c9af.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI',
    appId: '1:514416631826:android:788b99430f87324e88b8cb',
    messagingSenderId: '514416631826',
    projectId: 'bluesystem-7c9af',
    storageBucket: 'bluesystem-7c9af.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI',
    appId: '1:514416631826:ios:788b99430f87324e88b8cb',
    messagingSenderId: '514416631826',
    projectId: 'bluesystem-7c9af',
    storageBucket: 'bluesystem-7c9af.firebasestorage.app',
    iosBundleId: 'com.bluesystem.delivery.client',
  );
}
