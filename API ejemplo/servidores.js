const express = require('express');
const boom = require('express-boom');
const logger = require('morgan');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const app = express();

app.use(boom()); // normalizamos los errores
app.use(logger('dev')); // log every request to the console
app.use(cors()); // permitimos peticiones desde cualquier origen

app.use(express.json({ limit: '50mb' })); // soportamos json de hasta 50mb
app.use(express.urlencoded({ extended: true }));

const server = https.createServer({
    key: fs.readFileSync('./certificados/server.key'),
    cert: fs.readFileSync('./certificados/server.cert')
}, app);
//creamos un servidor https con las claves que hemos creado, y le decimos que todas las peticiones que reciba el servidor las maneje nuestra aplicacion de express

/**const io = require ('socket.io')(server, {
 * cors: {origin: "*" , }
 * }); */
//engancho el servidor de socket.io a nuestro servidor https para que utilice las mismas claves y certificados


module.exports = { app, server };

// creo los certificados con el comando:
// openssl req -nodes -new -x509 -keyout server.key -out server.cert