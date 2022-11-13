const kafka = require('kafka-node');


const client1 = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });
const client2 = new kafka.KafkaClient({ kafkaHost: 'localhost:9092' });

const consumerNpc = new kafka.Consumer(client1, [{ topic: "npc", partition: 0 }],);
//ponerlo por separado con otro cliente
const consumerMov = new kafka.Consumer(client2, [{ topic: 'movimiento', partition: 0 }],);

module.exports = { consumerMov, consumerNpc }; // Path: AA_player/consumer.js