const kafka = require('kafka-node');
const reader = require("read-console");

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);




function leerID() {
    reader.read("", (id) => {

        let npc = { id: id };

        if (npc.id == 'q') process.exit();

        let payloads = [{ topic: "npc", messages: JSON.stringify(npc), partition: 0 }];

        producer.send(payloads, (err, data) => {
            if (err) console.error(err);
            console.log("Enviado: ", npc);
            leerID();
        });


    });
};

leerID();

