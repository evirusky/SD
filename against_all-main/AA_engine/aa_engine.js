const argumentos = require("../arguments.json");
const reader = require("read-console");
const { Pool, Client } = require('pg');

const producer = require("./producer.js");
const { consumerMov, consumerNpc } = require("./consumer.js");

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
const consumer = require("../AA_player/consumer");
const weather = io_client("http://" + argumentos.clima.ip + ":" + argumentos.clima.port);


let ciudades = [];
let idCiudades = [];
let juego = null;

//Game Engine

const probSpawn = 0.2;
const probAlim = 0.15;
const probMina = 0.1;
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
        this.jugadores = new Map(); //key: id, value: {id, alias, posX, posY, nivel, EC, EF}
        this.npcs = new Map();
        this.posiciones = new Map();//key: 'x_y', value: {player_id: null o valor, npc_id: null o valor, mina: t/f, alimento: t/f}
        this.spawns = new Array();
        this.mapa = new Array();
        this.estado = 'A la espera';
        this.countJugadores = 0;

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
        this.countJugadores++;
        let posiciones = this.spawns.pop().split('_');
        let x = parseInt(posiciones[0]); let y = parseInt(posiciones[1]);
        this.mapa[x][y] = alias;
        this.posiciones.set(x + '_' + y, { player_id: id, npc_id: null, mina: false, alimento: false });

        let ec = Math.floor(Math.random() * (MAX - MIN) + MIN);
        let ef = Math.floor(Math.random() * (MAX - MIN) + MIN);
        this.jugadores.set(id, { id: id, alias: alias, posX: x, posY: y, nivel: 1, EC: ec, EF: ef })
        return this.jugadores.get(id);
    }

    /**
     * 
     */
    nuevoNPC() {
        let x, y, key;
        let valido = false;
        let id = 'npc_' + this.npcs.size;
        let valores = { player_id: null, npc_id: id, mina: false, alimento: false };
        let aux;
        do {
            x = Math.floor(Math.random() * (20));
            y = Math.floor(Math.random() * (20));
            key = x + '_' + y;
            valido = !this.posiciones.has(key);
            if (!valido) {
                aux = this.posiciones.get(key);
                if (aux.player_id === null && aux.npc_id === null) {
                    valido = true;
                    aux.npc_id = id;
                    valores = aux;
                }
            }
        } while (!valido);
        let nivel = Math.floor(Math.random() * (MAX));
        this.npcs.set(id, { id: id, posX: x, posY: y, nivel: nivel })
        this.mapa[x][y] = nivel;
        this.posiciones.set(x + '_' + y,);
        return this.npcs.get(id);
    }

    empezar() {
        this.estado = 'empezado';
        this.spawn = new Array();
    }

    lleno() {
        return this.countJugadores === this.max_jugadores;
    }

    /**
     * obtiene el tipo de region en funcion a la temperatura
     * @param {*} temp 
     * @returns 1 frio, 0 normal y 1 caliente
     */
    obtenerEfecto(temp) {
        if (temp <= 10) {//frio
            return -1;
        } else if (temp >= 25) {
            return 1;//calor
        } else {
            return 0;//normal
        }
    }
    /**
     * Calcula que tipo de region seria
     * @param {*} x 
     * @param {*} y 
     * @returns -1 frio, 0 normal y 1 caliente
     */
    obtenerRegion(x, y) {
        if (x <= 10 && y <= 10) {//Region [0]
            return this.obtenerEfecto(this.ciudades[0].temp);
        } else if (x <= 20 && y <= 10) {//Region [1]
            return this.obtenerEfecto(this.ciudades[1].temp);

        } else if (x <= 10 && y <= 20) {//Region [2]
            return this.obtenerEfecto(this.ciudades[2].temp);

        } else {//Region [3]
            return this.obtenerEfecto(this.ciudades[3].temp);

        }
    }

    /**
     * Calcula el valor de ataque de un player en funcion a la region en la que se encuentre
     * @param {*} valores valores del palyer {id, alias, posX, posY, nivel, EC, EF}
     * @returns el valor de ataque
     */
    obtenerAtaque(valores) {//valores: {id, alias, posX, posY, nivel, EC, EF}
        let efecto = this.obtenerRegion(valores.posX, valores.posY);
        console.log(efecto);
        let nivelAtaque;
        switch (efecto) {
            case -1:
                nivelAtaque = valores.nivel + valores.EF;
                return (nivelAtaque <= 0 ? 0 : nivelAtaque);
                break;
            case 1:
                nivelAtaque = valores.nivel + valores.EC;
                return (nivelAtaque <= 0 ? 0 : nivelAtaque);
                break;

            default:
                return valores.nivel;
                break;
        }
    }

    desplazarPlayer(valores, nuevaX, nuevaY) {//valores: {id, alias, posX, posY, nivel, EC, EF}

        let player = this.posiciones.get(valores.posX + '_' + valores.posY);
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.mapa[valores.posX][valores.posY] = "";

        this.posiciones.set(nuevaX + '_' + nuevaY, player);
        this.mapa[nuevaX][nuevaY] = valores.alias;
        valores.posX = nuevaX; valores.posY = nuevaY;
        this.jugadores.set(valores.id, valores);
    }

    eliminarPlayer(valores) {//valores: {id, alias, posX, posY, nivel, EC, EF}
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.jugadores.delete(valores.id);
        this.mapa[valores.posX][valores.posY] = "";

    }
    desplazarNPC(valores, nuevaX, nuevaY) {//valores: {id, posX, posY, nivel}

        let npc = this.posiciones.get(valores.posX + '_' + valores.posY);
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.mapa[valores.posX][valores.posY] = "";

        this.posiciones.set(nuevaX + '_' + nuevaY, npc);
        this.mapa[nuevaX][nuevaY] = valores.nivel;
        valores.posX = nuevaX; valores.posY = nuevaY;
        this.npcs.set(id, valores);

    }

    eliminarNPC(valores) {//valores: {id, posX, posY, nivel}
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.npcs.delete(valores.id);
        this.mapa[valores.posX][valores.posY] = "";

    }

    eliminarAlimento(x, y) {
        this.posiciones.delete(x + '_' + y);
        this.mapa[x][y] = "";
    }

    eliminarMina(x, y) {
        this.posiciones.delete(x + '_' + y);
        this.mapa[x][y] = "";
    }

    /**
     * Comprueba las interacciones del player en funcion a los desplazamientos
     * @param {*} id identificador del player 
     * @param {*} x desplazamiento reltaivo en el eje x
     * @param {*} y desplazamiento relativo en el eje y
     */
    movimientoPlayer(id, x, y) {
        let valores = this.jugadores.get(id);//{id, alias, posX, posY, nivel, EC, EF}

        let nuevaX = valores.posX + x;
        let nuevaY = valores.posY + y;

        if (nuevaX > 19) nuevaX = 0;
        if (nuevaX < 0) nuevaX = 19;
        if (nuevaY > 19) nuevaY = 0;
        if (nuevaY < 0) nuevaY = 19;

        console.log(nuevaX + '_' + nuevaY);


        if (this.posiciones.has(nuevaX + '_' + nuevaY)) {//Posicion valida pero ya ocupada, habra interaccion
            let ocupante = this.posiciones.get(nuevaX + '_' + nuevaY);//{player_id: null o valor, npc_id: null o valor, mina: t/f, alimento: t/f}
            if (ocupante.player_id != null) {//ocupado por otro player
                let valoresOcupante = this.jugadores.get(ocupante.player_id);
                let nivel = this.obtenerAtaque(valores);
                let nivelOcupante = this.obtenerAtaque(valoresOcupante);
                if (nivel === nivelOcupante) {//Igualados, no hay desplazamiento
                    return 'Colision';
                } else if (nivel > nivelOcupante) {//Ocupante pierde, hay desplazamiento
                    this.eliminarPlayer(valoresOcupante);
                    this.desplazarPlayer(valores, nuevaX, nuevaY);
                } else {//Ocupante gana, no hay desplazamiento
                    this.eliminarPlayer(valores)
                    return 'Eliminado';
                }

            } else if (ocupante.npc_id != null) {//ocupado por un npc
                let valoresOcupante = this.nps.get(ocupante.npc_id);//valores: {id, posX, posY, nivel}
                let nivel = this.obtenerAtaque(valores);
                let nivelOcupante = valoresOcupante.nivel;
                if (nivel === nivelOcupante) {//Igualados, no hay desplazamiento
                    return 'Colision';
                } else if (nivel > nivelOcupante) {//Ocupante pierde, hay desplazamiento
                    this.eliminarNPC(valoresOcupante);
                    this.desplazarPlayer(valores, nuevaX, nuevaY);
                } else {//Ocupante gana, no hay desplazamiento
                    this.eliminarPlayer(valores)
                    return 'Eliminado';
                }
            }
            //el npc podria ocultar un alimento o mina
            if (ocupante.alimento) {//El alimento desaparece y hay desplazamiento
                this.eliminarAlimento(nuevaX, nuevaY);
                valores.nivel++;
                this.desplazarPlayer(valores, nuevaX, nuevaY);
                return 'Desplazamiento';

            } else if (ocupante.mina) {//La mina explota y el player muere
                this.eliminarMina(nuevaX, nuevaY);
                this.eliminarPlayer(valores);
                return 'Eliminado';
            }
        } else {//Posicion valida y libre, habra desplazamiento
            this.desplazarPlayer(valores, nuevaX, nuevaY);
            return 'Desplazamiento';

        }

    }

    movimientoNPC(id, x, y) {

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


function nuevaPartida() {

    if (!weather.connected) throw 'Error : No se ha podido conectar con el servidor de clima';

    weather.emit('totalClimas', 'Partida empezada', async (response) => {
        let totalClimas = response.count;
        indiceCiudades(totalClimas);
        await nuevoClima(idCiudades[0])
        await nuevoClima(idCiudades[1])
        await nuevoClima(idCiudades[2])
        await nuevoClima(idCiudades[3])

    });
}


//Servicios ofrecidos

io.on("connection", playerSocket => {
    pool.connect();
    playerSocket.on('SolAcceso', (arg, callback) => {
        console.log(arg.alias + ' solicita inicio de sesion con ' + arg.password);
        pool.query('SELECT id from user_db WHERE alias=\'' + arg.alias + '\' and password=\'' + arg.password + '\'', async (err, res) => {
            try {
                if (err) callback('Error inesperado');
                else {
                    if (res.rowCount === 1) {

                        if (juego === null) {//Instancia no generada
                            await nuevaPartida();
                            juego = new Juego(argumentos.engine.max_jugadores, ciudades);
                            juego.empezar();
                        }

                        if (juego.estado === 'empezado' && juego.lleno()) {//Instancia de juego en marcha o esta llena
                            callback('Error : juego lleno')
                            console.log(arg.alias + ' no ha podido unirse ya que la partida esta en marcha o llena');
                        } else {
                            if (juego.jugadores.get(res.rows[0].id)) {
                                callback('Error : ya estas conectado');
                                console.log(arg.alias + ' no ha podido unirse ya que ya esta en partida');
                                return;
                            }

                            const jugador = juego.nuevoJugador(res.rows[0].id, arg.alias);
                            console.log(jugador);
                            callback(JSON.stringify(jugador));
                            console.log(arg.alias + ' se ha conectado correctamente con el id ' + res.rows[0].id);
                        }
                    } else callback('Error : Credenciales invalidas');
                }

            } catch (err) {
                callback("Error : " + err);
            }
        });

    });
});

consumerNpc.on('message', (message) => {
    let data = JSON.parse(message.value);
    console.log(data);
    if (!juego) return;
    let id = data.id;
    let x = data.x;
    let y = data.y;
    let response = juego.movimientoNPC(id, x, y);
})

//KAFKA : ENGINE RECIBE MOVIMIENTO DE PLAYER
consumerMov.on('message', (message) => {
    //console.log(message.value);
    let movimiento = JSON.parse(message.value);
    let eliminado;
    //console.log(movimiento);
    if (!juego) return;
    if (!juego.jugadores.get(movimiento.id)) return;
    let estado = juego.movimientoPlayer(movimiento.id, movimiento.x, movimiento.y);

    if (estado === 'Eliminado') {
        console.log('El jugador ' + movimiento.id + ' ha sido eliminado');
        eliminado = movimiento.id;
    } else if (estado === 'Colision') {
        console.log('El jugador ' + movimiento.id + ' ha colisionado.');
    } else if (estado === 'Desplazamiento') {
        // console.log(juego.jugadores.get(movimiento.id));
    }

    let payloads = [{ topic: 'partida', messages: JSON.stringify({ eliminado, mapa: juego.mapa }), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.log(err);
    });
});




//reader.read(">", (opcion) => {
//    console.log(opcion);
//    process.exit(0);
//});

io.listen(argumentos.engine.port);






