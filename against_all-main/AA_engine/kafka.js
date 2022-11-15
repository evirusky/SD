const kafka = require('kafka-node');
const argumentos = require("../arguments.json");


const client1 = new kafka.KafkaClient({ kafkaHost: argumentos.kafka.ip + ':' + argumentos.kafka.port });
const client2 = new kafka.KafkaClient({ kafkaHost: argumentos.kafka.ip + ':' + argumentos.kafka.port });

const producer = new kafka.Producer(client2);



const consumerNpc = new kafka.Consumer(client1, [{ topic: "npc", partition: 0 }],);
//ponerlo por separado con otro cliente
const consumerMov = new kafka.Consumer(client2, [{ topic: 'movimiento', partition: 0 }],);

module.exports = { consumerMov, consumerNpc, producer }; // Path: AA_engine/consumer.js