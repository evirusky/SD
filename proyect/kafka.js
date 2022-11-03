const kafka = require("kafka-node");
const argumentos = require("./arguments.json");

const client = new kafka.KafkaClient({ kafkaHost: argumentos.player.ip_broker + ":" + argumentos.player.puerto_broker });
const producer = new kafka.Producer(client);

//let topico_mapa = false;
//let coord = { x: 0, y: 0 }
//let payloads = [{ topic: 'mapa', messages: JSON.stringify(coord), partition: 0 }];

const topics = [{
    topic: 'juego',
    partitions: 1,
    replicationFactor: 1
}];

client.createTopics(topics, (err, data) => {
    if (err)
        console.error("Error!", err)
    //else
    //  console.log("Topicos creados!", data);

});

const consumer = new kafka.Consumer(
    client,
    [{ topic: 'juego', partition: 0 },],
    {
        autoCommit: true,
    }
);


module.exports = { producer, consumer }