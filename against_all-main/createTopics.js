const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });


client.createTopics(["npc", 'movimiento', "partida"], (err, result) => {
    if (err)
        console.error("Error: ", err);
    else
        console.log("Result: ", result);

    process.exit();
});

