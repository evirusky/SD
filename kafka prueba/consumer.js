const kafka = require('kafka-node');

let client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092', autoConnect: true });

let consumer = new kafka.Consumer(
    client,
    [
        { topic: 'test', partition: 0 },
    ],
    {
        autoCommit: true,
    }
);

consumer.on('message', (message) => {
    console.log(JSON.parse(message.value));
});

consumer.on('error', (err) => { console.log(err) })