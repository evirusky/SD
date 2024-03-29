const argumentos = require("../arguments.json");
const reader = require("read-console");
const readline = require('readline');
const md5 = require("md5");

const io = require("socket.io-client");

const { consumer, producer } = require("./kafka.js");

const registry = io("http://" + argumentos.registry.ip + ":" + argumentos.registry.port);
const engine = io("http://" + argumentos.engine.ip + ":" + argumentos.engine.port);

let jugador;

//Función captura tecla pulsada por teclado y almacena las coordenadas
function capturaTecla(id) {

    let usuario = { x: 0, y: 0, id: id };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY)
        process.stdin.setRawMode(true);

    process.stdin.on('keypress', (chunk, key) => {

        usuario.x = 0;
        usuario.y = 0;
        switch (key.name) {
            case "up": usuario.x = -1;
                break;
            case "down": usuario.x = 1;
                break;
            case "left": usuario.y = -1;
                break;
            case "right": usuario.y = 1;
                break;

            case "q":
                process.exit();
        }

        //console.log(usuario);
        //player envia al topico movimiento sus coordenadas
        let payloads = [{ topic: 'movimiento', messages: JSON.stringify(usuario), partition: 0 }];

        producer.send(payloads, (err, data) => {
            if (err) console.error(err);

        });

    });

}



//MENÚ
function menu() {
    console.log(" \n\x1b[31mMENÚ PRINCIPAL\x1b[0m \n1.Crear perfil. \n2.Editar peril. \n3.Unirse a la partida\nq.Salir ");
    reader.read(">", (opcion) => {
        switch (opcion) {
            case '1':
                //conexión a aa_registry, crea usuario
                reader.read("Alias : ", (alias) => {
                    reader.read("Contraseña : ", (password) => {
                        //autentifico por sockets a engine
                        if (!registry.connected) console.log('Error : No se ha podido conectar con el servidor registry');

                        registry.emit("nuevoUsuario", { alias, password: md5(password) }, (response) => {
                            console.log(response);
                            menu();
                        });

                    });
                });
                break;
            case '2':
                //conexión aa_registry para actualizar perfil jugador ya existente
                reader.read("Alias : ", (alias) => {
                    reader.read("Contraseña : ", (password) => {
                        reader.read("Nueva Contraseña : ", (nPassword) => {
                            //autentifico por sockets a engine
                            if (!registry.connected) console.log("Error : No se ha podido conectar al servidor registry");
                            registry.emit("modificarUsuario", { alias, password: md5(password), nPassword: md5(nPassword) }, (response) => {
                                console.log(response);
                                menu();
                            });

                        });
                    });
                });
                break;
            case '3':

                reader.read("Alias : ", (alias) => {
                    reader.read("Contraseña : ", (password) => {
                        //autentifico por sockets a engine
                        if (!engine.connected)
                            console.log("Error : No se ha podido conectar al servidor engine");



                        engine.emit("SolAcceso", { alias, password: md5(password) }, (response) => {
                            //console.log(response);
                            if (response.includes("Error")) {
                                console.log(response);
                                menu();

                            }

                            else {
                                jugador = JSON.parse(response);
                                console.log(jugador.alias + ": usuario autentificado correctamente");

                                //Espero mensaje de engine para comenzar partida 


                                console.log("\x1b[94m Comienza la partida\x1b[0m");
                                console.log("Jugador " + jugador.alias + " con id " + jugador.id + ". \x1b[96mBienvenido a la partida :)\x1b[0m");
                                console.log("\x1b[90mPulsa cualquier tecla para moverte (up, down, left, right)\x1b[0m ")
                                //capturo las teclas 
                                capturaTecla(jugador.id);

                                //Me suscribo al topico partida y muestro el mapa que recibo de engine
                                consumer.on('message', (message) => {

                                    let id = JSON.parse(message.value).eliminado;
                                    let mapa = JSON.parse(message.value).mapa;
                                    let winner = JSON.parse(message.value).winner;
                                    let id_winner = JSON.parse(message.value).id_winner;
                                    console.table(mapa);

                                    if (id) console.log("Jugador " + id + " ha sido eliminado");
                                    if (winner) {
                                        console.log("\x1b[91mJugador " + id_winner + " ha ganado la partida!! FELICIDADES :D\x1b[0m");
                                        process.exit();
                                    }
                                    if (jugador && id == jugador.id) {
                                        console.log("Has sido eliminado");
                                        process.stdin.removeAllListeners('keypress');
                                        process.exit();
                                    }
                                });
                            }

                        });
                    });
                });



                break;
            case 'q':
                console.log('Finalizando proceso correctamente');

                process.exit(0);
                break;
            default:
                console.log('Opcion no valida, forzado cierre');
                process.exit(1);
        }


    });

}

engine.on('empiezo', (respuesta) => {
    console.log(respuesta);

});

console.log("\x1b[93m **BIENVENIDO A AGAINST ALL** \x1b[0m")
menu();