const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const producer = new kafka.Producer(client);


client.createTopics(["partida", "npc", 'movimiento'], (err, result) => {
    if (err)
        console.error("Error: ", err);
    else
        console.log("Result: ", result);
});


module.exports = producer; // Path: AA_engine/producer.js