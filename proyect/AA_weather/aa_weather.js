const argumentos = require("../arguments.json");
const { Clima, inicializar } = require("./database");

const reader = require("read-console");
const { Socket } = require("socket.io");

const io = require("socket.io")();

inicializar();

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

io.on("connection", cliente => {

    cliente.on('clima', async (msg) => {

        console.log(msg);
        let num = getRandomInt(1, 6);
        const ciudad = await Clima.findByPk(num);

        console.log(ciudad.ciudad + " : " + ciudad.temperatura);

        cliente.emit('ciudad', { ciudad: ciudad.ciudad, temperatura: ciudad.temperatura });
    });



})

io.listen(argumentos.clima.puerto_escucha);