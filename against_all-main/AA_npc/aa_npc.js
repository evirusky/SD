const kafka = require('kafka-node');
const reader = require("read-console");

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);

client.createTopics(["npc"], (err, result) => {
    if (err)
        console.error("Error: ", err);
    else
        console.log("Result: ", result);
});


setInterval(() => {

    reader.read("", (id) => {

        let npc = { id: id };

        if (npc.id == 'q') process.exit();

        let payloads = [{ topic: "npc", messages: JSON.stringify(npc), partition: 0 }];

        producer.send(payloads, (err, data) => {
            if (err) console.error(err);
            console.log("Enviado: ", npc);
        });

    });
}, 2000);


