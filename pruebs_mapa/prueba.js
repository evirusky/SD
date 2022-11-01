//const configuracion = require("./configuracion.json");
//console.log(configuracion.engine.ip);
//console.log(process.env.IP);

const { consumer, producer } = require("./kafka.js");
const readline = require('readline');



//***************MOVIMIENTO MAPA***********************/
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY)
    process.stdin.setRawMode(true);

//crear array 20x20
//let matriz = new Array(20).fill(new Array(20).fill(1));

let matriz = [];
let usuario = { antiguo: { x: 10, y: 10 }, nuevo: { x: 10, y: 10 }, nombre: "Eva" };


for (let i = 0; i < 20; i++) {
    matriz[i] = [];
    for (let j = 0; j < 20; j++) {
        matriz[i][j] = "";
    }
}

matriz[usuario.antiguo.x][usuario.antiguo.y] = usuario.nombre;

console.table(matriz)

process.stdin.on('keypress', (chunk, key) => {
    //console.log(key.name)
    // matriz[usuario.antiguo.x][usuario.antiguo.y] = 1;

    usuario.antiguo.x = usuario.nuevo.x;
    usuario.antiguo.y = usuario.nuevo.y


    switch (key.name) {
        case "up": usuario.nuevo.x -= 1;
            break;
        case "down": usuario.nuevo.x += 1;
            break;
        case "left": usuario.nuevo.y -= 1;
            break;
        case "right": usuario.nuevo.y += 1;
            break;

        case "q": process.exit();

    }

    if (usuario.nuevo.x < 0)
        usuario.nuevo.x = 19;
    if (usuario.nuevo.x > 19)
        usuario.nuevo.x = 0;
    if (usuario.nuevo.y < 0)
        usuario.nuevo.y = 19;
    if (usuario.nuevo.y > 19)
        usuario.nuevo.y = 0;

    let payloads = [{ topic: 'mapa', messages: JSON.stringify(usuario), partition: 0 }];
    //cuando esta listo productor envia msg

    producer.send(payloads, (err, data) => {
        // console.log(data);
    });

});

producer.on('ready', () => {
    console.log("Productor listo");
});

consumer.on('message', (message) => {
    //console.log(message);
    let usr = JSON.parse(message.value);

    console.clear();

    matriz[usr.antiguo.x][usr.antiguo.y] = "";
    matriz[usr.nuevo.x][usr.nuevo.y] = usr.nombre;
    console.table(matriz);
});

