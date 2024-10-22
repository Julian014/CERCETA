const mysql = require('mysql2');

// Crear la conexión a la base de datos
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'cerceta',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();  // Esto convierte el pool en una versión que utiliza promesas

// Exportar la conexión para usarla en otros módulos
module.exports = pool;
