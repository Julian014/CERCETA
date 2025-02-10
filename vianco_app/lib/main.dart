import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';  // Importa Firebase
import 'firebase_options.dart';
import 'screens/login_screen.dart'; // Importa el archivo del login
import 'package:firebase_messaging/firebase_messaging.dart';
import 'screens/home_screen.dart';


Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Manejo de notificación en segundo plano
  print("Notificación en segundo plano: ${message.notification?.title}, ${message.notification?.body}");
  // Aquí puedes hacer algo con la notificación, como mostrarla de manera local o navegar.
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();  // Asegúrate de inicializar la aplicación
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,  // Opciones de Firebase
  );

  // Configurar el manejo de notificaciones en segundo plano
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Escuchar notificaciones cuando la aplicación está en primer plano
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print("Notificación recibida en primer plano: ${message.notification?.title}, ${message.notification?.body}");
      // Aquí puedes manejar la notificación como mostrar un cuadro de diálogo o hacer alguna acción
    });

    // Escuchar cuando la app es abierta a través de una notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print("Notificación abierta: ${message.notification?.title}, ${message.notification?.body}");
      // Aquí puedes navegar a la pantalla específica si es necesario
    });

    return MaterialApp(
      title: 'Aplicación Conductores',
      home: LoginScreen(), // Pantalla de login
    );
  }
}
