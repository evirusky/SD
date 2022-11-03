const kafka = require("kafka-node");

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

const producer = new kafka.Producer(client);

//let topico_mapa = false;
let coord = { x: 0, y: 0 }

let payloads = [{ topic: 'mapa', messages: JSON.stringify(coord), partition: 0 }];


//defino los topicos
const topics = [{
    topic: 'mapa',
    partitions: 1,
    replicationFactor: 1
}];

//creo los topicos
client.createTopics(topics, (err, data) => {
    if (err)
        console.error("Error!", err)
    else
        console.log("Topicos creados!", data);

});



producer.on('ready', () => {
    console.log("productor listo!");


    producer.send(payloads, (err, data) => {

    })
});


//si hay un error
producer.on('error', (err) => { console.log(err) })



module.exports = { producer }