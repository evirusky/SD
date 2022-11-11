const reader = require("read-console");

function leeConsola(msg) {
    return new Promise((resolve, reject) => {
        try {
            reader.read(msg, (name) => {
                resolve(name);
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function holaMundo() {
    const name = await leeConsola("¿Cómo te llamas? ");
    const edad = await leeConsola("¿Cuántos años tienes? ");
    console.log(`Hola ${name}, tienes ${edad} años`);
    process.exit(0);
}

holaMundo();