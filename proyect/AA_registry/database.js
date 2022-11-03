const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize('postgres://root:root@localhost:5432/juego')



const Jugador = sequelize.define('Jugadores', {
    // Model attributes are defined here
    coordenada_x: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
            max: 19
        }
    },
    coordenada_y: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
            max: 19
        }
    },
    alias: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    contraseña: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nivel: {
        //por defecto 1
        type: DataTypes.INTEGER,
        defaultValue: 1

    },
    EF: {
        type: DataTypes.INTEGER
    },
    EC: {
        type: DataTypes.INTEGER
    }
});


async function inicializar(alias, contraseña) {
    try {
        await sequelize.authenticate();
        await Jugador.sync({ alter: true }); //force:true 
        await Jugador.create({ alias, contraseña });

    }
    catch (e) {
        console.error(e.original);
    }
}


module.exports = { Jugador, inicializar };