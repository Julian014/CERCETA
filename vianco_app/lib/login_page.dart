import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class LoginPage extends StatefulWidget {
  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  // Función para realizar la solicitud de login
  Future<void> login() async {
    final String url = 'http://34.66.173.227:3000/login_appconductor';  // URL de tu backend

    // Recoger los valores de los campos de email y password
    final String email = emailController.text;
    final String password = passwordController.text;

    // Hacer la solicitud POST
    final response = await http.post(
      Uri.parse(url),
      headers: {"Content-Type": "application/json"},
      body: json.encode({
        'email': email,
        'password': password,
      }),
    );

    // Verificar la respuesta del servidor
    if (response.statusCode == 200) {
      // Si el login es exitoso
      final data = json.decode(response.body);
      print('Login exitoso: ${data['message']}');
      // Aquí puedes navegar a la siguiente pantalla, por ejemplo
      // Navigator.pushReplacementNamed(context, '/home');
    } else {
      // Si las credenciales son incorrectas
      final data = json.decode(response.body);
      print('Error: ${data['message']}');
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Error'),
          content: Text(data['message']),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login Conductor'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: <Widget>[
            TextField(
              controller: emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: InputDecoration(labelText: 'Contraseña'),
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: login,
              child: Text('Iniciar sesión'),
            ),
          ],
        ),
      ),
    );
  }
}
