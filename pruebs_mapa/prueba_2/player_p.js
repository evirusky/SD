const kafka = require("kafka-node");
const { producer } = require("./productor_p.js");
const reader = require("read-console")

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

const consumer = new kafka.Consumer(
    client,
    [{ topic: 'coordenadas', partition: 0 },],
    {
        //muestra solo los mensajes que no he leido, false los muestra todos cada vez  q arranque prog
        autoCommit: true,
    }
);

console.log("QUIERO JUGAR!")



consumer.on('message', (message) => {
    let datos2 = JSON.parse(message.value);
    reader.read("introduce posición: ", (i) => {
        datos2[i] = 0;

        console.log(datos2);
    });


})