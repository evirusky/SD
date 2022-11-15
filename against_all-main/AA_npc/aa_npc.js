const kafka = require('kafka-node');
const reader = require("read-console");
const argumentos = require("../arguments.json");

const client = new kafka.KafkaClient({ kafkaHost: argumentos.kafka.ip + ':' + argumentos.kafka.port });
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

