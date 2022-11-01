const kafka = require("kafka-node");

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

const producer = new kafka.Producer(client);

const topics = [{
    topic: 'mapa',
    partitions: 1,
    replicationFactor: 1
}];


client.createTopics(topics, (err, data) => {
    if (err)
        console.error("Error!", err)
    else
        console.log("Topicos creados!", data);
});

const consumer = new kafka.Consumer(
    client,
    [{ topic: 'mapa', partition: 0 },],
    {
        //muestra solo los mensajes que no he leido, false los muestra todos cada vez  q arranque prog
        autoCommit: true,
    }
);

//para exprtar las variables de este archivo al require
module.exports = { consumer, producer }