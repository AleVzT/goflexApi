const express = require('express');
const cors = require('cors');
const { dbConnection } = require('./database/config');
require('dotenv').config();


const app = express();

// Base de datos
dbConnection();

// Directorio publico
app.use( express.static('public') );

// Lectura y parseo del body
app.use( express.json() );
app.use(cors());

// Rutas
app.use('/api/auth', require('./routes/auth') );
app.use('/api/users', require('./routes/users') );
app.use('/api/fish', require('./routes/fish') );

// Escuchando peticiones
app.listen( process.env.PORT, () => {
    console.log(`Server corriendo en puerto ${ process.env.PORT }`);
});

