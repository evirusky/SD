const argumentos = require("../arguments.json");
const reader = require("read-console");
const readline = require('readline');

const io = require("socket.io-client");

const producer = require("./producer.js");
const consumer = require("./consumer.js");

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
console.log("**BIENVENIDO** \n1.Crear perfil. \n2.Editar peril. \n3.Unirse a la partida\nq.Salir ");
reader.read(">", (opcion) => {
    switch (opcion) {
        case '1':
            //conexión a aa_registry, crea usuario
            reader.read("Alias : ", (alias) => {
                reader.read("Contraseña : ", (password) => {
                    //autentifico por sockets a engine
                    registry.emit("nuevoUsuario", { alias, password }, (response) => {
                        console.log(response);
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
                        registry.emit("modificarUsuario", { alias, password, nPassword }, (response) => {
                            console.log(response);
                        });
                    });
                });
            });
            break;
        case '3':

            reader.read("Alias : ", (alias) => {
                reader.read("Contraseña : ", (password) => {
                    //autentifico por sockets a engine
                    engine.emit("SolAcceso", { alias, password }, (response) => {
                        //console.log(response);
                        if (response.includes("Error")) {
                            console.log(response);
                            return;
                        }

                        jugador = JSON.parse(response);
                        console.log("Jugador " + jugador.alias + " con id " + jugador.id + ". Bienvenido a la partida :)");

                        //capturo las teclas 
                        capturaTecla(jugador.id);

                        //Me suscribo al topico partida y muestro el mapa que recibo de engine
                        consumer.on('message', (message) => {

                            let mapa = JSON.parse(message.value);
                            console.table(mapa);
                        });
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




engine.on("Eliminado", (id) => {
    console.log("Jugador " + id + " eliminado");
    if (jugador && id == jugador.id) {
        console.log("Has sido eliminado");
        process.stdin.removeAllListeners('keypress');
        process.exit();
    }
});