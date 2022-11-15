const kafka = require('kafka-node');
const argumentos = require("../arguments.json");

const client = new kafka.KafkaClient({ kafkaHost: argumentos.kafka.ip + ':' + argumentos.kafka.port });
const consumer = new kafka.Consumer(client, [{ topic: 'partida', partition: 0 }],);

const producer = new kafka.Producer(client);


module.exports = { consumer, producer }; // Path: AA_player/consumer.js