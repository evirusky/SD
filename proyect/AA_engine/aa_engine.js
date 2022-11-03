const argumentos = require("../arguments.json");
const reader = require("read-console");
const { Jugador } = require("../AA_registry/database.js")

//servidor para registry y engine
const io = require('socket.io')();

//cliente para clima 
const io_client = require('socket.io-client');
const weather = io_client("http://" + argumentos.engine.ip_clima + ":" + argumentos.engine.puerto_clima)

let ciudades = [];
let contador = 5; //inicio =0


//conexion con aa_player
io.on("connection", cliente => {

    cliente.on('clima', (dato) => {
        //conectar con bd y comprobar que el usuario existe

        if (contador < argumentos.engine.max_jugadores) {
            contador++;
        }

        else {
            console.log("ARRANCO NUEVA PARTIDA");

            ciudades = [];

            weather.emit('clima', 'solicito clima');
        }

    });

    cliente.on("compruebo", async (datos) => {
        let existe = false;
        try {
            let alias3 = await Jugador.findOne({ where: datos });
            if (alias = alias3.alias)
                cliente.emit("existe", true)
            else
                cliente.emit("existe", false)

        } catch (error) {
            console.error(error);
            cliente.emit("existe", false)
        }

    });



});

function continuo() {
    console.log(ciudades);
}

weather.on('ciudad', (clima) => {
    // console.log(clima.ciudad + " : " + clima.temperatura);
    ciudades.push(clima);
    if (ciudades.length != 4)
        weather.emit('clima', 'solicito clima');
    else
        continuo();
});



io.listen(argumentos.engine.puerto_escucha);




