const kafka = require("kafka-node");
const argumentos = require("../arguments.json");


const client = new kafka.KafkaClient({ kafkaHost: argumentos.npc.ip_broker + ":" + argumentos.npc.puerto_broker });

const consumer = new kafka.Consumer(
    client,
    [{ topic: 'juego', partition: 0 },],
    {
        autoCommit: true,
    }
);

consumer.on('message', (message) => {
    console.log(message.value);
});


//si hay un error 
consumer.on('error', (err) => { console.log(err) });