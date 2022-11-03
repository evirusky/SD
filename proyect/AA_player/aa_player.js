const argumentos = require("../arguments.json");
const reader = require("read-console");
const io = require("socket.io-client");

const { consumer, producer } = require("../kafka.js");
const { ClientBase } = require("pg");
//const { producer } = require("./productor_e.js") lo importo del engine?


const registry = io("http://" + argumentos.player.ip_registry + ":" + argumentos.player.puerto_registry);
const engine = io("http://" + argumentos.player.ip_engine + ":" + argumentos.player.puerto_engine);

//***********KAFKA */



console.log("**BIENVENIDO** \n1.Crear perfil. \n2.Editar peril. \n3.Unirse a la partida ");
reader.read(">", (opcion) => {
    switch (opcion) {
        case '1':
            //conexión a aa_registry, crea usuario
            reader.read("Introduce el alias :", (alias) => {
                reader.read("Introduce la contraseña :", (contraseña) => {
                    registry.emit("crear", { alias, contraseña });
                })
            });
            break;

        case '2':
            //conexión aa_registry para actualizar perfil jugador ya existente
            reader.read("Introduce el alias :", (alias) => {
                registry.emit("editar", alias);
            })
            break;

        case '3':
            reader.read("Alias : ", (alias) => {
                reader.read("Contraseña : ", (contraseña) => {
                    //autentifico por sockets a engine
                    console.log("Compruebo usuario en la Base de Datos");
                    engine.emit("compruebo", { alias, contraseña });


                });
            });
            break;
    }


});


engine.on("existe", (existe) => {
    if (existe) {
        console.log("existe");
        engine.emit('clima', "pido clima")
    }

    else
        console.error("EL USUARIO NO EXISTE")
});

registry.on("existe_", (existe) => {
    if (existe) {
        console.log("EXISTE")
        reader.read("Introduce los nuevos datos: ", (usuario) => {
            //los envio a la bd 
        })
    }
    else
        console.error("NO EXISTE");
})

//compruebo que existe en bd 
consumer.on('message', (message) => {
    console.log("consumidor")
    console.log(message.value);
});


//si hay un error 
//consumer.on('error', (err) => { console.log(err) })