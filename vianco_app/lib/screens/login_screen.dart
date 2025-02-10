import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'home_screen.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    print("🔵 Iniciando sesión...");

    setState(() => _isLoading = true);

    final String email = _emailController.text.trim();
    final String password = _passwordController.text.trim();
    final String url = 'http://localhost:3000/login_app';

    try {
      String? fcmToken = await FirebaseMessaging.instance.getToken();
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
          'fcm_token': fcmToken,
        }),
      );

      print("🟢 Respuesta del servidor: ${response.body}");
      final responseData = json.decode(response.body);

      if (response.statusCode == 200 && responseData['user_id'] != null && responseData['token'] != null) {
        await _saveSession(responseData['token'], responseData['user_id'].toString());
        _navigateToHome(responseData['user_id'].toString());
      } else {
        _showMessage(responseData['message'] ?? 'Error al iniciar sesión');
      }
    } catch (error) {
      _showMessage('❌ No se pudo conectar al servidor: $error');
      print("🔴 Error en la conexión: $error");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveSession(String token, String userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_token', token);
      await prefs.setString('user_id', userId);
      print("✅ Sesión guardada correctamente");
    } catch (error) {
      print("🔴 Error al guardar sesión: $error");
    }
  }

  void _navigateToHome(String userId) {
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => HomeScreen(userId: userId),
        ),
      );
      print("🟢 Navegando a HomeScreen");
    }
  }

  void _showMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Image.asset(
                'assets/images/2022cercetafinal_blanco.png',
                height: 100,
                width: 100,
              ),
              SizedBox(height: 20),
              Text(
                'INICIO DE SESIÓN',
                style: TextStyle(
                  color: Color(0xFF1E99D3),
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 20),
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.person),
                  labelText: 'Email',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                ),
              ),
              SizedBox(height: 20),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  prefixIcon: Icon(Icons.lock),
                  labelText: 'Password',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                ),
              ),
              SizedBox(height: 10),
              ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.pink,
                  padding: EdgeInsets.symmetric(vertical: 16.0),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                ),
                child: _isLoading
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text('Ingresar', style: TextStyle(color: Colors.white)),
              ),
              SizedBox(height: 20),
              Text('Visítanos'),
              SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  IconButton(
                    icon: Icon(FontAwesomeIcons.facebook, color: Colors.blue),
                    onPressed: () async {
                      final Uri url = Uri.parse('https://www.facebook.com');
                      if (await canLaunchUrl(url)) await launchUrl(url);
                    },
                  ),
                  IconButton(
                    icon: Icon(Icons.language, color: Colors.green),
                    onPressed: () async {
                      final Uri url = Uri.parse('https://cercetasolucionesempresariales.com');
                      if (await canLaunchUrl(url)) await launchUrl(url);
                    },
                  ),
                ],
              ),
              SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Text("No puedo ingresar"),
                  TextButton(
                    onPressed: () {},
                    child: Text('ayuda', style: TextStyle(color: Colors.pink)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
