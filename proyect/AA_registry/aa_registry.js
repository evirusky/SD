const argumentos = require("../arguments.json");
const reader = require("read-console");
const { Jugador, inicializar } = require("./database");
const { read } = require("read-console");

const io = require('socket.io')();

io.on('connection', cliente => {

    cliente.on("crear", ({ alias, contraseña }) => {
        inicializar(alias, contraseña);
    });


    cliente.on("editar", async (alias) => {
        try {
            let jugador1 = await Jugador.findByPk(alias);
            if (jugador1.alias = alias) {
                cliente.emit("existe_", (true));
                //edito jugador con datos

            }

            else
                cliente.emit("exise_", false);
        } catch (error) {
            console.error(error);
            cliente.emit("existe_", false);
        }

    });

})



io.listen(argumentos.registry.puerto_escucha)