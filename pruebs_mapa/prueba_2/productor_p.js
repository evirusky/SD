const kafka = require("kafka-node");

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

const producer = new kafka.Producer(client);

//let topico_mapa = false;
let datos = [1, 2, 3, 4, 5, 6, 7, 8]


let payloads_2 = [{ topic: 'coordenadas', messages: JSON.stringify(datos), partition: 0 }];

//defino los topicos
const topics = [
    {
        topic: 'coordenadas',
        partitions: 1,
        replicationFactor: 1
    }];

//creo los topicos
client.createTopics(topics, (err, data) => {
    if (err)
        console.error("Error!", err)
    else
        console.log("Topicos creados!", data.topic);

});



producer.on('ready', () => {
    console.log("productor listo!");

    producer.send(payloads, (err, data) => {

    })
});


//si hay un error
producer.on('error', (err) => { console.log(err) })



//module.exports = { producer }