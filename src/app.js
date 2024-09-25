const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const { engine } = require("express-handlebars");

const app = express();
app.set("port", process.env.PORT || 3000);

// Configure view engine
app.set("views", __dirname + "/views");
app.engine(".hbs", engine({ extname: ".hbs" }));  // Configura Handlebars como motor de vistas
app.set("view engine", "hbs");


app.use(express.json());  // Middleware para parsear JSON en las solicitudes
app.use(express.urlencoded({ extended: true }));  // Middleware para parsear URL-encoded en las solicitudes
app.use(express.static(__dirname + '/public'));  // Middleware para servir archivos estáticos desde el directorio 'public'

// Database connection
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'aplicacion',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();  // Agregar .promise() para obtener un pool basado en promesas

// Session middleware
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));










// Render login form
app.get("/login", (req, res) => {
    if (req.session.loggedin) {
        res.redirect("/");  // Redirigir a la página principal si ya está autenticado
    } else {
        res.render("login/index.hbs", { error: null });  // Renderizar el formulario de inicio de sesión con un mensaje de error nulo
    }
});






// Handle login authentication
app.post("/auth", async (req, res) => {
    const data = req.body;

    try {
        const [userData] = await pool.query("SELECT * FROM user WHERE email = ? AND password = ?", [data.email, data.password]);

        if (userData.length > 0) {
            const user = userData[0];
            req.session.loggedin = true;  // Establecer sesión como autenticada
            req.session.name = user.name;  // Guardar nombre de usuario en la sesión
            req.session.roles = typeof user.roles === 'string' ? user.roles.split(',') : [];  // Guardar roles del usuario en la sesión

            res.redirect("/");  // Redirigir a la página principal después del inicio de sesión exitoso
        } else {
            // Renderizar página de inicio de sesión con mensaje de error
            res.render("login/index.hbs", { error: "Usuario no encontrado o contraseña incorrecta" });
        }
    } catch (err) {
        console.error("Error fetching user from database:", err);  // Manejar errores al recuperar datos del usuario desde la base de datos
        res.status(500).send("Internal Server Error");  // Enviar respuesta de error interno del servidor
    }
});





// Render register form
app.get("/register", (req, res) => {
    if (req.session.loggedin) {
        res.redirect("/");  // Redirigir a la página principal si ya está autenticado
    } else {
        res.render("login/register.hbs", { error: null });  // Renderizar el formulario de registro con mensaje de error nulo
    }
});






// Handle user registration
app.post("/storeUser", async (req, res) => {
    const data = req.body;

    try {
        // Verificar si el usuario ya existe
        const [userData] = await pool.query("SELECT * FROM user WHERE email = ?", [data.email]);

        if (userData.length > 0) {
            res.render("login/register.hbs", { error: "User with this email already exists" });  // Renderizar página de registro con mensaje de usuario ya existente
            return;
        }

        // Insertar nuevo usuario
        await pool.query("INSERT INTO user SET ?", data);
        console.log("User registered successfully");  // Registrar registro exitoso del usuario
        res.redirect("/");  // Redirigir a la página principal después del registro exitoso
    } catch (err) {
        console.error("Error handling user registration:", err);  // Manejar errores al manejar el registro del usuario
        res.status(500).send("Internal Server Error");  // Enviar respuesta de error interno del servidor
    }
});






// Handle logout
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);  // Manejar errores al destruir la sesión
            res.status(500).send("Internal Server Error");  // Enviar respuesta de error interno del servidor
        } else {
            res.redirect("/login");  // Redirigir a la página de inicio de sesión después de cerrar sesión
        }
    });
});






// Middleware to protect routes that require authentication
function requireLogin(req, res, next) {
    if (req.session.loggedin) {
        next();  // Pasar al siguiente middleware si está autenticado
    } else {
        res.redirect("/login");  // Redirigir a la página de inicio de sesión si no está autenticado
    }
}




const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid'); // Utiliza UUID para generar IDs únicos

// Configurar el transporter con nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nexus.innovationss@gmail.com', // Coloca tu correo electrónico
        pass: 'dhmtnkcehxzfwzbd' // Coloca tu contraseña de correo electrónico
    },
    messageId: uuidv4(), // Genera un Message-ID único para cada correo enviado
});

const crypto = require('crypto'); // Importa el módulo crypto







// Handle forgot password

// Handle forgot password
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    // Generar un token único y establecer la fecha de expiración
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiration = new Date();
    resetTokenExpiration.setHours(resetTokenExpiration.getHours() + 1); // Token válido por 1 hora

    try {
        // Actualizar el token de restablecimiento y la fecha de expiración en la base de datos
        const [result] = await pool.query("UPDATE user SET resetToken = ?, resetTokenExpiration = ? WHERE email = ?", [resetToken, resetTokenExpiration, email]);

        // Check if user with provided email exists
        if (result.affectedRows === 0) {
            res.render("login/index.hbs", { error: "Correo electrónico no encontrado" });
            return;
        }

        // Configuración del correo electrónico
        const mailOptions = {
            from: 'nexus.innovationss@gmail.com',
            to: email,
            subject: 'Recuperación de Contraseña',
            html: `
                <p>Hola,</p>
                <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                <a href="http://localhost:3000/reset-password?token=${resetToken}">Restablecer Contraseña</a>
                <p>Este enlace expirará en 1 hora.</p>
                <p>Si no solicitaste esto, por favor ignora este correo y tu contraseña permanecerá sin cambios.</p>
            `
        };

        // Enviar el correo electrónico
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                res.status(500).send("Error al enviar el correo electrónico");
            } else {
                console.log("Email sent:", info.response);
                res.render("login/index.hbs", { successMessage: "Se ha enviado un correo electrónico con instrucciones para restablecer la contraseña" });
            }
        });
    } catch (err) {
        console.error("Error updating reset token in database:", err);
        res.status(500).send("Internal Server Error");
    }
});




// Página para restablecer la contraseña (GET)
app.get("/reset-password", async (req, res) => {
    const token = req.query.token; // Obtiene el token de la consulta
    console.log("Token recibido en GET:", token);
  
    try {
        // Verificar si el token es válido y está dentro del tiempo de expiración adecuado
        const [results] = await pool.query(
            "SELECT * FROM user WHERE resetToken = ? AND resetTokenExpiration > NOW()",
            [token]
        );

        if (results.length === 0) {
            res.status(400).send("El token para restablecer la contraseña es inválido o ha expirado");
        } else {
            // Mostrar el formulario para restablecer la contraseña
            res.render("login/reset-password.hbs", { token });
        }
    } catch (err) {
        console.error("Error al verificar el token:", err);
        res.status(500).send("Error interno al verificar el token");
    }
});






// Página para restablecer la contraseña (GET)
app.get("/reset-password", async (req, res) => {
    const token = req.query.token; // Obtiene el token de la consulta
    console.log("Token recibido en GET:", token);
  
    try {
        // Verificar si el token es válido y está dentro del tiempo de expiración adecuado
        const [results] = await pool.query(
            "SELECT * FROM user WHERE resetToken = ? AND resetTokenExpiration > NOW()",
            [token]
        );

        if (results.length === 0) {
            res.status(400).send("El token para restablecer la contraseña es inválido o ha expirado");
        } else {
            // Mostrar el formulario para restablecer la contraseña
            res.render("login/reset-password.hbs", { token });
        }
    } catch (err) {
        console.error("Error al verificar el token:", err);
        res.status(500).send("Error interno al verificar el token");
    }
});





// Ruta para la página principal 
app.get("/", (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        console.log(`El usuario ${nombreUsuario} está autenticado.`);
        req.session.nombreGuardado = nombreUsuario; // Guarda el nombre en la sesión

        const rolesString = req.session.roles;
        const roles = Array.isArray(rolesString) ? rolesString : [];



        const jefe = roles.includes('jefe');
        const empleado = roles.includes('empleado');
 

        res.render("Menu_principal/home.hbs",{ name: req.session.name,jefe,empleado }); // Pasar los roles a la plantilla
    } else {
        res.redirect("/login");
    }
});








// Ruta para la página principal 
app.get("/operaciones", (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        console.log(`El usuario ${nombreUsuario} está autenticado.`);
        req.session.nombreGuardado = nombreUsuario; // Guarda el nombre en la sesión

        const rolesString = req.session.roles;
        const roles = Array.isArray(rolesString) ? rolesString : [];



        const jefe = roles.includes('jefe');
        const empleado = roles.includes('empleado');
 

        res.render("Operaciones/menu_operacines.hbs",{ name: req.session.name,jefe,empleado }); // Pasar los roles a la plantilla
    } else {
        res.redirect("/login");
    }
});




app.get('/agregar_edificio', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('Operaciones/ClientesEdificios/agregaredificio.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});







const multer = require('multer');







// Configuración de multer para manejar la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.post('/agregar-edificio', upload.single('foto'), async (req, res) => {
    const {
        fechaincio,
        nombre,
        nit,
        cedula_representante_legal,
        nombre_representante_legal,
        direccion,
        correorepresentante,
        telefono,
        miembro1,
        direccion1,
        correo1,
        telefono1,
        miembro2,
        direccion2,
        correo2,
        telefono2,
        miembro3,
        direccion3,
        correo3,
        telefono3
    } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ninguna foto' });
    }

    const foto = req.file.buffer; // La foto se almacena en el buffer

    const sql = `INSERT INTO edificios (
        fechaincio, nombre, nit, cedula_representante_legal, nombre_representante_legal,
        direccion, correorepresentante, telefono, 
        miembro1_nombre, miembro1_direccion, miembro1_correo, miembro1_telefono,
        miembro2_nombre, miembro2_direccion, miembro2_correo, miembro2_telefono,
        miembro3_nombre, miembro3_direccion, miembro3_correo, miembro3_telefono,
        foto
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        fechaincio, nombre, nit, cedula_representante_legal, nombre_representante_legal,
        direccion, correorepresentante, telefono, 
        miembro1, direccion1, correo1, telefono1,
        miembro2, direccion2, correo2, telefono2,
        miembro3, direccion3, correo3, telefono3,
        foto
    ];

    try {
        const [results] = await pool.query(sql, values);
        res.status(200).json({ message: 'Edificio agregado exitosamente' });
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Error al agregar el edificio' });
    }
});




// Ruta para agregar apartamentos
app.get('/agregar_apartamento', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        try {
            const [edificios] = await pool.query('SELECT id, nombre FROM edificios');
            res.render('Operaciones/apartementos/agregarapartamento.hbs', { nombreUsuario, edificios });
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            res.status(500).send('Error al obtener edificios');
        }
    } else {
        res.redirect('/login');
    }
});




// Ruta para obtener edificios
app.get('/api/edificios', async (req, res) => {
    if (req.session.loggedin === true) {
        try {
            const [rows] = await pool.query('SELECT id, nombre FROM edificios');
            res.json(rows);
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            res.status(500).send('Error al obtener edificios');
        }
    } else {
        res.redirect('/login');
    }
});



app.post('/agregar_apartamento', upload.single('foto'), async (req, res) => {
    const {
        numero,
        edificio,  // Este será el ID del edificio
        responsable,
        piso,
        celular,
        correo
    } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ninguna foto' });
    }

    const foto = req.file.buffer;

    const sql = `INSERT INTO apartamentos (
        numero, edificio_id, responsable, piso, celular, correo, foto
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        numero, edificio, responsable, piso, celular, correo, foto
    ];

    try {
        const [results] = await pool.query(sql, values);
        res.status(200).json({ message: 'Apartamento agregado exitosamente' });
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Error al agregar el apartamento' });
    }
});




app.get('/consultar_edificios', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        try {
            const [edificios] = await pool.query('SELECT * FROM edificios');

            // Convertir la foto BLOB a base64
            edificios.forEach(edificio => {
                if (edificio.foto) {
                    edificio.foto = Buffer.from(edificio.foto).toString('base64');
                }
            });

            res.render('Operaciones/ClientesEdificios/consultaredificios.hbs', { nombreUsuario, edificios });
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            res.status(500).send('Error al obtener edificios');
        }
    } else {
        res.redirect('/login');
    }
});



// Ruta para obtener los apartamentos
app.get('/getApartamentos', async (req, res) => {
    const edificioId = req.query.edificioId;
    if (!edificioId) {
        return res.status(400).send({ error: 'El ID del edificio es requerido' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM apartamentos WHERE edificio_id = ?', [edificioId]);
        res.json({ apartamentos: rows });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los apartamentos' });
    }
});



// Ruta
// Ruta para consultar apartamentos
app.get('/Consulta_apartamentos', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('Operaciones/apartementos/consulta_apartamentos', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});

// Ruta para obtener los edificios
app.get('/getEdificios', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM edificios');
        res.json({ edificios: rows });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los edificios' });
    }
});

// Ruta para obtener los apartamentos por edificio
app.get('/getApartamentos', async (req, res) => {
    const edificioId = req.query.edificioId;
    if (!edificioId) {
        return res.status(400).send({ error: 'El ID del edificio es requerido' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM apartamentos WHERE edificio_id = ?', [edificioId]);
        res.json({ apartamentos: rows });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los apartamentos' });
    }
});

// Ruta para obtener los detalles de un apartamento
app.get('/getApartamentoDetalles', async (req, res) => {
    const apartamentoId = req.query.apartamentoId;
    if (!apartamentoId) {
        return res.status(400).send({ error: 'El ID del apartamento es requerido' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM apartamentos WHERE id = ?', [apartamentoId]);
        const apartamento = rows[0];

        if (apartamento && apartamento.foto) {
            apartamento.foto = apartamento.foto.toString('base64');
        }

        res.json({ apartamento });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los detalles del apartamento' });
    }
});



app.get('/editar_apartamento', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        const apartamentoId = req.query.apartamentoId;

        if (!apartamentoId) {
            return res.status(400).send('El ID del apartamento es requerido');
        }

        try {
            const [rows] = await pool.query('SELECT * FROM apartamentos WHERE id = ?', [apartamentoId]);
            const apartamento = rows[0];

            if (apartamento && apartamento.foto) {
                apartamento.foto = apartamento.foto.toString('base64');
            }

            res.render('Operaciones/apartementos/editar_apartamentos', { nombreUsuario, apartamento });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al obtener los detalles del apartamento');
        }
    } else {
        res.redirect('/login');
    }
});



app.post('/update_apartamento', async (req, res) => {
    if (req.session.loggedin === true) {
        const { id, numero, piso, responsable, celular, correo } = req.body;

        try {
            await pool.query(
                'UPDATE apartamentos SET numero = ?, piso = ?, responsable = ?, celular = ?, correo = ? WHERE id = ?',
                [numero, piso, responsable, celular, correo, id]
            );
            res.redirect(`/Consulta_apartamentos`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar los detalles del apartamento');
        }
    } else {
        res.redirect('/login');
    }
});



app.get('/editar_edificio', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        const edificioId = req.query.edificioId;

        if (!edificioId) {
            return res.status(400).send('El ID del edificio es requerido');
        }

        try {
            const [rows] = await pool.query('SELECT * FROM edificios WHERE id = ?', [edificioId]);
            const edificio = rows[0];

            // Convertir la fecha a formato 'YYYY-MM-DD' si es necesario
            if (edificio && edificio.fechaincio) {
                // Asegúrate de que la fecha esté en formato YYYY-MM-DD
                edificio.fechaincio = new Date(edificio.fechaincio).toISOString().split('T')[0];
            }

            if (edificio && edificio.foto) {
                edificio.foto = edificio.foto.toString('base64');
            }

            res.render('Operaciones/ClientesEdificios/editar_edificios.hbs', { nombreUsuario, edificio });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al obtener los detalles del edificio');
        }
    } else {
        res.redirect('/login');
    }
});



app.post('/update_edificio', async (req, res) => {
    if (req.session.loggedin === true) {
        const { id, nombre, fechaincio, nombre_representante_legal, nit, cedula_representante_legal, direccion, correorepresentante, telefono } = req.body;

        try {
            await pool.query(
                'UPDATE edificios SET nombre = ?, fechaincio = ?, nombre_representante_legal = ?, nit = ?, cedula_representante_legal = ?, direccion = ?, correorepresentante = ?, telefono = ? WHERE id = ?',
                [nombre, fechaincio, nombre_representante_legal, nit, cedula_representante_legal, direccion, correorepresentante, telefono, id]
            );
            res.redirect(`/consultar_edificios`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar los detalles del edificio');
        }
    } else {
        res.redirect('/login');
    }
});



app.get('/editar_miembros_consejo', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        const edificioId = req.query.edificioId;

        if (!edificioId) {
            return res.status(400).send('El ID del edificio es requerido');
        }

        try {
            const [rows] = await pool.query('SELECT * FROM edificios WHERE id = ?', [edificioId]);
            const edificio = rows[0];

            res.render('Operaciones/ClientesEdificios/editar_miembros_consejo.hbs', { nombreUsuario, edificio });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al obtener los detalles del edificio');
        }
    } else {
        res.redirect('/login');
    }
});


app.post('/update_miembros_consejo', async (req, res) => {
    if (req.session.loggedin === true) {
        const {
            id, miembro1_nombre, miembro1_direccion, miembro1_correo, miembro1_telefono,
            miembro2_nombre, miembro2_direccion, miembro2_correo, miembro2_telefono,
            miembro3_nombre, miembro3_direccion, miembro3_correo, miembro3_telefono
        } = req.body;

        try {
            await pool.query(
                `UPDATE edificios SET miembro1_nombre = ?, miembro1_direccion = ?, miembro1_correo = ?, 
                miembro1_telefono = ?, miembro2_nombre = ?, miembro2_direccion = ?, miembro2_correo = ?, 
                miembro2_telefono = ?, miembro3_nombre = ?, miembro3_direccion = ?, miembro3_correo = ?, 
                miembro3_telefono = ? WHERE id = ?`,
                [miembro1_nombre, miembro1_direccion, miembro1_correo, miembro1_telefono,
                miembro2_nombre, miembro2_direccion, miembro2_correo, miembro2_telefono,
                miembro3_nombre, miembro3_direccion, miembro3_correo, miembro3_telefono, id]
            );
            res.redirect(`/consultar_edificios`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar los detalles del edificio');
        }
    } else {
        res.redirect('/login');
    }
});











//
// Ruta para mostrar la lista de edificios
app.get('/ComunicadosGeneral', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        const query = 'SELECT * FROM edificios';

        try {
            const [results] = await pool.query(query);
            res.render('Operaciones/comunicadoGeneral/nuevocomunicadoGeneral.hbs', { 
                nombreUsuario,
                edificios: results 
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error al obtener los edificios');
        }
    } else {
        res.redirect('/login');
    }
});








// Ruta para enviar el comunicado
app.post('/enviarComunicado', upload.array('archivos'), async (req, res) => {
    let { edificiosSeleccionados, mensaje } = req.body;
    let archivos = req.files;

    if (edificiosSeleccionados.includes('all')) {
        const queryAll = 'SELECT id FROM edificios';
        try {
            const [resultsAll] = await pool.query(queryAll);
            edificiosSeleccionados = resultsAll.map(row => row.id);
        } catch (err) {
            console.error(err);
            return res.status(500).send('Error al obtener todos los edificios');
        }
    }

    const query = `
        SELECT correo 
        FROM apartamentos 
        WHERE edificio_id IN (?)
    `;

    try {
        const [results] = await pool.query(query, [edificiosSeleccionados]);
        const correos = results.map(row => row.correo);

        // Generar un identificador único para el asunto
        const uniqueId = new Date().toISOString();

        // Configuración de nodemailer
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'nexus.innovationss@gmail.com', // tu correo electrónico
                pass: 'bqffoqklqfrlvxyt' // tu contraseña de aplicación
            }
        });

        // Construir lista de adjuntos
        let attachments = archivos.map(file => ({
            filename: file.originalname,
            content: file.buffer,
            cid: file.originalname.split('.')[0] // usar el nombre del archivo sin extensión como cid
        }));

        // Opciones del correo
        let mailOptions = {
            from: '"nexus" <nexus.innovationss@gmail.com>', // dirección del remitente
            to: correos.join(','), // lista de destinatarios
            subject: `Comunicado General - ${uniqueId}`, // asunto con identificador único
            text: mensaje, // cuerpo del texto plano
            html: `
                <h1>Comunicado Importante</h1>
                <p>${mensaje}</p>
                ${attachments.map(att => `<img src="cid:${att.cid}"/>`).join('')}
            `, // cuerpo del html
            attachments: attachments
        };

        // Enviar el correo
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error al enviar el comunicado');
            }
            console.log('Message sent: %s', info.messageId);
            res.send('Comunicado enviado correctamente.');
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error al enviar el comunicado');
    }
});













// Ruta para obtener los edificios y renderizar la vista
app.get('/envio_apartamentos', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        try {
            const [results] = await pool.query('SELECT * FROM edificios');
            res.render('Operaciones/comunicadoApartmamentos/comunicado_individual.hbs', { 
                nombreUsuario,
                edificios: results
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error al obtener los edificios');
        }
    } else {
        res.redirect('/login');
    }
});

// Ruta para obtener los apartamentos de los edificios seleccionados
app.post('/getApartamentos', async (req, res) => {
    const { edificiosSeleccionados } = req.body;
    const query = `
        SELECT * 
        FROM apartamentos 
        WHERE edificio_id IN (?)
    `;
    try {
        const [results] = await pool.query(query, [edificiosSeleccionados]);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los apartamentos');
    }
});

// Ruta para enviar el comunicado
app.post('/enviarComunicado', upload.array('archivos'), async (req, res) => {
    const { apartamentosSeleccionados, mensaje } = req.body;
    let archivos = req.files;

    const query = `
        SELECT correo 
        FROM apartamentos 
        WHERE id IN (?)
    `;

    try {
        const [results] = await pool.query(query, [apartamentosSeleccionados]);
        const correos = results.map(row => row.correo);

        // Generar un identificador único para el asunto
        const uniqueId = new Date().toISOString();

        // Configuración de nodemailer
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'nexus.innovationss@gmail.com', // tu correo electrónico
                pass: 'bqffoqklqfrlvxyt' // tu contraseña de aplicación
            }
        });

        // Construir lista de adjuntos
        let attachments = archivos.map(file => ({
            filename: file.originalname,
            content: file.buffer,
            cid: file.originalname.split('.')[0] // usar el nombre del archivo sin extensión como cid
        }));

        // Opciones del correo
        let mailOptions = {
            from: '"nexus" <nexus.innovationss@gmail.com>', // dirección del remitente
            to: correos.join(','), // lista de destinatarios
            subject: `Comunicado General - ${uniqueId}`, // asunto con identificador único
            text: mensaje, // cuerpo del texto plano
            html: `
                <h1>Comunicado Importante</h1>
                <p>${mensaje}</p>
                ${attachments.map(att => `<img src="cid:${att.cid}"/>`).join('')}
            `, // cuerpo del html
            attachments: attachments
        };

        // Enviar el correo
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error al enviar el comunicado');
            }
            console.log('Message sent: %s', info.messageId);
            res.send('Comunicado enviado correctamente.');
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error al enviar el comunicado');
    }
});



// Ruta para la página principal 
app.get("/menuContablidad", (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        console.log(`El usuario ${nombreUsuario} está autenticado.`);
        req.session.nombreGuardado = nombreUsuario; // Guarda el nombre en la sesión

        const rolesString = req.session.roles;
        const roles = Array.isArray(rolesString) ? rolesString : [];



        const jefe = roles.includes('jefe');
        const empleado = roles.includes('empleado');
 

        res.render("CONTABILIDAD/menucontabilidad.hbs",{ name: req.session.name,jefe,empleado }); // Pasar los roles a la plantilla
    } else {
        res.redirect("/login");
    }
});











// Ruta para obtener los edificios y renderizar la vista
app.get('/validar_pagos', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        try {
            const [results] = await pool.query('SELECT * FROM edificios');
            res.render('CONTABILIDAD/validarPagos/validarpagos.hbs', { 
                nombreUsuario,
                edificios: results
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error al obtener los edificios');
        }
    } else {
        res.redirect('/login');
    }
});


app.post('/getApartamentosss', async (req, res) => {
    const { edificioSeleccionado } = req.body;
    console.log("Edificio seleccionado:", edificioSeleccionado); // Verifica el valor del edificio seleccionado

    const query = `
        SELECT a.id, a.numero, e.nombre AS nombre_edificio
        FROM apartamentos a
        JOIN edificios e ON a.edificio_id = e.id
        WHERE a.edificio_id = ?
    `;
    try {
        const [results] = await pool.query(query, [edificioSeleccionado]);
        console.log("Apartamentos encontrados:", results); // Verifica los resultados de la consulta
        res.json(results); // Envía los resultados como JSON
    } catch (err) {
        console.error('Error al obtener los apartamentos:', err);
        res.status(500).send('Error al obtener los apartamentos');
    }
});




// Ruta para validar el pago del apartamento con documento de pago
app.post('/validarPago', upload.single('documento_pago'), async (req, res) => {
    const { apartamentoSeleccionado, fecha_pago, valor_pago } = req.body;
    const documentoPago = req.file; // El archivo subido
    
    // Verificar que se haya subido un archivo
    if (!documentoPago) {
        return res.status(400).send('Debe subir un documento de pago.');
    }

    // Convertir el archivo a BLOB para almacenarlo en la base de datos
    const documentoBuffer = documentoPago.buffer;

    // Consulta para verificar si el pago ya existe
    const querySelect = `
        SELECT * 
        FROM pagos_apartamentos 
        WHERE apartamento_id = ? AND fecha_pago = ?
    `;
    // Consulta para insertar el nuevo pago, incluyendo nombre de edificio y número de apartamento
    const queryInsert = `
        INSERT INTO pagos_apartamentos (apartamento_id, nombre_edificio, numero_apartamento, fecha_pago, valor_pago, documento_pago, estado)
        VALUES (?, ?, ?, ?, ?, ?, 'Pagado')
    `;
    // Consulta para obtener los detalles del apartamento seleccionado
    const queryApartamentoDetalles = `
        SELECT a.id AS apartamento_id, a.numero AS numero_apartamento, e.nombre AS nombre_edificio
        FROM apartamentos a
        JOIN edificios e ON a.edificio_id = e.id
        WHERE a.id = ?
    `;

    try {
        // Verificar si ya existe un pago para el apartamento y fecha especificada
        const [results] = await pool.query(querySelect, [apartamentoSeleccionado, fecha_pago]);
        if (results.length > 0) {
            return res.status(400).send('Ya existe un pago registrado para esta fecha.');
        } else {
            // Obtener los detalles del apartamento seleccionado
            const [apartamentoDetalles] = await pool.query(queryApartamentoDetalles, [apartamentoSeleccionado]);
            if (apartamentoDetalles.length > 0) {
                const { nombre_edificio, numero_apartamento } = apartamentoDetalles[0];

                // Insertar el pago en la base de datos con nombre de edificio y número de apartamento
                await pool.query(queryInsert, [apartamentoSeleccionado, nombre_edificio, numero_apartamento, fecha_pago, valor_pago, documentoBuffer]);

                // Consulta para obtener el correo electrónico del apartamento seleccionado
                const queryCorreo = `
                    SELECT correo 
                    FROM apartamentos 
                    WHERE id = ?
                `;
                const [correoResults] = await pool.query(queryCorreo, [apartamentoSeleccionado]);
                if (correoResults.length > 0) {
                    const correoDestinatario = correoResults[0].correo;
                    
                    // Configuración del mensaje de correo
                    const mailOptions = {
                        from: 'nexus.innovationss@gmail.com', // Reemplaza con tu correo
                        to: correoDestinatario,
                        subject: 'Confirmación de Pago - Cerceta',
                        text: `Estimado propietario,

Hemos recibido su pago correspondiente al edificio ${nombre_edificio}, apartamento ${numero_apartamento}. Agradecemos su cumplimiento y esperamos seguir brindándole un excelente servicio.

Atentamente,
Cerceta`
                    };

                    // Enviar el correo
                    transporter.sendMail(mailOptions, function(error, info) {
                        if (error) {
                            console.error('Error al enviar el correo:', error);
                            return res.status(500).send('Pago registrado, pero no se pudo enviar el correo de confirmación.');
                        } else {
                            console.log('Correo enviado: ' + info.response);
                            return res.send('Pago validado correctamente y correo de confirmación enviado.');
                        }
                    });
                } else {
                    return res.status(404).send('Pago validado, pero no se encontró un correo asociado al apartamento.');
                }
            } else {
                return res.status(404).send('No se encontró el apartamento seleccionado.');
            }
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error al validar el pago');
    }
});




// Start server
app.listen(app.get("port"), () => {
    console.log("Server listening on port ", app.get("port"));  // Iniciar el servidor y escuchar en el puerto especificado
});
