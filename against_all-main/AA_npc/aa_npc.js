const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);

client.createTopics(["npc"], (err, result) => {
    if (err)
        console.error("Error: ", err);
    else
        console.log("Result: ", result);
});

// cada 4 segundos se envia un mensaje al topic npc
//  con coordenadas entre 0 y 19 aleatorias y una id superior a 1000
setInterval(() => {
    let usuario = {

        id: process.argv[2]
    };
    let payloads = [{ topic: "npc", messages: JSON.stringify(usuario), partition: 0 }];

    producer.send(payloads, (err, data) => {
        if (err) console.error(err);
        console.log("Enviado: ", usuario);
    });
}, 4000);