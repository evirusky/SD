const argumentos = require("../arguments.json");
const reader = require("read-console");
const { Sequelize } = require('sequelize');
const { Pool, Client } = require('pg');
const md5 = require("md5");

const { consumerMov, consumerNpc, producer } = require("./kafka.js");

const delay = ms => new Promise(res => setTimeout(res, ms));

const connectionData = {
    user: argumentos.db.user,
    host: argumentos.db.host,
    database: argumentos.db.db_name,
    password: argumentos.db.pass,
    port: argumentos.db.port,
}
//Inicia sesion sequelize con los datos de conectionData
const sequelize = new Sequelize(connectionData.database, connectionData.user, connectionData.password, {
    host: connectionData.host,
    port: connectionData.port,
    dialect: 'postgres',
    logging: false

});
const User = sequelize.define('user_db', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    alias: { type: Sequelize.STRING, allowNull: false },
    password: { type: Sequelize.STRING, allowNull: false },
    level: { type: Sequelize.INTEGER, defaultValue: 1 },
    ec: { type: Sequelize.INTEGER, defaultValue: 0 },
    ef: { type: Sequelize.INTEGER, defaultValue: 100 },
    x: { type: Sequelize.INTEGER, defaultValue: 0 },
    y: { type: Sequelize.INTEGER, defaultValue: 0 }
}, {
    freezeTableName: true,
    timestamps: false,

    // If don't want createdAt
    createdAt: false,

    // If don't want updatedAt
    updatedAt: false

});

/** Hasea la contraseña y la guarda en la base de datos 
User.findAll().then(users => {
    users.forEach(user => {
        user.password = md5(user.password);
        user.save();
    });
}); 
*/

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
const MAX = 10;
const MIN = -10;
/**
 * Clase que implementa la logica del Against All
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
     * @param {integer} id id del jugador
     * @param {integer} alias alias del jugador
     * @returns atributos almacenados para jugar con el formato {id, alias, posX, posY, nivel, EC, EF} 
     */
    nuevoJugador(id, alias) {
        if (id < 1000) this.countJugadores++;
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
     * Se añade un nuevo npc en una posicion no ocupada por players o npcs
     * @returns atributos almacenados para jugar con el formato {id, posX, posY, nivel}
     */
    nuevoNPC(id) {
        let x, y, key;
        let valido = false;

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
        this.posiciones.set(x + '_' + y, valores);
        return this.npcs.get(id);
    }
    /**
     * Logica interna para eliminar la posibilidad de nuevos jugadores en una partida empezada
     */
    empezar() {
        this.estado = 'empezado';
        this.spawn = new Array();
    }

    /**
   * Comprueba que la partida este llena
   * @returns true si la partida esta llena, false en el caso contrario
   */
    lleno() {
        return this.countJugadores === this.max_jugadores;
    }

    /**
     * Obtiene el tipo de region en funcion a la temperatura
     * @param {*} temp 
     * @returns 1 frio, 0 normal y 1 caliente
     */
    obtenerEfecto(temp) {
        if (!temp) return;
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
        if (x < 10 && y < 10) {//Region [0]
            return this.obtenerEfecto(this.ciudades[0].temp);

        } else if (x < 20 && y < 10) {//Region [1]
            return this.obtenerEfecto(this.ciudades[1].temp);

        } else if (x < 10 && y < 20) {//Region [2]
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
    /**
     * Logica de desplazamiento del Player
     * @param {*} valores {id, alias, posX, posY, nivel, EC, EF} que representan al player que se desplaza
     * @param {*} nuevaX posicion en el eje x
     * @param {*} nuevaY posicion en el eje y
     */
    desplazarPlayer(valores, nuevaX, nuevaY) {//valores: {id, alias, posX, posY, nivel, EC, EF}

        let player = this.posiciones.get(valores.posX + '_' + valores.posY);
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.mapa[valores.posX][valores.posY] = "";

        this.posiciones.set(nuevaX + '_' + nuevaY, player);
        this.mapa[nuevaX][nuevaY] = valores.alias;
        valores.posX = nuevaX; valores.posY = nuevaY;
        this.jugadores.set(valores.id, valores);
    }
    /**
 * Logica de eliminacion del player
 * @param {*} valores {id, alias, posX, posY, nivel, EC, EF} que representa al player que se elimina
 */
    eliminarPlayer(valores) {//valores: {id, alias, posX, posY, nivel, EC, EF}
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.jugadores.delete(valores.id);
        this.mapa[valores.posX][valores.posY] = "";

    }
    /**
        * Logica de desplazamiento del NPC
        * @param {*} valores {id, posX, posY, nivel} que representan al NPC que se desplaza
        * @param {*} nuevaX posicion en el eje x
        * @param {*} nuevaY posicion en el eje y
        */
    desplazarNPC(valores, nuevaX, nuevaY) {//valores: {id, posX, posY, nivel}


        let npc = this.posiciones.get(valores.posX + '_' + valores.posY);
        if (!npc) return;
        let previo = "";
        if (npc.mina) {
            npc.mina = false;
            previo = "M";
            this.posiciones.set(valores.posX + '_' + valores.posY, { player_id: null, npc_id: null, mina: true, alimento: false })
        } else if (npc.alimento) {
            npc.alimento = false;
            previo = "A";
            this.posiciones.set(valores.posX + '_' + valores.posY, { player_id: null, npc_id: null, mina: false, alimento: true })
        } else {
            this.posiciones.delete(valores.posX + '_' + valores.posY);

        }
        this.mapa[valores.posX][valores.posY] = previo;
        if (this.posiciones.has(nuevaX + '_' + nuevaY)) {
            let nuevoNPC = this.posiciones.get(nuevaX + '_' + nuevaY)
            nuevoNPC.npc_id = npc.npc_id;
            this.posiciones.set(nuevaX + '_' + nuevaY, nuevoNPC);
        } else {
            this.posiciones.set(nuevaX + '_' + nuevaY, npc);
        }
        this.mapa[nuevaX][nuevaY] = valores.nivel;
        valores.posX = nuevaX; valores.posY = nuevaY;
        this.npcs.set(valores.id, valores);

    }
    /**
    * Logica de eliminacion del player
    * @param {*} valores {id, posX, posY, nivel} que representa al NPC que se elimina
    */
    eliminarNPC(valores) {//valores: {id, posX, posY, nivel}
        this.posiciones.delete(valores.posX + '_' + valores.posY);
        this.npcs.delete(valores.id);
        this.mapa[valores.posX][valores.posY] = "";

    }
    /**
     * Se elimina un alimento
     * @param {*} x posicion en el eje x
     * @param {*} y posicion en el eje y
     */
    eliminarAlimento(x, y) {
        this.posiciones.delete(x + '_' + y);
        this.mapa[x][y] = "";
    }

    /**
     * Se elimina una mina
     * @param {*} x posicion en el eje x
     * @param {*} y posicion en el eje y
     */
    eliminarMina(x, y) {
        this.posiciones.delete(x + '_' + y);
        this.mapa[x][y] = "";
    }


    /**
     * Comprueba las interacciones del player en funcion a los desplazamientos
     * @param {*} id identificador del player 
     * @param {*} x desplazamiento reltaivo en el eje x
     * @param {*} y desplazamiento relativo en el eje y
     * @retuns Colision (sin desplazamiento) Eliminado (Si el player actual ha sido eliminado) Desplazamiento (si se ha podido desplazar a la posicion deseada)
     */
    movimientoPlayer(id, x, y) {
        if (!this.jugadores.has(id)) return 'Eliminado';
        let valores = this.jugadores.get(id);//{id, alias, posX, posY, nivel, EC, EF}

        let nuevaX = valores.posX + x;
        let nuevaY = valores.posY + y;

        if (nuevaX > 19) nuevaX = 0;
        if (nuevaX < 0) nuevaX = 19;
        if (nuevaY > 19) nuevaY = 0;
        if (nuevaY < 0) nuevaY = 19;

        //ALMACENO EL VALOR DEL JUGAODR EN LA BD
        User.findByPk(id).then(user => {
            user.x = nuevaX;
            user.y = nuevaY;
            user.level = valores.nivel;
            user.ec = valores.EC;
            user.ef = valores.EF;
            user.save();
        });




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
                let valoresOcupante = this.npcs.get(ocupante.npc_id);//valores: {id, posX, posY, nivel}
                let nivel = this.obtenerAtaque(valores);
                let nivelOcupante = valoresOcupante.nivel;
                if (nivel === nivelOcupante) {//Igualados, no hay desplazamiento
                    return 'Colision';
                } else if (nivel > nivelOcupante) {//Ocupante pierde, hay desplazamiento
                    this.eliminarNPC(valoresOcupante);
                    this.desplazarPlayer(valores, nuevaX, nuevaY);
                    return 'Eliminado';
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

    /**
     * Comprueba las interacciones del NPC en funcion a los desplazamientos
     * @param {*} id identificador del NPC 
     * @param {*} x desplazamiento reltaivo en el eje x
     * @param {*} y desplazamiento relativo en el eje y
     * @retuns Colision (sin desplazamiento) Eliminado (Si el NPC actual ha sido eliminado) Desplazamiento (si se ha podido desplazar a la posicion deseada)
     */
    movimientoNPC(id, x, y) {
        if (!this.npcs.has(id)) return 'Eliminado';
        let valores = this.npcs.get(id);//{id, posX, posY, nivel}
        let nuevaX = valores.posX + x;
        let nuevaY = valores.posY + y;

        if (nuevaX > 19) nuevaX = 0;
        if (nuevaX < 0) nuevaX = 19;
        if (nuevaY > 19) nuevaY = 0;
        if (nuevaY < 0) nuevaY = 19;

        if (this.posiciones.has(nuevaX + '_' + nuevaY)) {//Posicion valida pero ya ocupada, habra interaccion
            let ocupante = this.posiciones.get(nuevaX + '_' + nuevaY);//{player_id: null o valor, npc_id: null o valor, mina: t/f, alimento: t/f}
            if (ocupante.player_id != null) {//ocupado por otro player
                let valoresOcupante = this.jugadores.get(ocupante.player_id);
                let nivel = valores.nivel;
                let nivelOcupante = this.obtenerAtaque(valoresOcupante);
                if (nivel === nivelOcupante) {//Igualados, no hay desplazamiento
                    return 'Colision';
                } else if (nivel > nivelOcupante) {//Ocupante pierde, hay desplazamiento
                    this.eliminarPlayer(valoresOcupante);
                    this.desplazarNPC(valores, nuevaX, nuevaY);
                } else {//Ocupante gana, no hay desplazamiento
                    this.eliminarNPC(valores)
                    return 'Eliminado';
                }

            } else if (ocupante.npc_id != null) {//ocupado por un npc
                let valoresOcupante = this.npcs.get(ocupante.npc_id);//valores: {id, posX, posY, nivel}
                let nivel = valores.nivel;
                let nivelOcupante = valoresOcupante.nivel;
                if (nivel === nivelOcupante) {//Igualados, no hay desplazamiento
                    return 'Colision';
                } else if (nivel > nivelOcupante) {//Ocupante pierde, hay desplazamiento
                    this.eliminarNPC(valoresOcupante);
                    this.desplazarNPC(valores, nuevaX, nuevaY);
                } else {//Ocupante gana, no hay desplazamiento
                    this.eliminarNPC(valores)
                    return 'Eliminado';
                }
            }
            //el npc podria ocultar un alimento o mina
            if (ocupante.alimento || ocupante.mina) {//El alimento o la mina se oculta por
                this.desplazarNPC(valores, nuevaX, nuevaY);
                return 'Desplazamiento';

            }
        } else {//Posicion valida y libre, habra desplazamiento
            this.desplazarNPC(valores, nuevaX, nuevaY);
            return 'Desplazamiento';

        }
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

    return new Promise(function (resolve, reject) {

        weather.emit('totalClimas', 'Partida empezada', async (response) => {
            let totalClimas = response.count;
            indiceCiudades(totalClimas);
            await nuevoClima(idCiudades[0])
            await nuevoClima(idCiudades[1])
            await nuevoClima(idCiudades[2])
            await nuevoClima(idCiudades[3])
            resolve();
        });
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}


//CONEXION CON PLAYER 

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
                            console.log(juego.ciudades, juego.max_jugadores);

                            playerSocket.emit('empiezo', '\x1b[93mCreada nueva partida. Esperando jugadores...\x1b[0m ');

                            //Espero 5 segudos a que se unan jugadores 
                            await delay(5000);
                            juego.empezar(); //cambio estado = 'empezado'

                        }

                        if (juego.estado === 'empezado' && juego.lleno()) {//Instancia de juego en marcha o esta llena
                            callback('Error : juego lleno')
                            console.log(arg.alias + ' no ha podido unirse ya que la partida esta en marcha o llena.');
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
                    } else callback('Error : Credenciales invalidas ');
                }

            } catch (err) {
                callback("Error : " + err);
            }
        });

    });
});


consumerNpc.on('message', (message) => {
    let data = JSON.parse(message.value);
    //console.log(data);
    if (!juego) return;
    let id = data.id;

    if (!juego.npcs.has(id)) {
        npc = juego.nuevoNPC(id);
        console.log(npc);

    }
    else console.log("El npc ya existe");

})

let winner = false;
//KAFKA : ENGINE RECIBE MOVIMIENTO DE PLAYER
consumerMov.on('message', (message) => {
    //console.log(message.value);
    let movimiento = JSON.parse(message.value);
    let eliminado;
    let id_winner;
    //console.log(movimiento);
    //console.log(juego.ciudades);

    if (!juego) return;



    if (!juego) return;
    if (!juego.jugadores.get(movimiento.id)) return;
    let estado = juego.movimientoPlayer(movimiento.id, movimiento.x, movimiento.y);

    if (estado === 'Eliminado') {
        console.log('El jugador ' + movimiento.id + ' ha sido eliminado');
        eliminado = movimiento.id;
    } else if (estado === 'Colision') {
        console.log('El jugador ' + movimiento.id + ' ha colisionado.');
    }




    //LOS NPCS SE MUEVEN 
    for (let i = 0; i < juego.npcs.size; i++) {
        x = getRandomInt(-1, 1);
        y = getRandomInt(-1, 1);

        let id = Array.from(juego.npcs.keys())[i];
        //console.log("NPC: " + id + " " + x + " :" + y)
        let response = juego.movimientoNPC(id, x, y);
        if (response === 'Eliminado') {
            console.log('El npc ' + id + ' ha sido eliminado');
            eliminado = id;
        } else if (response === 'Colision') {
            // console.log('El npc ' + id + ' ha colisionado.');
        }
    }

    if (juego.npcs.size === 0 && juego.jugadores.size === 1) {
        console.log('Partida finalizada');
        //juego = null;
        winner = true;
        id_winner = Array.from(juego.jugadores.keys())[0];
    }

    let payloads = [{ topic: 'partida', messages: JSON.stringify({ eliminado, mapa: juego.mapa, winner, id_winner }), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.log(err);
    });


    //delay(2000);
    if (winner || juego.jugadores.size == 0) {
        delay(2000);

        juego = null;
    }

});




//reader.read(">", (opcion) => {
//    console.log(opcion);
//    process.exit(0);
//});


io.listen(argumentos.engine.port);






