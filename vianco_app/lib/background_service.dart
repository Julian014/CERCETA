import 'dart:async';
import 'dart:ui';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  String? userId;

  // Escuchar eventos personalizados para configurar argumentos
  service.on('setArgs').listen((event) {
    if (event != null && event is Map<String, dynamic>) {
      userId = event['user_id'];
    } else {
      print('Evento "setArgs" no válido o nulo.');
    }
  });

  if (service is AndroidServiceInstance) {
    service.on('stopService').listen((event) {
      service.stopSelf();
    });
  }

  Timer.periodic(Duration(seconds: 30), (timer) async {
    if (userId == null) {
      print('El user_id no está configurado aún.');
      return;
    }

    final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);

    final url =
        'https://vianco-back-svdl.onrender.com/guardar_ubicacion_apk';

    try {
      await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'user_id': userId,
        }),
      );
      print('Ubicación enviada: (${position.latitude}, ${position.longitude})');
    } catch (e) {
      print('Error enviando ubicación: $e');
    }
  });
}

Future<void> initializeService(String userId) async {
  final service = FlutterBackgroundService();

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: true,
      isForegroundMode: true,
      notificationChannelId: 'my_foreground',
      initialNotificationTitle: 'Servicio en segundo plano',
      initialNotificationContent: 'Enviando ubicación...',
    ),
    iosConfiguration: IosConfiguration(
      onForeground: onStart,
      autoStart: false, // Opcional para iOS
    ),
  );

  await service.startService();
  service.invoke('setArgs', {'user_id': userId}); // Pasar el user_id al servicio
}
