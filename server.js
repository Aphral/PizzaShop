//import libraries
const ejs = require('ejs');
const fs = require('fs');
const http = require('http');
const url = require('url');
const path = require('path');
const sqlite3 = require("sqlite3");
const querystring = require('querystring');

//create a host and port
const HOST_NAME = '127.0.0.1';
const PORT_NUM = process.env.PORT || 3000;

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ttf': 'aplication/font-sfnt'
};



const filePath = __dirname + '/view/page/';
const staticPath = __dirname + '/public/';
const index_path = filePath + 'index.ejs';

var pizza_db;
var userId = 0;
var orderId = 0;



function renderStatic(req, res) {
    // read file from file system
    let parsedUrl = url.parse(req.url, true);
    const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    let pathname = path.join(staticPath, sanitizePath);
    fs.readFile(pathname, function(err, data){
        if(err){
            res.statusCode = 500;
            res.end(`Error getting the file: ${err}.`);
        } else {

            const ext = path.parse(pathname).ext;
            res.setHeader('Content-type', mimeType[ext] || 'text/plain' );
            res.end(data);
        }
    });
}


//create a HTTP server
const server = http.createServer((req, res) =>
{
    let parsedUrl = url.parse(req.url, true).pathname;
    let qString = url.parse(req.url).query;
    params = querystring.parse(qString);
    ext = path.extname(parsedUrl);

    // Render Static
    if (ext === ".jpg" || ext === ".png" || ext === ".css"){
        renderStatic(req,res);
        return;
    }

    // Check If User Is Logged In
    if(userId === 0 && !(parsedUrl ==='/login' || parsedUrl === '/registration' || parsedUrl === '/registrationSubmit') ){
        res.writeHead(307, {Location: "/login"});
        res.end();
        return;
    }

    //Routing
    data ="";
    if (parsedUrl === '/' && req.method === 'GET') {
        var ingredients = [];
        pizzadb.all("Select Pizzas.ID , Pizzas.Price,Ingredients.IngredientName From Ingredients, PizzaItems, Pizzas Where Ingredients.ID = PizzaItems.IngredientsID AND Pizzas.ID= PizzaItems.PizzasID  ORDER BY Pizzas.ID", [], function (err,rows){
            rows.forEach((row) => {

                ingredients.push({'PizzaID': row.ID, 'IngredientName': row.IngredientName, 'PizzaPrice': row.Price});
            });
            console.log(ingredients);
            ejs.renderFile(filePath + 'index.ejs', {'ingredients': ingredients}, function (err, data){
                console.log("Rendering Index");
                console.log(userId);
                res.end(data);})

        });
        console.log("Exiting Index");
    }
    else if(parsedUrl === '/login' && req.method === 'GET') {
        console.log("Login Called");

        if (params.username) {
            console.log(params.username + "" + params.password);
        }

            pizzadb.all('Select * From CustomerDetails Where Username = ? AND Password = ?', [params.username, params.password], function(err, rows) {
                rows.forEach((row) => {
                    console.log("Getting Result");
                    userId = row.ID;
                });
                if(userId != 0 ){
                    pizzadb.run('INSERT INTO ORDERS (CustomerID, PriceTotal, Status) VALUES (?, 0,0)' , [userId], function (err,row) {
                        if(err){
                            console.log(err);
                        }
                        pizzadb.get('Select MAX(ID) as max FROM ORDERS', [], function (err, result) {
                            if(err){
                                console.log(err);
                            }

                            orderId = result.max;
                            console.log(result.max);
                        });


                    });

                    res.writeHead(307,{Location: '/'});
                    res.end();
                }
                else{
                    ejs.renderFile(filePath + 'login.ejs', function (err, data) {
                        res.end(data);
                    });
                }
            });

    }
    else if(parsedUrl === '/cart' && req.method === 'GET'){
        console.log("Cart Being Called");
        var orderPizzas = [];
        var orderNons =[];

        pizzadb.all("Select Pizzas.PizzaName, Pizzas.Price, Pizzas.Sauce, Pizzas.Size  From Pizzas, Orders, OrderItems Where Pizzas.ID = OrderItems.PizzasID AND OrderItems.OrdersID = Orders.ID AND Orders.ID =  ?", [orderId], function(err,rows) {
            rows.forEach((row) => {
                console.log("Getting Row");
                orderPizzas.push({'Pizza': row.PizzaName, 'Price': row.Price, 'Sauce': row.Sauce, 'Size': row.Size})
                console.log(orderPizzas);

            });

        });

        console.log(orderId);
        pizzadb.all("Select NonPizza.NonName, NonPizza.NonPrice From NonPizza, Orders, OrderItems Where NonPizza.ID = OrderItems.NonPizzaID AND OrderItems.OrdersID = Orders.ID AND Orders.ID = ?;", [orderId],  function (err, rows) {
            rows.forEach((row) => {
                console.log("Getting Row");
                orderNons.push({'NonName': row.NonName, 'NonPrice': row.NonPrice})
            });
            console.log(orderNons);
            ejs.renderFile(filePath + 'cart.ejs', {'orderNons': orderNons, 'orderPizzas': orderPizzas}, function(err, data) {
                console.log("Rendering Cart");
                console.log(orderId);
                console.log(userId);
                res.end(data);})
        });

        console.log(orderId);
        console.log("Exiting Menu");

        }
    else if(parsedUrl === '/addPizzaToCart' && req.method === 'GET'){
        console.log(params.pizza);
        pizzadb.run('INSERT INTO OrderItems (OrdersID, PizzasID) VALUES ( ?, ?)', [orderId, params.pizza], function(err, row){

            if(err){
                console.log(err);
            }
        });
        res.writeHead(307, {Location: "/cart"});
        res.end(data);

    }
    else if(parsedUrl === '/addNonToCart' && req.method === 'GET'){
        console.log(params.non);
        pizzadb.run('INSERT INTO OrderItems (OrdersID, NonPizzaID) VALUES ( ?, ?)', [orderId, params.non], function(err, row){

            if(err){
                console.log(err);
            }
        });
        res.writeHead(307, {Location: "/cart"});
        res.end(data);

    }

    else if(parsedUrl === '/registration' && req.method === 'GET'){
        console.log("Registration Called");
        ejs.renderFile(filePath+'registration.ejs', (err,data) => {
            res.end(data);
        });
    }
    else if(parsedUrl === '/registrationSubmit' && req.method === 'GET'){
        console.log('In Submit');
    pizzadb.run('INSERT INTO CustomerDetails (Username, Fname, Lname, Password, PhoneNo, Address ) Values (?,?,?,?,?,?);' , [params.username, params.fname, params.lname, params.password, params.phone, params.address], function (err, row) {
        let username = params.username;
        let password = params.password;

        pizzadb.all('Select * From CustomerDetails Where Username = ? AND Password = ?', [username, password], function(err, rows) {
            rows.forEach((row) => {
                console.log("Getting ID RESULT HERE ");
                userId = row.ID;
                console.log(userId);
            });
            if(userId != 0 ) {
                pizzadb.run('INSERT INTO ORDERS (CustomerID, PriceTotal, Status) VALUES (?, 0,0)' , [userId], function (err,row) {
                    if(err){
                        console.log(err);
                    }
                    pizzadb.get('Select MAX(ID) as max FROM ORDERS', [], function (err, result) {
                        if(err){
                            console.log(err);
                        }

                        orderId = result.max;
                        console.log(result.max);
                    });


                });
                res.writeHead(307, {Location: '/'});
                res.end();
            }
            else{
                ejs.renderFile(filePath+'registration.ejs', (err,data) => {
                    res.end(data);
                });
            }

        });
        if (err) {
            console.log(err);
        }
    });
    }
    else if(parsedUrl === '/confirm' && req.method === 'GET'){
        console.log("Here Now");
        pizzadb.run('Update Orders SET PaymentType = ?, Delivery = ? , Status  = 1 WHERE ID = ?', [params.Payment, params.Delivery,orderId], function(err, row){

            if(err){
                console.log(err);
            }

            res.writeHead(307, {Location: "/menu"});
            res.end(data);
        });


    }


    else if(parsedUrl === '/custom' && req.method === 'GET'){
        ejs.renderFile(filePath+'custom.ejs', (err,data) => {
            res.end(data);
        });
        }
    else if(parsedUrl === '/menu' && req.method === 'GET'){
        ejs.renderFile(filePath+'menu.ejs', (err,data) => {
            res.end(data);
        });
    }
    else{
            res.writeHead(404);
            res.end('Not Found');
        }
    // routing
});

pizzadb = new sqlite3.Database('./model/PizzaDB.db');
console.log(pizzadb);
//listen to the http server with the dedicated port number
server.listen(PORT_NUM, HOST_NAME, function ()
{
    console.log("Server is running");
});
