let cTable = require('console.table');

let nombre = 'Eva';
let str = "\033[31m \033[91m " + nombre;

const coloresArray = cTable.getTable([
    { x: str },
    { y: "" }
]);





for (let i = 0; i < 5; i++) {
    coloresArray.x = "";
    for (let j = 0; j < 5; j++) {
        coloresArray[i][j] = "";
    }
}



console.log(coloresArray);
//console.log(str);

