const express = require('express');
const session = require('express-session');
const hbs = require('hbs');
const pool = require('./db'); // Importamos la configuración de la base de datos
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const cron = require('node-cron');

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



hbs.registerHelper('formatDate', (date) => {
    return moment(date).format('DD/MM/YYYY');
});







// Ruta para manejar el login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Consulta para verificar si el usuario existe con el correo y contraseña dados
        const [results] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);

        if (results.length > 0) {
            // Almacena los datos del usuario en la sesión
            req.session.user = results[0];  // Almacena el objeto completo del usuario
            req.session.userId = results[0].id; // Guarda el `userId` en la sesión correctamente
            req.session.name = results[0].nombre;  // Guarda el nombre del usuario en la sesión
            req.session.loggedin = true;  // Establece el estado de sesión como conectado
            req.session.roles = results[0].role;  // Guarda los roles en la sesión
            req.session.cargo = results[0].cargo; // Almacena el cargo en la sesión

            const role = results[0].role;  // Obtiene el rol del usuario

            // Redirige basado en el rol del usuario
            if (role === 'admin') {
                return res.redirect('/menuAdministrativo');
            } else if (role === 'tecnico') {
                return res.redirect('/tecnico');
            } else if (role === 'residentes') {
                return res.redirect('/Residentes/home_residentes.hbs');
            }
        } else {
            // Muestra la página de login con mensaje de error si las credenciales son incorrectas
            res.render('login/login', { error: 'Correo o contraseña incorrectos' });
        }
    } catch (err) {
        // Maneja los errores y envía una respuesta 500 en caso de problemas con la base de datos o el servidor
        res.status(500).json({ error: err.message });
    }
});



// Ruta para el menú administrativo
app.get('/geolocalizacion', (req, res) => {
    if (req.session.loggedin === true) {
        const userId = req.session.userId;

        const nombreUsuario = req.session.user.name; // Use user session data
        res.render('administrativo/mapa/ver_mapa.hbs', { nombreUsuario ,userId });
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
            const userId = req.session.userId;

            const nombreUsuario = req.session.name || req.session.user.name;
            console.log(`El usuario ${nombreUsuario} está autenticado.`);
            req.session.nombreGuardado = nombreUsuario;

            // Obtén el cargo del usuario desde la sesión y conviértelo en un array
            const cargos = req.session.cargo.split(',').map(cargo => cargo.trim());
            console.log(`Cargos del usuario: ${cargos}`);

            // Define las variables de cargo en función de si están en el array
            const esGerente = cargos.includes('Gerente');
            const esAdministracionOperativa = cargos.includes('administracion_operativa');
            const esContabilidad = cargos.includes('contabilidad');
            const esOperativo = cargos.includes('operativo');

            // Muestra en consola para verificar que los valores son correctos
            console.log({ esGerente, esAdministracionOperativa, esContabilidad, esOperativo });

            // Realiza la consulta a la base de datos para contar los residentes con rol "clientes"
            const [clientesRows] = await pool.query('SELECT COUNT(*) AS totalClientes FROM user WHERE roles = "clientes"');
            const totalClientes = clientesRows[0].totalClientes;

            // Realiza la consulta a la base de datos para contar la cantidad de apartamentos
            const [apartamentosRows] = await pool.query('SELECT COUNT(*) AS totalApartamentos FROM apartamentos');
            const totalApartamentos = apartamentosRows[0].totalApartamentos;

            // Realiza la consulta a la base de datos para contar la cantidad de edificios
            const [edificiosRows] = await pool.query('SELECT COUNT(*) AS totaledificios FROM edificios');
            const totaledificios = edificiosRows[0].totaledificios;

            // Renderiza la vista y pasa los datos necesarios
            res.render("administrativo/menuadministrativo.hbs", {
                layout: 'layouts/nav_admin.hbs',
                name: nombreUsuario,
                esGerente,
                esAdministracionOperativa,
                esContabilidad,
                esOperativo,
                userId ,
                totalClientes,
                totalApartamentos,
                totaledificios
            });
        } catch (error) {
            console.error('Error al obtener el conteo de datos:', error);
            res.status(500).send('Error al cargar el menú administrativo');
        }
    } else {
        res.redirect("/login");
    }
});




app.get('/agregar_edificio', (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        const userId = req.session.userId;

        res.render('administrativo/Operaciones/ClientesEdificios/agregaredificio.hbs', { name,userId ,layout: 'layouts/nav_admin.hbs' });
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
        telefono3,
        miembro_comite1_nombre,
        miembro_comite1_cedula,
        miembro_comite1_celular,
        miembro_comite1_correo,
        miembro_comite2_nombre,
        miembro_comite2_cedula,
        miembro_comite2_celular,
        miembro_comite2_correo,
        miembro_comite3_nombre,
        miembro_comite3_cedula,
        miembro_comite3_celular,
        miembro_comite3_correo
    } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ninguna foto' });
    }

    const foto = req.file.buffer;

    const sql = `INSERT INTO edificios (
        fechaincio, nombre, nit, cedula_representante_legal, nombre_representante_legal,
        direccion, correorepresentante, telefono, 
        miembro1_nombre, miembro1_direccion, miembro1_correo, miembro1_telefono,
        miembro2_nombre, miembro2_direccion, miembro2_correo, miembro2_telefono,
        miembro3_nombre, miembro3_direccion, miembro3_correo, miembro3_telefono,
        miembro_comite1_nombre, miembro_comite1_cedula, miembro_comite1_celular, miembro_comite1_correo,
        miembro_comite2_nombre, miembro_comite2_cedula, miembro_comite2_celular, miembro_comite2_correo,
        miembro_comite3_nombre, miembro_comite3_cedula, miembro_comite3_celular, miembro_comite3_correo,
        foto
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        fechaincio, nombre, nit, cedula_representante_legal, nombre_representante_legal,
        direccion, correorepresentante, telefono, 
        miembro1, direccion1, correo1, telefono1,
        miembro2, direccion2, correo2, telefono2,
        miembro3, direccion3, correo3, telefono3,
        miembro_comite1_nombre, miembro_comite1_cedula, miembro_comite1_celular, miembro_comite1_correo,
        miembro_comite2_nombre, miembro_comite2_cedula, miembro_comite2_celular, miembro_comite2_correo,
        miembro_comite3_nombre, miembro_comite3_cedula, miembro_comite3_celular, miembro_comite3_correo,
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
        const name = req.session.name;
        const userId = req.session.userId;

        try {
            const [edificios] = await pool.query('SELECT id, nombre FROM edificios');
            res.render('administrativo/Operaciones/apartementos/agregarapartamento.hbs', { name, edificios,userId  ,layout: 'layouts/nav_admin.hbs'});
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
        const userId = req.session.userId;

        const nombreUsuario = req.session.name;
        try {
            const [edificios] = await pool.query('SELECT * FROM edificios');

            // Convertir la foto BLOB a base64
            edificios.forEach(edificio => {
                if (edificio.foto) {
                    edificio.foto = Buffer.from(edificio.foto).toString('base64');
                }
            });

            res.render('administrativo/Operaciones/ClientesEdificios/consultaredificios.hbs', { nombreUsuario, edificios,userId ,layout: 'layouts/nav_admin.hbs' });
        } catch (error) {
            console.error('Error al obtener edificios:', error);
            res.status(500).send('Error al obtener edificios');
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/editar_miembros_comite', async (req, res) => {
    const edificioId = req.query.edificioId;

    try {
        const [edificio] = await pool.query('SELECT * FROM edificios WHERE id = ?', [edificioId]);
        if (edificio.length > 0) {
            res.render('administrativo/Operaciones/ClientesEdificios/editar_miembros_comite.hbs', { edificio: edificio[0],layout: 'layouts/nav_admin.hbs' });
        } else {
            res.status(404).send('Edificio no encontrado');
        }
    } catch (error) {
        console.error('Error fetching building:', error);
        res.status(500).send('Error al obtener los detalles del edificio');
    }
});

app.post('/guardar_miembros_comite', async (req, res) => {
    const {
        edificioId,
        miembro_comite1_nombre,
        miembro_comite1_cedula,
        miembro_comite1_celular,
        miembro_comite1_correo,
        miembro_comite2_nombre,
        miembro_comite2_cedula,
        miembro_comite2_celular,
        miembro_comite2_correo,
        miembro_comite3_nombre,
        miembro_comite3_cedula,
        miembro_comite3_celular,
        miembro_comite3_correo
    } = req.body;

    const sql = `
        UPDATE edificios SET 
            miembro_comite1_nombre = ?, miembro_comite1_cedula = ?, miembro_comite1_celular = ?, miembro_comite1_correo = ?,
            miembro_comite2_nombre = ?, miembro_comite2_cedula = ?, miembro_comite2_celular = ?, miembro_comite2_correo = ?,
            miembro_comite3_nombre = ?, miembro_comite3_cedula = ?, miembro_comite3_celular = ?, miembro_comite3_correo = ?
        WHERE id = ?`;

    const values = [
        miembro_comite1_nombre, miembro_comite1_cedula, miembro_comite1_celular, miembro_comite1_correo,
        miembro_comite2_nombre, miembro_comite2_cedula, miembro_comite2_celular, miembro_comite2_correo,
        miembro_comite3_nombre, miembro_comite3_cedula, miembro_comite3_celular, miembro_comite3_correo,
        edificioId
    ];

    try {
        await pool.query(sql, values);
        res.redirect(`/ver_edificio?edificioId=${edificioId}`);
    } catch (error) {
        console.error('Error updating committee members:', error);
        res.status(500).send('Error al guardar los cambios de los miembros del comité');
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
        const userId = req.session.userId;

        const name = req.session.name;
        res.render('administrativo/Operaciones/apartementos/consulta_apartamentos', { name ,userId ,layout: 'layouts/nav_admin.hbs'});
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
        const name = req.session.name;
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

            res.render('administrativo/Operaciones/apartementos/editar_apartamentos', { name, apartamento ,layout: 'layouts/nav_admin.hbs'});
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
        const name = req.session.name;
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

            res.render('administrativo/Operaciones/ClientesEdificios/editar_edificios.hbs', { name, edificio, layout: 'layouts/nav_admin.hbs'});
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
        const name = req.session.name;
        const edificioId = req.query.edificioId;

        if (!edificioId) {
            return res.status(400).send('El ID del edificio es requerido');
        }

        try {
            const [rows] = await pool.query('SELECT * FROM edificios WHERE id = ?', [edificioId]);
            const edificio = rows[0];

            res.render('administrativo/Operaciones/ClientesEdificios/editar_miembros_consejo.hbs', { name, edificio ,layout: 'layouts/nav_admin.hbs'});
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





// Ruta para mostrar la lista de edificios
app.get('/ComunicadosGeneral', async (req, res) => {
    if (req.session.loggedin === true) {
        const userId = req.session.userId;

        const nombreUsuario = req.session.name;
        const query = 'SELECT * FROM edificios';

        try {
            const [results] = await pool.query(query);
            res.render('administrativo/Operaciones/comunicadoGeneral/nuevocomunicadoGeneral.hbs', { 
                name: nombreUsuario,
                userId , 
                layout: 'layouts/nav_admin.hbs', 
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
        const userId = req.session.userId;

        try {
            const [results] = await pool.query('SELECT * FROM edificios');
            res.render('administrativo/Operaciones/comunicadoApartmamentos/comunicado_individual.hbs', { 
                name: nombreUsuario, 
                userId ,
                layout: 'layouts/nav_admin.hbs', 
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
        const name = req.session.name;
        try {
            const [results] = await pool.query('SELECT * FROM edificios');
            res.render('administrativo/CONTABILIDAD/validarPagos/validarpagos.hbs', { 
                name,
                layout: 'layouts/nav_admin.hbs',
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
        }
        
        // Obtener los detalles del apartamento seleccionado
        const [apartamentoDetalles] = await pool.query(queryApartamentoDetalles, [apartamentoSeleccionado]);
        if (apartamentoDetalles.length === 0) {
            return res.status(404).send('No se encontró el apartamento seleccionado.');
        }

        const { nombre_edificio, numero_apartamento } = apartamentoDetalles[0];

        // Insertar el pago en la base de datos y obtener el ID del pago
        const [insertResult] = await pool.query(queryInsert, [apartamentoSeleccionado, nombre_edificio, numero_apartamento, fecha_pago, valor_pago, documentoBuffer]);
        const numeroSeguimiento = insertResult.insertId; // ID de pago generado

        // Consulta para obtener el correo electrónico del apartamento seleccionado
        const queryCorreo = `
            SELECT correo 
            FROM apartamentos 
            WHERE id = ?
        `;
        const [correoResults] = await pool.query(queryCorreo, [apartamentoSeleccionado]);
        if (correoResults.length === 0) {
            return res.status(404).send('Pago validado, pero no se encontró un correo asociado al apartamento.');
        }

        const correoDestinatario = correoResults[0].correo;

        // Configuración del mensaje de correo
        const mailOptions = {
            from: 'nexus.innovationss@gmail.com', // Reemplaza con tu correo
            to: correoDestinatario,
            subject: 'Confirmación de Pago - Cerceta',
            text: `Estimado propietario,

Hemos recibido su pago correspondiente al edificio ${nombre_edificio}, apartamento ${numero_apartamento}. Agradecemos su cumplimiento y esperamos seguir brindándole un excelente servicio.

Con este número de seguimiento (${numeroSeguimiento}) puede realizar el respectivo seguimiento de su pago.

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

    } catch (err) {
        console.error(err);
        return res.status(500).send('Error al validar el pago');
    }
});






app.get('/Consulta_Comprobantes_de_Pago', (req, res) => {
    if (req.session.loggedin === true) {
        const userId = req.session.userId;

        const name = req.session.name;
        res.render('administrativo/CONTABILIDAD/validarPagos/consultar_pagos.hbs', { name,userId ,layout: 'layouts/nav_admin.hbs' });
    } else {
        res.redirect('/login');
    }
});




app.post('/buscarPagos', async (req, res) => {
    if (req.session.loggedin === true) {
        const { id, apartamento_num, fecha_inicio, fecha_fin, nombre_edificio, numero_apartamento } = req.body;

        let query = "SELECT * FROM pagos_apartamentos WHERE 1=1";
        const params = [];

        if (id) {
            query += " AND id = ?";
            params.push(id);
        }
        if (apartamento_num) {
            query += " AND numero_apartamento = ?";
            params.push(apartamento_num);
        }
        if (fecha_inicio && fecha_fin) {
            query += " AND fecha_pago BETWEEN ? AND ?";
            params.push(fecha_inicio, fecha_fin);
        }
        if (nombre_edificio) {
            query += " AND nombre_edificio LIKE ?";
            params.push(`%${nombre_edificio}%`);
        }
        if (numero_apartamento) {
            query += " AND numero_apartamento LIKE ?";
            params.push(`%${numero_apartamento}%`);
        }

        try {
            const [results] = await pool.query(query, params);
            res.render('administrativo/CONTABILIDAD/validarPagos/consultar_pagos.hbs', {
                name: req.session.name,
                pagos: results,
                layout: 'layouts/nav_admin.hbs'
            });
        } catch (error) {
            console.error("Error al consultar los pagos:", error);
            res.status(500).send("Error en la consulta de pagos");
        }
    } else {
        res.redirect('/login');
    }
});

app.get('/descargarDocumento/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query("SELECT documento_pago FROM pagos_apartamentos WHERE id = ?", [id]);
        
        if (rows.length > 0 && rows[0].documento_pago) {
            const documento = rows[0].documento_pago;
            res.setHeader('Content-Disposition', 'attachment; filename=comprobante_pago.png'); // Forzar extensión .png
            res.setHeader('Content-Type', 'image/png'); // Tipo MIME para PNG
            res.send(documento);
        } else {
            res.status(404).send("Documento no encontrado");
        }
    } catch (error) {
        console.error("Error al descargar el documento:", error);
        res.status(500).send("Error al descargar el documento");
    }
});



// Ruta para obtener edificios
app.get('/obtenerEdificios', async (req, res) => {
    try {
        const [edificios] = await pool.query("SELECT DISTINCT nombre_edificio FROM pagos_apartamentos");
        res.json(edificios);
    } catch (error) {
        console.error("Error al obtener edificios:", error);
        res.status(500).json({ error: "Error al obtener edificios" });
    }
});

// Ruta para obtener los apartamentos de un edificio específico
app.get('/obtenerApartamentos/:nombre_edificio', async (req, res) => {
    const nombre_edificio = req.params.nombre_edificio;
    try {
        const [apartamentos] = await pool.query("SELECT DISTINCT numero_apartamento FROM pagos_apartamentos WHERE nombre_edificio = ?", [nombre_edificio]);
        res.json(apartamentos);
    } catch (error) {
        console.error("Error al obtener apartamentos:", error);
        res.status(500).json({ error: "Error al obtener apartamentos" });
    }
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
        const userId = req.session.userId;

        const nombreUsuario = req.session.name;
        res.render('administrativo/usuarios/crear_usuarios.hbs', { nombreUsuario,userId , layout: 'layouts/nav_admin.hbs' });
    } else {
        res.redirect('/login');
    }
});



app.get('/plantilla_blog', (req, res) => {
    if (req.session.loggedin === true) {
        const userId = req.session.userId;

        const nombreUsuario = req.session.name;
        res.render('blog/plantilla_simple.hbs', { nombreUsuario,userId ,layout: 'layouts/nav_admin.hbs' });
    } else {
        res.redirect('/login');
    }
});

app.get('/subir_publicacion', async (req, res) => {
    if (req.session.loggedin === true) {
        try {
            
            const [edificios] = await pool.query('SELECT id, nombre FROM edificios');
            const userId = req.session.userId;

            const name = req.session.name;
            res.render('blog/agregar_blog.hbs', { name, edificios ,userId ,layout: 'layouts/nav_admin.hbs'});
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



app.get('/estados_cuenta', (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        const userId = req.session.userId;

        res.render('administrativo/CONTABILIDAD/validarPagos/estados_cuanta.hbs', { name,userId ,layout: 'layouts/nav_admin.hbs' });
    } else {
        res.redirect('/login');
    }
});

// Ruta para obtener todos los edificios con sus apartamentos
app.get('/obtenerEdificiosConApartamentos', async (req, res) => {
    try {
        const [resultados] = await pool.query(`
            SELECT nombre_edificio, numero_apartamento 
            FROM pagos_apartamentos
            ORDER BY nombre_edificio, numero_apartamento
        `);

        // Organizar los datos en un formato adecuado para la vista
        const edificios = resultados.reduce((acc, { nombre_edificio, numero_apartamento }) => {
            if (!acc[nombre_edificio]) {
                acc[nombre_edificio] = [];
            }
            acc[nombre_edificio].push(numero_apartamento);
            return acc;
        }, {});

        res.json(edificios);
    } catch (error) {
        console.error("Error al obtener edificios con apartamentos:", error);
        res.status(500).json({ error: "Error al obtener edificios con apartamentos" });
    }
});


app.get('/obtenerEdificiosConPagos', async (req, res) => {
    try {
        const [resultados] = await pool.query(`
            SELECT nombre_edificio, numero_apartamento, 
                   YEAR(fecha_pago) AS year, MONTH(fecha_pago) AS month, 
                   SUM(valor_pago) AS total_pago
            FROM pagos_apartamentos
            GROUP BY nombre_edificio, numero_apartamento, year, month
            ORDER BY nombre_edificio, numero_apartamento, year, month
        `);

        // Organize data for the frontend, filling in missing months with 0
        const edificios = {};

        resultados.forEach(({ nombre_edificio, numero_apartamento, year, month, total_pago }) => {
            if (!edificios[nombre_edificio]) {
                edificios[nombre_edificio] = {};
            }
            if (!edificios[nombre_edificio][numero_apartamento]) {
                edificios[nombre_edificio][numero_apartamento] = Array(12).fill(0); // Initialize 12 months with 0
            }
            edificios[nombre_edificio][numero_apartamento][month - 1] = total_pago; // Set the total for the specific month
        });

        res.json(edificios);
    } catch (error) {
        console.error("Error al obtener datos de pagos:", error);
        res.status(500).json({ error: "Error al obtener datos de pagos" });
    }
});



app.get('/seleccionar_edificio_blog', (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        const userId = req.session.userId;

        pool.query('SELECT id, nombre FROM edificios')
            .then(([resultados]) => {
                res.render('blog/seleccionar_edificio.hbs', { name,userId , edificios: resultados, layout: 'layouts/nav_admin.hbs' });
            })
            .catch(err => {
                console.error(err);
                res.status(500).send('Error al obtener edificios');
            });
    } else {
        res.redirect('/login');
    }
});






app.get('/ver_blog_admin', async (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        const userId = req.session.userId;

        const edificioId = req.query.edificio_id;

        try {
            const [resultados] = await pool.query('SELECT * FROM publicaciones WHERE edificio_id = ? ORDER BY fecha DESC', [edificioId]);
            
            // Convertir los datos binarios a base64
            const blogPosts = resultados.map((post) => {
                return {
                    ...post,
                    imagen: post.imagen ? post.imagen.toString('base64') : null,
                    pdf: post.pdf ? post.pdf.toString('base64') : null,
                    word: post.word ? post.word.toString('base64') : null,
                    excel: post.excel ? post.excel.toString('base64') : null
                };
            });

            res.render('blog/consulta_admin.hbs', { name,userId ,blogPosts, layout: 'layouts/nav_admin.hbs' });
        } catch (err) {
            console.error(err);
            res.status(500).send('Error al obtener las entradas del blog');
        }
    } else {
        res.redirect('/login');
    }
});





app.get('/informe_operativo', (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        res.render('administrativo/informes/crear_informe_operativo.hbs', { name,layout: 'layouts/nav_admin.hbs' });
    } else {
        res.redirect('/login');
    }
});



app.get('/crear_informe_mantenimiento', async (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;

        try {
            // Consulta a la base de datos para obtener la lista de edificios
            const [results] = await pool.query('SELECT id, nombre FROM edificios');
            
            // Renderiza la plantilla pasando la lista de edificios
            res.render('administrativo/informes/crear/mantenimiento.hbs', { name, edificios: results, layout: 'layouts/nav_admin.hbs' });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al obtener edificios");
        }
    } else {
        res.redirect('/login');
    }
});









app.post('/guardar_informe', upload.fields([
    { name: 'imagen_antes', maxCount: 1 },
    { name: 'imagen_durante', maxCount: 1 },
    { name: 'imagen_despues', maxCount: 1 },
    { name: 'bitacoraPng', maxCount: 1 }
]), async (req, res) => {
    if (!req.body.fecha_informe) {
        return res.status(400).send("La fecha del informe es obligatoria.");
    }

    // Definir la carpeta y archivo de la bitácora
    const directoryPath = path.join(__dirname, 'public', 'bitacoras');
    const fileName = `bitacora_${Date.now()}.png`;
    const bitacoraFilePath = path.join(directoryPath, fileName); // Ruta completa para guardar el archivo

    // Guardar solo la ruta relativa para la base de datos
    const relativeFilePath = `bitacoras/${fileName}`;

    // Verificar y crear la carpeta si no existe
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    // Guardar el archivo `bitacoraPng` en la carpeta
    if (req.files['bitacoraPng']) {
        fs.writeFileSync(bitacoraFilePath, req.files['bitacoraPng'][0].buffer);
    }

    // Datos para guardar en la base de datos
    const data = {
        fecha_informe: req.body.fecha_informe,
        realizado_por: req.body.realizado_por,
        edificio_id: req.body.edificio,
        transformador: req.body.transformador,
        transformador_obs: req.body.transformador_obs,
        planta_electrica: req.body.planta_electrica,
        planta_electrica_obs: req.body.planta_electrica_obs,
        motobomba_piscina: req.body.motobomba_piscina,
        motobomba_piscina_obs: req.body.motobomba_piscina_obs,
        bombas_sumergibles: req.body.bombas_sumergibles,
        bombas_sumergibles_obs: req.body.bombas_sumergibles_obs,
        tanque_reserva: req.body.tanque_reserva,
        tanque_reserva_obs: req.body.tanque_reserva_obs,
        equipo_gym: req.body.equipo_gym,
        equipo_gym_obs: req.body.equipo_gym_obs,
        sauna: req.body.sauna,
        sauna_obs: req.body.sauna_obs,
        turco: req.body.turco,
        turco_obs: req.body.turco_obs,
        piscina: req.body.piscina,
        piscina_obs: req.body.piscina_obs,
        cancha_tenis: req.body.cancha_tenis,
        cancha_tenis_obs: req.body.cancha_tenis_obs,
        juegos_infantiles: req.body.juegos_infantiles,
        juegos_infantiles_obs: req.body.juegos_infantiles_obs,
        salon_social: req.body.salon_social,
        salon_social_obs: req.body.salon_social_obs,
        otros: req.body.otros,
        otros_obs: req.body.otros_obs,
        imagen_antes: req.files['imagen_antes'] ? req.files['imagen_antes'][0].buffer : null,
        imagen_durante: req.files['imagen_durante'] ? req.files['imagen_durante'][0].buffer : null,
        imagen_despues: req.files['imagen_despues'] ? req.files['imagen_despues'][0].buffer : null,
        bitacoraFilePath: relativeFilePath // Guardar solo la ruta relativa en la base de datos
    };

    try {
        const query = `INSERT INTO bitacora_mantenimiento_equipos SET ?`;
        await pool.query(query, data);

        // Verificar si se desea compartir el informe
        if (req.body.compartirInforme === 'si') {
            // Obtener correos del edificio
            const emailsQuery = `SELECT correo FROM apartamentos WHERE edificio_id = ?`;
            const [emails] = await pool.query(emailsQuery, [req.body.edificio]);

            // Enviar correos con el archivo adjunto
            const transporter = nodemailer.createTransport({
                service: 'gmail', // Cambia esto según tu proveedor de correo
                auth: {
                    user: 'nexus.innovationss@gmail.com',
                    pass: 'dhmtnkcehxzfwzbd' // Cambia esto a una variable de entorno en producción
                }
            });

            const attachments = [{
                path: bitacoraFilePath // Ruta del archivo que se guarda
            }];

            // Agregar las imágenes a los adjuntos si están disponibles
            if (req.files['imagen_antes']) {
                const imagenAntesPath = path.join(directoryPath, `imagen_antes_${Date.now()}.png`);
                fs.writeFileSync(imagenAntesPath, req.files['imagen_antes'][0].buffer);
                attachments.push({ path: imagenAntesPath });
            }
            if (req.files['imagen_durante']) {
                const imagenDurantePath = path.join(directoryPath, `imagen_durante_${Date.now()}.png`);
                fs.writeFileSync(imagenDurantePath, req.files['imagen_durante'][0].buffer);
                attachments.push({ path: imagenDurantePath });
            }
            if (req.files['imagen_despues']) {
                const imagenDespuesPath = path.join(directoryPath, `imagen_despues_${Date.now()}.png`);
                fs.writeFileSync(imagenDespuesPath, req.files['imagen_despues'][0].buffer);
                attachments.push({ path: imagenDespuesPath });
            }

            const mailOptions = {
                from: 'nexus.innovationss@gmail.com',
                to: emails.map(email => email.correo).join(','),
                subject: 'Informe de Mantenimiento',
                text: 'Adjunto el informe de mantenimiento correspondiente.',
                attachments: attachments // Usar el array de adjuntos
            };

            await transporter.sendMail(mailOptions);
            res.send("Informe de mantenimiento guardado y notificaciones enviadas con éxito.");
        } else {
            res.send("Informe de mantenimiento guardado con éxito sin enviar notificaciones.");
        }
    } catch (error) {
        console.error("Error al guardar el informe o enviar el correo:", error);
        res.status(500).send("Error al guardar el informe o enviar la notificación.");
    }
});
app.post('/guardar_usuario', async (req, res) => {
    const { nombre, user_email, user_password, role } = req.body;
    const cargos = req.body['cargo[]']; // Acceso correcto al array de cargos seleccionados

    console.log("Cargos seleccionados:", cargos); // Verificar que cargos esté recibiendo datos

    try {
        // Verificar si el nombre de usuario o el correo ya existen
        const checkQuery = 'SELECT * FROM usuarios WHERE nombre = ? OR email = ?';
        const [rows] = await pool.query(checkQuery, [nombre, user_email]);

        if (rows.length > 0) {
            res.send('<script>alert("El nombre de usuario o el correo ya están en uso. Por favor, elige otros."); window.location.href="/agregar_usuarios";</script>');
        } else {
            // Concatenar cargos seleccionados en un solo string separados por comas
            const cargoString = cargos && cargos.length > 0 ? cargos.join(', ') : null;
            // Insertar el nuevo usuario
            const insertQuery = 'INSERT INTO usuarios (nombre, email, password, role, cargo) VALUES (?, ?, ?, ?, ?)';
            await pool.query(insertQuery, [nombre, user_email, user_password, role, cargoString]);

            res.send('<script>alert("Usuario guardado exitosamente."); window.location.href="/agregar_usuarios";</script>');
        }
    } catch (error) {
        console.error('Error al guardar el usuario:', error);
        res.send('<script>alert("Hubo un error al guardar el usuario."); window.location.href="/agregar_usuarios";</script>');
    }
});








app.get('/crear_alerta', async (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;

        try {
            // Consulta para obtener los administradores
            const [administradores] = await pool.query(`SELECT id, nombre, email FROM usuarios WHERE role = 'admin'`);
            
            // Renderiza la vista y pasa los administradores
            res.render('administrativo/alertas/crear_alerta.hbs', { name, administradores, layout: 'layouts/nav_admin.hbs' });
        } catch (error) {
            console.error("Error al obtener administradores:", error);
            res.status(500).send("Hubo un problema al cargar los datos.");
        }
    } else {
        res.redirect('/login');
    }
});




app.post('/crear_alerta', async (req, res) => {
    console.log(req.body); // Verificar qué datos están llegando

    const {
        nombreActividad,
        fechaEjecucion,
        frecuenciaAlerta,
        diasAntesAlerta,
        prioridad,
        tiempoRecordatorio,
        responsable
    } = req.body;

    // Acceder a los métodos de notificación seleccionados
    const metodoNotificacion = req.body['metodoNotificacion[]'];

    try {
        // Convertir el array de métodos de notificación en una cadena separada por comas
        const metodosNotificacion = Array.isArray(metodoNotificacion)
            ? metodoNotificacion.join(',') // Convierte a "email,sms" por ejemplo
            : '';

        console.log("Métodos de Notificación antes de la consulta:", metodosNotificacion); // Verificar el valor final

        // Inserción en la tabla alertas
        const query = `INSERT INTO alertas 
            (nombre_actividad, fecha_ejecucion, frecuencia_alerta, dias_antes_alerta, metodo_notificacion, prioridad, tiempo_recordatorio, responsable_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(query, [
            nombreActividad,
            fechaEjecucion,
            frecuenciaAlerta,
            diasAntesAlerta !== "" ? diasAntesAlerta : null,
            metodosNotificacion, 
            prioridad,
            tiempoRecordatorio !== "" ? tiempoRecordatorio : null,
            responsable
        ]);

        console.log("Alerta creada exitosamente con métodos de notificación:", metodosNotificacion);

        res.redirect('/crear_alerta'); 
    } catch (error) {
        console.error("Error al crear alerta:", error);
        res.status(500).send("Hubo un problema al crear la alerta.");
    }
});


async function verificarAlertasPendientes() {
    try {
        console.log("Iniciando verificación de alertas...");

        const query = `
        SELECT 
            a.id, a.nombre_actividad, a.fecha_ejecucion, a.frecuencia_alerta, a.dias_antes_alerta, 
            a.metodo_notificacion, a.prioridad, a.tiempo_recordatorio, u.email, u.nombre, u.id AS responsable_id
        FROM 
            alertas a 
        JOIN 
            usuarios u ON a.responsable_id = u.id 
        WHERE 
            NOW() <= a.fecha_ejecucion
    `;
    
        const [alertas] = await pool.query(query);

        console.log("Alertas encontradas:", alertas.length);

        for (const alerta of alertas) {
            const hoy = moment();
            const fechaEjecucion = moment(alerta.fecha_ejecucion);

            // Determina si la notificación debe enviarse según la frecuencia
            let enviarNotificacion = false;
            switch (alerta.frecuencia_alerta) {
                case 'diaria':
                    enviarNotificacion = true; // Notificar todos los días hasta la fecha de ejecución
                    break;
                case 'semanal':
                    enviarNotificacion = hoy.diff(fechaEjecucion, 'days') % 7 === 0;
                    break;
                case 'quincenal':
                    enviarNotificacion = hoy.diff(fechaEjecucion, 'days') % 14 === 0;
                    break;
                case 'mensual':
                    enviarNotificacion = hoy.isSame(fechaEjecucion, 'day'); // Notificar una vez al mes en el día de ejecución
                    break;
                case 'personalizada':
                    if (alerta.dias_antes_alerta) {
                        const diasDiferencia = fechaEjecucion.diff(hoy, 'days');
                        enviarNotificacion = diasDiferencia === alerta.dias_antes_alerta;
                    }
                    break;
            }

            if (enviarNotificacion) {
                console.log("Procesando alerta:", alerta);

                // Procesar cada método de notificación seleccionado
                const metodos = alerta.metodo_notificacion.split(',');
                for (const metodo of metodos) {
                    switch (metodo.trim()) {
                        case 'email':
                            console.log("Enviando correo a:", alerta.email);
                            await sendEmail(alerta.email, alerta.nombre_actividad, alerta.fecha_ejecucion);
                            break;
                        case 'sms':
                            console.log("Enviando SMS a:", alerta.email);
                            await sendSMS(alerta.email, alerta.nombre_actividad);
                            break;
                        case 'push':
                            console.log("Enviando notificación push a:", alerta.email);
                            await sendPushNotification(alerta.email, alerta.nombre_actividad);
                            break;
                            case 'app':
                                console.log("Enviando notificación en app al usuario con ID:", alerta.responsable_id);
                                await sendAppNotification(alerta.responsable_id, alerta.nombre_actividad, alerta.fecha_ejecucion);
                                break;
                            
                            
                        default:
                            console.log(`Método de notificación no soportado: ${metodo}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error al verificar alertas:", error);
    }
}




// Métodos de notificación
async function sendEmail(to, actividad, fecha) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'nexus.innovationss@gmail.com', // tu correo electrónico
            pass: 'bqffoqklqfrlvxyt' // tu contraseña de aplicación
        }
    });

    const mailOptions = {
        from: 'nexus.innovationss@gmail.com',
        to: to,
        subject: `Recordatorio de Actividad: ${actividad}`,
        text: `Hola, tienes la actividad "${actividad}" programada para el ${moment(fecha).format('DD/MM/YYYY')}. ¡No olvides realizarla!`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`Error al enviar el correo: ${error}`);
        } else {
            console.log(`Correo enviado: ${info.response}`);
        }
    });
}

async function sendSMS(to, actividad) {
    console.log(`Enviando SMS a ${to} para la actividad ${actividad}`);
    // Implementación del envío de SMS (puedes usar Twilio, por ejemplo)
}

async function sendPushNotification(to, actividad) {
    console.log(`Enviando notificación push a ${to} para la actividad ${actividad}`);
    // Implementación del envío de notificación push
}

async function sendAppNotification(userId, actividad, fechaEjecucion) {
    if (!userId) {
        console.error("El user_id es null o indefinido. No se puede enviar la notificación.");
        return;
    }

    console.log(`Registrando notificación en app para el usuario con ID ${userId} sobre la actividad ${actividad}`);

    const query = `
        INSERT INTO notificaciones (user_id, actividad, fecha, leido)
        VALUES (?, ?, ?, 0)
    `;
    
    await pool.query(query, [userId, actividad, fechaEjecucion]); // Guardar fecha_ejecucion en la columna de fecha
}













cron.schedule('1 12 * * *', () => {
    console.log("Cron job ejecutándose cada día a las 8:00 AM...");
    verificarAlertasPendientes();
});

app.get('/notificaciones', async (req, res) => {
    const userId = req.session.userId; // Asegúrate de que el ID de usuario esté en la sesión

    try {
        const [notificaciones] = await pool.query(`
            SELECT * FROM notificaciones WHERE user_id = ? AND leido = 0
        `, [userId]);

        console.log("Notificaciones para el usuario:", notificaciones); // Asegúrate de que esto tenga datos
        res.json({ notificaciones });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }
});





app.get('/notificaciones', async (req, res) => {
    const userId = req.session.userId; // Asegúrate de que el ID de usuario esté en la sesión
    console.log("User ID de la sesión:", userId); // Verifica el ID del usuario

    try {
        const [notificaciones] = await pool.query(`
            SELECT * FROM notificaciones WHERE user_id = ? AND leido = 0
        `, [userId]);

        console.log("Notificaciones encontradas:", notificaciones); // Verifica si hay notificaciones
        res.json({ notificaciones });
    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }
});






app.post('/marcarNotificacionesComoLeidas/:user_id', async (req, res) => {
    const userId = req.params.user_id; // Se recibe correctamente el user_id
    console.log("Intentando marcar como leídas las notificaciones para el user_id:", userId);

    try {
        const [result] = await pool.query('UPDATE notificaciones SET leido = 1 WHERE user_id = ? AND leido = 0', [userId]);

        if (result.affectedRows > 0) {
            console.log("Notificaciones marcadas como leídas para el user_id:", userId);
            res.json({ success: true, message: 'Notificaciones marcadas como leídas', affectedRows: result.affectedRows });
        } else {
            console.log("No había notificaciones para marcar como leídas para el user_id:", userId);
            res.json({ success: false, message: 'No había notificaciones para marcar como leídas' });
        }
    } catch (error) {
        console.error('Error al marcar notificaciones como leídas:', error);
        res.status(500).json({ success: false, message: 'Error al marcar notificaciones como leídas' });
    }
});


app.get('/consultar_alertas', async (req, res) => {
    if (req.session.loggedin === true) {
        const name = req.session.name;
        const userId = req.session.userId;

        try {
            const [alertas] = await pool.query('SELECT * FROM alertas ORDER BY fecha_creacion DESC');
            res.render('administrativo/alertas/consultar_todas.hbs', { name, userId, alertas, layout: 'layouts/nav_admin.hbs' });
        } catch (error) {
            console.error('Error al obtener alertas:', error);
            res.status(500).send('Error al obtener alertas');
        }
    } else {
        res.redirect('/login');
    }
});


// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
