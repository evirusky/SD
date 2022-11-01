const argumentos = require("../arguments.json");
const { Clima, inicializar } = require("./database");

const reader = require("read-console");
const { Socket } = require("socket.io");

const io = require("socket.io")();

//inicializar();

io.on("connection", cliente => {

    cliente.on('clima', async (msg) => {

        console.log(msg);

        const ciudad = await Clima.findByPk(3);

        console.log(ciudad.ciudad + " : " + ciudad.temperatura);

        cliente.emit('ciudad', { ciudad: ciudad.ciudad, temperatura: ciudad.temperatura });
    });



})

io.listen(argumentos.clima.puerto_escucha);