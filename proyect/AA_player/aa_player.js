const argumentos = require("../arguments.json");
const reader = require("read-console");

const io = require("socket.io-client");

const registry = io("http://" + argumentos.player.ip_registry + ":" + argumentos.player.puerto_registry);
const engine = io("http://" + argumentos.player.ip_engine + ":" + argumentos.player.puerto_engine);


console.log("**BIENVENIDO** \n1.Crear perfil. \n2.Editar peril. \n3.Unirse a la partida ");
reader.read(">", (opcion) => {
    switch (opcion) {
        case '1':
            //conexión a aa_registry, crea usuario
            registry.emit("crear", "creo usuario");
            break;
        case '2':
            //conexión aa_registry para actualizar perfil jugador ya existente
            registry.emit("editar", "edito usuario");
            break;
        case '3':

            reader.read("Alias : ", (alias) => {
                reader.read("Contraseña : ", (contraseña) => {
                    //autentifico por sockets a engine
                    engine.emit("datos", { alias, contraseña });
                });
            });
            break;
    }


});