const argumentos = require("../arguments.json");
const reader = require("read-console");
const { Pool, Client } = require('pg');

const producer = require("./producer.js");
const consumer = require("./consumer.js");

const connectionData = {
    user: argumentos.db.user,
    host: argumentos.db.host,
    database: argumentos.db.db_name,
    password: argumentos.db.pass,
    port: argumentos.db.port,
}
const pool = new Pool(connectionData);

//servidor para registry y engine
const io = require('socket.io')();

//cliente para clima 
const io_client = require('socket.io-client');
const weather = io_client("http://" + argumentos.clima.ip + ":" + argumentos.clima.port);
const Juego = {};

let ciudades = [];
let idCiudades = [];

//Defincion de funciones 

function indiceCiudades(totalClimas) {

    idCiudades = Array.from({ length: totalClimas }, (_, i) => i + 1);

    let shuffled = idCiudades
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

    idCiudades = shuffled.slice(0, 4);

}

function nuevoClima(id) {
    return new Promise(function (resolve, reject) {
        weather.emit('SolClima', id, (response) => {
            if (response === 'Error inesperado') reject(response);
            ciudades.push(response);
            resolve();
        });
    });
}

function nuevoJuego(max_jugadores) {
    Juego = new Object();
    Juego.jugadores = [];
    Juego.max_jugadores = max_jugadores;
    Juego.mapa = []

};

//PRODUZCO MAPA EN TOPICO PARTIDA CON LOS DATOS DE LOS JUGADORES 
function producirMapa() {

    let mapa = [];

    for (let i = 0; i < 20; i++) {
        mapa[i] = [];
        for (let j = 0; j < 20; j++) {
            mapa[i][j] = "";
        }
    }

    let payloads = [{ topic: 'partida', messages: JSON.stringify(mapa), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.log(err);
    });
}


//Comunicacion

weather.emit('totalClimas', 'Partida empezada', (response) => {
    let totalClimas = response.count;
    indiceCiudades(totalClimas);
    console.log(idCiudades);

    for (var i = 0; i < 4; i++) {
        nuevoClima(idCiudades[i])
            .then(() => { console.log(ciudades) })
            .catch((err) => { console.log(err) });
    }


});

//Servicios ofrecidos
io.on("connection", playerSocket => {
    pool.connect();
    playerSocket.on('SolAcceso', (arg, callback) => {
        console.log(arg.alias + ' solicita inicio de sesion con ' + arg.password);
        //necesito el id del usuario para pasarle al player 
        pool.query('SELECT count(*)  from user_db WHERE alias=\'' + arg.alias + '\' and password=\'' + arg.password + '\'', (err, res) => {
            console.log(res.rows[0]);
            if (err) callback('Error inesperado');
            else {
                if (res.rows[0].count === '1') callback('ok');
                else callback('no existe');
            }
        });

    });

});

//KAFKA : ENGINE RECIBE MOVIMIENTO DE PLAYER
consumer.on('message', (message) => {
    //console.log(message.value);
    let movimiento = JSON.parse(message.value);

    pool.query('SELECT id, x, y FROM user_db WHERE alias=\'' + movimiento.alias + '\'', (err, res) => {
        if (err) console.log('Error inesperado');
        else {
            let id = res.rows[0].id;
            //console.log(id);


            //ACTUALIZO LAS COORDENADAS ANTIGUAS DEL PLAYER
            let x_nueva = res.rows[0].x + movimiento.x;
            let y_nueva = res.rows[0].y + movimiento.y;

            //Y LAS ALMACENO EN LA BD 
            pool.query('UPDATE user_db SET x=' + x_nueva + ', y=' + y_nueva + ' WHERE id=' + id + '', (err, res) => {
                if (err) console.log('Error inesperado');
                else {
                    console.log('Coordenadas actualizadas')
                }
            });



        }
    });


    //Y CUANDO RECIBO EL MOVIMIENTO RECIBO EL MAPA
    // producirMapa();


});




//reader.read(">", (opcion) => {
//    console.log(opcion);
//    process.exit(0);
//});

io.listen(argumentos.engine.port);






