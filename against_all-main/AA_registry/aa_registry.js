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

let rowsCount;

//Servicios ofrecidos
io.on("connection", playerSocket => {
    pool.connect();
    playerSocket.on('nuevoUsuario', (arg, callback) => {

        pool.query('SELECT * FROM user_db WHERE alias=\'' + arg.alias + '\'', (err, res) => {
            if (err) {
                console.log(err);
                callback('Error inesperado');
            } else if (res.rowCount !== 0) {
                console.log(res);
                callback('Usuario ya existe');
            } else pool.query('INSERT INTO user_db(alias,password)' +
                ' VALUES(\'' + arg.alias + '\', \'' + arg.password + '\')' +
                ' returning id,alias', (err, res) => {
                    if (err) {
                        console.log(err);
                        callback('No se pudo crear el usuario');
                    } else if (res.rowCount === 1) {
                        console.log(res.rows[0]);
                        callback('Usuario creado');
                    }

                });
        });

    });

    playerSocket.on('modificarUsuario', (arg, callback) => {
        pool.query('SELECT id FROM user_db WHERE alias=\'' + arg.alias + '\' and password=\'' + arg.password + '\'', (err, res) => {
            console.log('SELECT id FROM user_db WHERE alias=\'' + arg.alias + '\' and password=\'' + arg.password + '\'');
            if (err) {
                console.log(err);
                callback('Error inesperado');
            } else if (res.rowCount === 0) {
                console.log(res);
                callback('Credenciales no validas');
            } else {
                let id = res.rows[0].id;
                pool.query('UPDATE user_db' +
                    ' SET alias = \'' + arg.alias + '\', password = \'' + arg.nPassword + '\'' +
                    ' WHERE id = ' + id +
                    ' returning id,alias', (err, res) => {
                        console.log('UPDATE user_db' +
                            ' SET alias = \'' + arg.alias + '\', password = \'' + arg.nPassword + '\'' +
                            ' WHERE id = ' + id +
                            ' returning id,alias');
                        if (err) {
                            console.log(err);
                            callback('Error inesperado');
                        } else if (res.rowCount === 1) {
                            console.log(res.rows[0]);
                            callback('Usuario modificado');
                        } else {
                            console.log(res);
                            callback('Error inesperado');
                        }

                    });
            }
        });
    });

});



io.listen(argumentos.registry.port);