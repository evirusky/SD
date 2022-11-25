const { app, server } = require('./servidores.js');

let personas = [{ nombre: "Eva", edad: 20, dni: 453454, ciudad: "Novelda" },
{ nombre: "Juan", edad: 30, dni: 453455, ciudad: "Alicante" },
{ nombre: "Ana", edad: 40, dni: 453456, ciudad: "Madrid" },
{ nombre: "Luis", edad: 50, dni: 453457, ciudad: "Barcelona" },
{ nombre: "Paco", edad: 60, dni: 453458, ciudad: "Valencia" },
{ nombre: "Maria", edad: 70, dni: 453459, ciudad: "Murcia" },];



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

//Gestión de usuarios

app.get('/personas', (req, res) => {
    res.json(personas);
});

app.get('/personas/:nombre', (req, res) => {
    const persona = personas.find(p => p.nombre === req.params.nombre);
    if (persona) res.json(persona);
    else res.boom.notFound('No se ha encontrado la persona');
});

app.post('/personas', (req, res) => {
    const persona = req.body;
    personas.push(persona);
    res.json(personas);
});

app.put('/personas/:nombre', (req, res) => {
    //const persona = personas.find(p => p.nombre === req.params.nombre);
    let encontrado = false;

    personas = personas.map((p) => {
        if (p.nombre == req.params.nombre) {
            encontrado = true;
            //actualizamos los datos de la persona
            p = { ...p, ...req.body };
        }

        return p;
    });

    if (encontrado)
        res.json(personas);
    else
        res.boom.notFound('No se ha encontrado la persona');


});

app.delete('/personas/:nombre', (req, res) => {
    personas = personas.filter(p => p.nombre !== req.params.nombre);
    res.json(personas);
});

app.get('/personas/busco/:id', (req, res) => {
    //destructuring
    const { id } = req.params;
    if (personas[id]) res.send("Tus datos " + JSON.stringify(personas[id]));
    else res.boom.notFound('La persona no existe en la base de datos');
});

//el servidor lo creo con https
server.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});

