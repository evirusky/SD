const { app, server } = require('./servidores.js');


//let personas = [{ nombre: "Eva", edad: 20, dni: 453454, ciudad: "Novelda" }];

let nombres = ['Juan ', 'Pedro', 'Rosa']

// Rutas

app.get('/', (req, res) => {
    //req = lo que recibimos del cliente (peticion)
    //proceso una logica y le devuelvo el resultado a quien me ha hecho la peticion 
    res.json({ message: 'Bienvenido a mi servidor :D' });
});

app.get('/tiempo', (req, res) => {
    res.json(new Date());
});

app.get('/hola/mundo', (req, res) => {
    res.json({ saludo: 'Hola desconocido' });
});

app.get('/hola/:nombre', (req, res) => { //podemos recibir datos desde la url 
    res.json({ saludo: 'Hola ' + req.params.nombre });
});

app.delete('/usuario/:nombre', (req, res) => {
    nombres = nombres.filter(nombre => nombre !== req.params.nombre);
    res.json(nombres);
});

app.get('/usuario/:id', (req, res) => {
    if (nombres[req.params.id]) {

        res.json({ nombre: 'Tu nombre ' + nombres[req.params.id] });
    }
    else {
        res.boom.notFound('El usuario no existe');
    }
});

app.post('/usuario', (req, res) => {
    nombres.push(req.body.nombre);
    res.json({ nombre: 'Tu nombre ' + req.body.nombre });
});

app.get('/espera', (req, res) => { });

//el servidor lo creo con https
server.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});

