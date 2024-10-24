const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const pool = require('./db'); // Importamos la configuración de la base de datos
const path = require('path');

const app = express();

// Configurar la sesión
app.use(session({
    secret: 'mysecret',  // Cambia este secreto
    resave: false,
    saveUninitialized: true
}));

// Configurar el motor de plantillas
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));  // Asegúrate de que apunte correctamente a tu carpeta de vistas
app.use(express.static(__dirname + '/public'));

// Middleware para parsing
app.use(express.urlencoded({ extended: false }));


// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.render('login/login');
});

// Asegúrate de que Express pueda manejar datos en formato JSON
app.use(express.json());


// Ruta para manejar el login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query to check if user exists with the given email and password
        const [results] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);

        if (results.length > 0) {
            // Store user data in session
            req.session.user = results[0];  // Store the entire user object
            req.session.name = results[0].nombre;  // Save the user name to session
            req.session.loggedin = true;  // Set logged-in status
            req.session.roles = results[0].role;  // Save roles in session

            const role = results[0].role;  // Fetch user role

            // Redirect based on the user's role
            if (role === 'admin') {
                return res.redirect('/menuAdministrativo');
            } else if (role === 'tecnico') {
                return res.redirect('/tecnico');
            } else if (role === 'cliente') {
                return res.redirect('/cliente');
            }
        } else {
            // Render login page with error message if credentials are incorrect
            res.render('login/login', { error: 'Correo o contraseña incorrectos' });
        }
    } catch (err) {
        // Handle errors and send a 500 response in case of any database or server issues
        res.status(500).json({ error: err.message });
    }
});



// Ruta para el menú administrativo
app.get('/geolocalizacion', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.user.name; // Use user session data
        res.render('administrativo/mapa/ver_mapa.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});



// Ruta para el menú administrativo
app.get('/figma', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.user.name; // Use user session data
        res.render('administrativo/figma.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});







// Ruta para manejar el cierre de sesión
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.redirect('/login');  // Redirige al usuario a la página de login
    });
});






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





app.get("/menuAdministrativo", async (req, res) => {
    if (req.session.loggedin === true) {
        try {
            const nombreUsuario = req.session.name || req.session.user.name; // Usa el nombre de la sesión o una alternativa
            console.log(`El usuario ${nombreUsuario} está autenticado.`);
            req.session.nombreGuardado = nombreUsuario; // Guarda el nombre en la sesión

            const rolesString = req.session.roles;
            const roles = Array.isArray(rolesString) ? rolesString : [];

            const jefe = roles.includes('jefe');
            const empleado = roles.includes('empleado');

            // Realiza la consulta a la base de datos para contar la cantidad de apartamentos
            const [apartamentosRows] = await pool.query('SELECT COUNT(*) AS totalApartamentos FROM apartamentos');
            const totalApartamentos = apartamentosRows[0].totalApartamentos;

            // Realiza la consulta a la base de datos para contar la cantidad de edificios
            const [edificiosRows] = await pool.query('SELECT COUNT(*) AS totaledificios FROM edificios');
            const totaledificios = edificiosRows[0].totaledificios;

            // Renderiza la vista y pasa los datos necesarios
            res.render("administrativo/menuadministrativo.hbs", {
                layout: 'layouts/nav_admin.hbs', // Especifica el layout a usar
                name: nombreUsuario,
                jefe,
                empleado,
                totalApartamentos,
                totaledificios // Pasa el valor a la vista
            });
        } catch (error) {
            console.error('Error al obtener el conteo de apartamentos:', error);
            res.status(500).send('Error al cargar el menú administrativo');
        }
    } else {
        res.redirect("/login");
    }
});



app.get('/agregar_edificio', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('administrativo/Operaciones/ClientesEdificios/agregaredificio.hbs', { nombreUsuario });
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
            res.render('administrativo/Operaciones/apartementos/agregarapartamento.hbs', { nombreUsuario, edificios });
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

            res.render('administrativo/Operaciones/ClientesEdificios/consultaredificios.hbs', { nombreUsuario, edificios });
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            res.status(500).send('Error al obtener edificios');
        }
    } else {
        res.redirect('/login');
    }
});
app.post('/getApartamentos_envio', async (req, res) => {
    const { edificiosSeleccionados } = req.body;

    console.log('Edificios seleccionados:', edificiosSeleccionados); // Verifica que los datos lleguen bien

    if (!edificiosSeleccionados || edificiosSeleccionados.length === 0) {
        return res.status(400).send({ error: 'No se seleccionaron edificios' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM apartamentos WHERE edificio_id IN (?)', [edificiosSeleccionados]);
        console.log('Apartamentos:', rows); // Verifica que los apartamentos se obtienen correctamente
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Error al obtener los apartamentos' });
    }
});






// Ruta para consultar apartamentos
app.get('/Consulta_apartamentos', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('administrativo/Operaciones/apartementos/consulta_apartamentos', { nombreUsuario });
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

            res.render('administrativo/Operaciones/apartementos/editar_apartamentos', { nombreUsuario, apartamento });
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

            res.render('administrativo/Operaciones/ClientesEdificios/editar_edificios.hbs', { nombreUsuario, edificio });
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

            res.render('administrativo/Operaciones/ClientesEdificios/editar_miembros_consejo.hbs', { nombreUsuario, edificio });
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
            res.render('administrativo/Operaciones/comunicadoGeneral/nuevocomunicadoGeneral.hbs', { 
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
            res.render('administrativo/Operaciones/comunicadoApartmamentos/comunicado_individual.hbs', { 
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
app.post('/enviarComunicado_individual', upload.array('archivos'), async (req, res) => {
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
            subject: `Comunicado individual - ${uniqueId}`, // asunto con identificador único
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
app.get('/validar_pagos', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        try {
            const [results] = await pool.query('SELECT * FROM edificios');
            res.render('administrativo/CONTABILIDAD/validarPagos/validarpagos.hbs', { 
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







app.get('/Consulta_Comprobantes_de_Pago', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('administrativo/CONTABILIDAD/validarPagos/consultar_pagos.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});



 


app.post('/obtener_pagos', (req, res) => {
    const { fechaInicio, fechaFin } = req.body;

    // Si los valores de fecha están vacíos, los reemplazamos con fechas extremas
    const fechaInicioFiltro = fechaInicio || '1900-01-01';
    const fechaFinFiltro = fechaFin || '2100-12-31';

    // Consulta SQL para filtrar por rango de fechas en `fecha_pago`
    const query = `
        SELECT 
            id, fecha_pago, valor_pago, nombre_edificio, numero_apartamento, estado
        FROM 
            pagos_apartamentos
        WHERE 
            fecha_pago BETWEEN ? AND ?`;

    // Parámetros de la consulta: rango de fechas
    const params = [fechaInicioFiltro, fechaFinFiltro];

    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Error al consultar pagos:', err);
            res.status(500).json({ message: 'Error al consultar pagos' });
        } else {
            console.log('Resultados:', results); // Mostrar resultados en consola
            res.json(results);
        }
    });
});





// Ruta para descargar el comprobante de pago
app.get('/descargar_comprobante/:id', (req, res) => {
    const { id } = req.params;

    const query = `SELECT documento_pago FROM pagos_apartamentos WHERE id = ?`;
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener el comprobante:', err);
            res.status(500).json({ message: 'Error al obtener el comprobante' });
        } else {
            if (results.length > 0 && results[0].documento_pago) {
                res.setHeader('Content-Disposition', `attachment; filename=comprobante_${id}.pdf`);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(results[0].documento_pago);
            } else {
                res.status(404).json({ message: 'Comprobante no encontrado' });
            }
        }
    });
});

app.get('/api/edificios-count', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT COUNT(*) AS count FROM edificios');  // No necesitas .promise() aquí
        const count = results[0].count;
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el conteo de edificios' });
    }
});


app.get('/api/apartamentos-count', async (req, res) => {
    try {
        const [results] = await pool.query('SELECT COUNT(*) AS count FROM apartamentos');  // No necesitas .promise() aquí
        const count = results[0].count;
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el conteo de edificios' });
    }
});







app.get('/agregar_usuarios', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('administrativo/usuarios/crear_usuarios.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});




app.get('/plantilla_blog', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('blog/plantilla_simple.hbs', { nombreUsuario });
    } else {
        res.redirect('/login');
    }
});

app.get('/subir_publicacion', async (req, res) => {
    if (req.session.loggedin === true) {
        try {
            const [edificios] = await pool.query('SELECT id, nombre FROM edificios');
            const nombreUsuario = req.session.name;
            res.render('blog/agregar_blog.hbs', { nombreUsuario, edificios });
        } catch (error) {
            console.error('Error al obtener los edificios:', error);
            res.status(500).send('Error interno del servidor');
        }
    } else {
        res.redirect('/login');
    }
});








// Servir las imágenes desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));












app.post('/guardar-blog', (req, res) => {
    const { blogContent, imageIds } = req.body;  // Suponiendo que envías el contenido del blog y los IDs de las imágenes

    // Guardar las imágenes desde memoria a disco (o base de datos)
    imageIds.forEach(id => {
        const file = temporaryFiles[id];
        if (file) {
            // Aquí puedes guardar el archivo en disco
            const filePath = `uploads/${file.originalname}`;
            require('fs').writeFileSync(filePath, file.buffer);

            // O puedes guardarlo en la base de datos como BLOB
            // db.query('INSERT INTO images (data, mimetype) VALUES (?, ?)', [file.buffer, file.mimetype]);
        }
    });

    // Limpiar los archivos temporales de la memoria
    imageIds.forEach(id => delete temporaryFiles[id]);

    // Guardar el contenido del blog en la base de datos
    // db.query('INSERT INTO blogs (content) VALUES (?)', [blogContent]);

    res.status(200).json({ message: 'Blog guardado con éxito' });
});



app.post('/subir_publicacion', upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
    { name: 'word', maxCount: 1 },
    { name: 'excel', maxCount: 1 }
]), async (req, res) => {
    if (req.session.loggedin === true) {
        const { edificio, titulo, fecha, descripcion } = req.body;
        const archivos = req.files;

        // Variables para almacenar los datos de los archivos
        let imagen = null, imagenMime = null;
        let pdf = null, pdfMime = null;
        let word = null, wordMime = null;
        let excel = null, excelMime = null;

        // Asignar valores si los archivos han sido subidos
        if (archivos.imagen) {
            imagen = archivos.imagen[0].buffer;
            imagenMime = archivos.imagen[0].mimetype;
        }
        if (archivos.pdf) {
            pdf = archivos.pdf[0].buffer;
            pdfMime = archivos.pdf[0].mimetype;
        }
        if (archivos.word) {
            word = archivos.word[0].buffer;
            wordMime = archivos.word[0].mimetype;
        }
        if (archivos.excel) {
            excel = archivos.excel[0].buffer;
            excelMime = archivos.excel[0].mimetype;
        }

        try {
            // Insertar la publicación en la base de datos
            const query = `
                INSERT INTO publicaciones (
                    edificio_id, titulo, fecha, descripcion, 
                    imagen, imagen_mime, 
                    pdf, pdf_mime, 
                    word, word_mime, 
                    excel, excel_mime
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await pool.query(query, [
                edificio, titulo, fecha, descripcion,
                imagen, imagenMime,
                pdf, pdfMime,
                word, wordMime,
                excel, excelMime
            ]);

            res.status(200).send('Publicación subida con éxito');
        } catch (error) {
            console.error('Error al guardar la publicación:', error);
            res.status(500).send('Error interno del servidor');
        }
    } else {
        res.redirect('/login');
    }
});



// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
