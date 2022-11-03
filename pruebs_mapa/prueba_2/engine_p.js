const kafka = require("kafka-node");
const reader = require("read-console")
const { producer } = require("./productor_e.js")

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

//




const consumer = new kafka.Consumer(
    client,
    [{ topic: 'mapa', partition: 0 },],
    {
        //muestra solo los mensajes que no he leido, false los muestra todos cada vez  q arranque prog
        autoCommit: true,
    }
);

consumer.on('message', (message) => {
    console.log("consumidor")
    console.log(message.value);
});


//si hay un error 
consumer.on('error', (err) => { console.log(err) })

//module.exports = { consumer }