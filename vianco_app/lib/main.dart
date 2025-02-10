import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print("🔵 Notificación en segundo plano: ${message.notification?.title}, ${message.notification?.body}");
}

Future<Map<String, String?>> getSession() async {
  final prefs = await SharedPreferences.getInstance();
  return {
    'token': prefs.getString('user_token'),
    'userId': prefs.getString('user_id'),
  };
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  bool _isLoading = true;
  String? _userId;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _loadSession();

    // Manejar notificaciones en primer plano
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("🔔 Notificación recibida en primer plano: ${message.notification?.title}, ${message.notification?.body}");
    });

    // Manejar cuando se abre la app por una notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print("📩 Notificación abierta: ${message.notification?.title}, ${message.notification?.body}");
    });
  }

  Future<void> _loadSession() async {
    var sessionData = await getSession();
    setState(() {
      _userId = sessionData['userId'];
      _isLoggedIn = sessionData['token'] != null;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aplicación Conductores',
      debugShowCheckedModeBanner: false,
      home: _isLoading
          ? Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : _isLoggedIn && _userId != null
              ? HomeScreen(userId: _userId!)
              : LoginScreen(),
    );
  }
}
