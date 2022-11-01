const argumentos = require("../arguments.json");
const reader = require("read-console");

const io = require('socket.io')();

io.on('connection', cliente => {

    cliente.on("crear", arg => {
        console.log(arg);
    })

    cliente.on("editar", arg => {
        console.log(arg);
    })


})



io.listen(argumentos.registry.puerto_escucha);