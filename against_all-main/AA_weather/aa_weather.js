const argumentos = require("../arguments.json");

const reader = require("read-console");
const { Socket } = require("socket.io");

const io = require("socket.io")();
const { Pool, Client } = require('pg');

const connectionData = {
    user: argumentos.db.user,
    host: argumentos.db.host,
    database: argumentos.db.db_name,
    password: argumentos.db.pass,
    port: argumentos.db.port,
}
const pool = new Pool(connectionData);
console.log("Establecidos parametros de conexion con la base de datos, ubicada en " + connectionData.host + ":" + connectionData.port);


//Servicios ofrecidos
io.on("connection", engineSocket => {
    pool.connect();
    engineSocket.on('totalClimas', (arg, callback) => {
        pool.query('SELECT count(id) FROM weather_db', (err, res) => {
            if (err) callback('Error inesperado');
            else {
                console.log(res.rows[0]);
                callback(res.rows[0]);
            }
        });

    });

    engineSocket.on('SolClima', (arg, callback) => {
        pool.query('SELECT lugar, temp FROM weather_db WHERE id =' + arg, (err, res) => {
            if (err) callback('Error inesperado');
            else {
                console.log(res.rows[0]);
                callback(res.rows[0]);
            }
        });
    });

});



io.listen(argumentos.clima.port);