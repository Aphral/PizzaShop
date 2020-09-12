const sqlite3 = require('sqlite3').verbose()

let db = new sqlite3.Database('./PizzaDBSAVE.db')

db.run('INSERT INTO Ingredients (ID, IngredientName, Veg, Price) VALUES ( "I0004","Chicken", 0, 1.00)', function(err, row){

});


