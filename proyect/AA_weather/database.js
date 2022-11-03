const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize('postgres://root:root@localhost:5432/juego')



const Clima = sequelize.define('Clima', {
    // Model attributes are defined here
    ciudad: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    temperatura: {
        type: DataTypes.DECIMAL
        // allowNull defaults to true
    },
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
}, {
    // Other model options go here
});


async function inicializar() {
    try {
        await sequelize.authenticate();
        await Clima.sync({ force: true });
        await Clima.create({ ciudad: "Alicante", temperatura: 27.5 });
        await Clima.create({ ciudad: "Londres", temperatura: 13 });
        await Clima.create({ ciudad: "Paris", temperatura: 18.3 });
        await Clima.create({ ciudad: "Madrid", temperatura: 20.1 });
        await Clima.create({ ciudad: "Roma", temperatura: 25.7 });

    }
    catch (e) {
        console.error(e.original);
    }
}


module.exports = { Clima, inicializar };