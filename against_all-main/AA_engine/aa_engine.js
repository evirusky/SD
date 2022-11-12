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


let ciudades = [];
let idCiudades = [];
let juego = null;

//Game Engine

const probSpawn = 0.2;
const probAlim = 0.15;
const probMina = 0.1;
const probVacio = 1 - probMina - probAlim - probSpawn;
const MAX = 10;
const MIN = -10;
/**
 * Clase que
 */
class Juego {
    /**
     * 
     * @param {integer} max_jugadores 
     * @param {array of climas} climas 
     */
    constructor(max_jugadores, ciudades) {
        this.max_jugadores = max_jugadores;
        this.ciudades = ciudades;
        this.jugadores = new Map(); //key: id, value: {posX, posY, nivel, EC, EF}
        this.posiciones = new Map();//key: 'x_y', value: {player_id: null o valor, npc_id: null o valor, mina: t/f, alimento: t/f}
        this.spawns = new Array();
        this.mapa = new Array();
        this.estado = 'A la espera';

        for (let i = 0; i < 20; i++) {
            this.mapa[i] = [];
            for (let j = 0; j < 20; j++) {
                let aux = Math.random();
                if (aux <= probSpawn) {//Posicion reservada para spawnear
                    this.mapa[i][j] = "";
                    this.spawns.push(i + '_' + j);

                } else if (probSpawn < aux && aux <= (probSpawn + probAlim)) {//Posicion reservada para alimento
                    this.mapa[i][j] = "A";
                    this.posiciones.set(i + '_' + j, { player_id: null, npc_id: null, mina: false, alimento: true })

                } else if ((probSpawn + probAlim) < aux && aux <= (probSpawn + probAlim + probMina)) {//Posicion reservada para mina
                    this.mapa[i][j] = "M";
                    this.posiciones.set(i + '_' + j, { player_id: null, npc_id: null, mina: true, alimento: false })

                } else {//Posicion vacia
                    this.mapa[i][j] = "";
                }
            }
        }
        let shuffled = this.spawns
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
        this.spawns = shuffled.slice(0, this.max_jugadores);

    }

    /**
     * Se añade un nuevo jugador a la lista de jugadores activos
     * @param {integer} id 
     */
    nuevoJugador(id, alias) {
        let posiciones = this.spawns.pop().split('_');
        this.mapa[posiciones[0]][posiciones[1]] = alias;
        this.posiciones.set(posiciones[0] + '_' + posiciones[1], { player_id: id, npc_id: null, mina: false, alimento: false });

        let ec = Math.floor(Math.random() * (MAX - MIN) + MIN);
        let ef = Math.floor(Math.random() * (MAX - MIN) + MIN);
        this.jugadores.set(id, { posX: posiciones[0], posY: posiciones[1], nivel: 1, EC: ec, EF: ef })
        return this.jugadores.get(id);
    }

    /**
     * 
     */
    nuevoNPC() {
        let posiciones = this.spawns.pop().split('_');
        let nivel = Math.floor(Math.random() * (MAX));
        this.mapa[posiciones[0]][posiciones[1]] = nivel;
        this.posiciones.set(posiciones[0] + '_' + posiciones[1], { player_id: null, npc_id: nivel, mina: false, alimento: false });
        return this.posiciones.get(posiciones[0] + '_' + posiciones[1]);
    }

    empezar() {
        this.estado = 'empezado';
        this.spawn = new Array();
    }

    lleno() {
        return this.jugadores.size === this.max_jugadores;
    }


    /**
     * 
     * @param {key} prev apunta al elemento que existia previamente en el mapa
     * @param {key} actual apunta al elemento que se ha desplazado en el mapa
     */
    interaccion(prev, actual) {

    }


}

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


function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

function nuevoJuego(max_jugadores) {
    Juego = new Object();
    Juego.jugadores = [];
    Juego.max_jugadores = max_jugadores;
    Juego.mapa = []

};

//FUNCION PARA PRODUCIR MINAS Y ALIMENTOS ALEATORIOS EN EL MAPA
function producirMinasAlimentos() {
    let minas = getRandom(10, 20);
    let alimentos = getRandom(10, 20);

    for (let i = 0; i < minas; i++) {
        let x = getRandom(0, 20);
        let y = getRandom(0, 20);
        Juego.mapa[x][y] = "M";
    }

    for (let i = 0; i < alimentos; i++) {
        let x = getRandom(0, 20);
        let y = getRandom(0, 20);
        Juego.mapa[x][y] = "A";
    }
}

//PRODUZCO MAPA EN TOPICO PARTIDA CON LOS DATOS DE LOS JUGADORES 
function creoMapa() {

    Juego.mapa = [];

    for (let i = 0; i < 20; i++) {
        Juego.mapa[i] = [];
        for (let j = 0; j < 20; j++) {
            Juego.mapa[i][j] = "";
        }
    }
    producirMinasAlimentos();

    let payloads = [{ topic: 'partida', messages: JSON.stringify(Juego.mapa), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.log(err);
    });

}

function ActualizoMapa(id, x, y, antigua_x, antigua_y) {
    Juego.mapa[x][y] = id;
    Juego.mapa[antigua_x][antigua_y] = '';

    let payloads = [{ topic: 'partida', messages: JSON.stringify(Juego.mapa), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.log(err);
    });
}

//CREO LA PARTIDA 
function crearPartida() {
    creoMapa();
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
                if (res.rows[0].count === '1') {
                    callback('OK');
                    //playerSocket.emit('Acceso', 'OK');
                    console.log("CREANDO MAPA ... ");
                    crearPartida();
                } else callback('no existe');
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
            let antigua_x = res.rows[0].x;
            let antigua_y = res.rows[0].y;
            let x_nueva = res.rows[0].x + movimiento.x;
            let y_nueva = res.rows[0].y + movimiento.y;

            //COMPRUEBO QUE NO SE SALGA DEL MAPA
            if (x_nueva < 0 || x_nueva > 19 || y_nueva < 0 || y_nueva > 19) {
                console.log("LIMITE DEL MAPA!!");
                //se queda en su posicion antigua
            } else {
                pool.query('UPDATE user_db SET x=' + x_nueva + ', y=' + y_nueva + ' WHERE id=' + id + '', (err, res) => {
                    if (err) console.log('Error inesperado');
                    else {
                        //console.log('Coordenadas actualizadas ' + x_nueva + ' ' + y_nueva + ' de ' + id);
                        ActualizoMapa(id, x_nueva, y_nueva, antigua_x, antigua_y);
                    }
                });
            }

        }
    });

});




//reader.read(">", (opcion) => {
//    console.log(opcion);
//    process.exit(0);
//});

io.listen(argumentos.engine.port);






