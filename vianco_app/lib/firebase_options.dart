// File generated by FlutterFire CLI.
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Example:
/// ```dart
/// import 'firebase_options.dart';
/// // ...
/// await Firebase.initializeApp(
///   options: DefaultFirebaseOptions.currentPlatform,
/// );
/// ```
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
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAwOBsQEezFNu6zXbXim15WN5EWKjYFgLg',
    appId: '1:580041916267:web:4d5398e52dd0ebeea7d62e',
    messagingSenderId: '580041916267',
    projectId: 'vianco-cd3a3',
    authDomain: 'vianco-cd3a3.firebaseapp.com',
    storageBucket: 'vianco-cd3a3.firebasestorage.app',
    measurementId: 'G-9TR6B33CLR',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBJcs_64JWaOQVJmxeQ3zMGMVceIl3A1yw',
    appId: '1:580041916267:android:09c1ad970881f504a7d62e',
    messagingSenderId: '580041916267',
    projectId: 'vianco-cd3a3',
    storageBucket: 'vianco-cd3a3.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAq_2dlM21P4lDbmJQJ-_uZJvD5ACMkKlw',
    appId: '1:580041916267:ios:186ba34c1624cdf4a7d62e',
    messagingSenderId: '580041916267',
    projectId: 'vianco-cd3a3',
    storageBucket: 'vianco-cd3a3.firebasestorage.app',
    iosBundleId: 'com.example.aplicacionConductores',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyAq_2dlM21P4lDbmJQJ-_uZJvD5ACMkKlw',
    appId: '1:580041916267:ios:186ba34c1624cdf4a7d62e',
    messagingSenderId: '580041916267',
    projectId: 'vianco-cd3a3',
    storageBucket: 'vianco-cd3a3.firebasestorage.app',
    iosBundleId: 'com.example.aplicacionConductores',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyAwOBsQEezFNu6zXbXim15WN5EWKjYFgLg',
    appId: '1:580041916267:web:08e361a3252ae1bea7d62e',
    messagingSenderId: '580041916267',
    projectId: 'vianco-cd3a3',
    authDomain: 'vianco-cd3a3.firebaseapp.com',
    storageBucket: 'vianco-cd3a3.firebasestorage.app',
    measurementId: 'G-TVYGQX8ZDM',
  );
}
