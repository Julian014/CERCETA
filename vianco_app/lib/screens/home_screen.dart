import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class HomeScreen extends StatelessWidget {
  final String userId;

  HomeScreen({required this.userId});

final List<Map<String, dynamic>> rooms = [
  {"name": "Edificio", "devices": 11, "icon": FontAwesomeIcons.building, "color": Color(0xFF7CB646)},
  {"name": "Apartamento", "devices": 12, "icon": FontAwesomeIcons.house, "color": Color(0xFFC92458)},
  {"name": "Pagos", "devices": 10, "icon": FontAwesomeIcons.moneyBillWave, "color": Color(0xFFEFA325)},
  {"name": "Domicilios", "devices": 5, "icon": FontAwesomeIcons.motorcycle, "color": Color(0xFF7CB646)},
  {"name": "Informes", "devices": 3, "icon": FontAwesomeIcons.fileAlt, "color": Color(0xFFC92458)},
];



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 60), // Deja espacio para la barra de navegación
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Contenedor principal ahora ocupa todo el ancho
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 5)],
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "My Home",
                                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                              ),
                              Icon(FontAwesomeIcons.ellipsisV, color: Colors.grey[600]),
                            ],
                          ),
                        ),

                        Container(
                          width: double.infinity,
                          padding: EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
  colors: [Color(0xFF1E99D3), Color(0xFF1565C0)], // Lista de colores
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(FontAwesomeIcons.home, size: 30, color: Colors.white),
                                  SizedBox(width: 10),
                                  Text(
                                    "Apartamento",
                                    style: TextStyle(color: Colors.white, fontSize: 16),
                                  ),
                                ],
                              ),
                              Text(
                                "43 Devices",
                                style: TextStyle(color: Colors.white),
                              ),
                            ],
                          ),
                        ),

                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: GridView.builder(
                            shrinkWrap: true,
                            physics: NeverScrollableScrollPhysics(), // Se desplaza el padre, no el GridView
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 1,
                            ),
                            itemCount: rooms.length,
                            itemBuilder: (context, index) {
                              final room = rooms[index];
                              return Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 5)],
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
Icon(room["icon"], size: 40, color: room["color"]),
                                    SizedBox(height: 8),
                                    Text(
                                      room["name"],
                                      style: TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      "${room["devices"]} Devices",
                                      style: TextStyle(color: Colors.grey[600]),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Navegación inferior fija
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 5)],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Icon(FontAwesomeIcons.home, color: Colors.purple),
                  Icon(FontAwesomeIcons.blog, color: Colors.grey),
                  Icon(FontAwesomeIcons.bell, color: Colors.grey),
                  Icon(FontAwesomeIcons.cog, color: Colors.grey),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
