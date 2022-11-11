const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const consumer = new kafka.Consumer(client, [{ topic: 'partida', partition: 0 }],);

module.exports = consumer; // Path: AA_player/consumer.js