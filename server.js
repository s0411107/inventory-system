const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('formidable');
const assert = require('assert');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

const mongourl = 'mongodb+srv://user:user123@cluster0.ec6xqxa.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'Project';

const client = new MongoClient(mongourl, { useNewUrlParser: true });

const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
    { name: 'admin', password: 'admin'},
    { name: 'student', password: 'student'}
);

app.use(session({
    name: 'loginSession',
    keys: [SECRETKEY]
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        res.status(200).redirect('home');
    }
});

app.get('/login', (req, res) => {
    if (!req.session.authenticated) {
        res.status(200).render('login');
    } else {
        res.status(200).redirect('home');
    }
});

app.post('/login', (req, res) => {
    users.forEach((user) => {
        if (user.name == req.body.name && user.password == req.body.password) {
            req.session.authenticated = true;
            req.session.username = req.body.name;
        }
    });
    res.status(200).redirect('home');
});

app.get('/logout', (req, res) => {
    req.session = null;   
    res.status(200).redirect('/');
});

app.get('/home', function (req, res) {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        const db = client.db(dbName);
        const collection = db.collection('inventory');
        collection.find({}, { projection: { _id: 1, name: 1 } }).toArray(function (err, inventory_list) {
            assert.equal(err, null);
            res.status(200).render('home', { 'home': inventory_list })
        });
    }
});

app.get('/api/inventory/:type/:item', function (req, res) {
    const db = client.db(dbName);
    const collection = db.collection('inventory');
    var type = req.params.type;
    var item = req.params.item;
    collection.find({ [type]: item }).toArray(function (err, inventory_list) {
        assert.equal(err, null);
        res.status(200).render('getinventory', { 'getinventory': inventory_list })
        console.log(JSON.stringify(inventory_list, null, 4));
    });
});

app.get('/details', function (req, res) {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        const db = client.db(dbName);
        const collection = db.collection('inventory');
        var id = req.query._id;
        collection.find({ "_id": new ObjectID(id) }).toArray(function (err, inventory_list) {
            assert.equal(err, null);
            res.status(200).render('details', { 'details': inventory_list })
        });
    }
});

app.get('/edit', function (req, res) {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        const db = client.db(dbName);
        const collection = db.collection('inventory');
        var id = req.query._id;
        collection.find({ "_id": new ObjectID(id) }).toArray(function (err, inventory_list) {
            assert.equal(err, null);
            res.status(200).render('edit', { 'edit': inventory_list });
        });
    }
});

app.get('/map', function (req, res) {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        const db = client.db(dbName);
        const collection = db.collection('inventory');
        var id = req.query._id;
        collection.find({ "_id": new ObjectID(id) }).toArray(function (err, inventory_list) {
            assert.equal(err, null);
            res.status(200).render('map', { 'map': inventory_list });
        });
    }
});

app.post('/delete', function (req, res) {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {

        const db = client.db(dbName);
        const collection = db.collection('inventory');
        var id = fields._id;
        if (req.session.username == fields.manager) {
            collection.deleteOne({ "_id": new ObjectID(id) }, function (err, obj) {
                assert.equal(err, null);
                res.status(200).render('desucceed');
            });
        } else {
            res.status(200).render('manager');
        }
    });
});

app.post('/update', function (req, res) {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {

        const db = client.db(dbName);
        const collection = db.collection('inventory');
        var id = fields._id;
        if (req.session.username == fields.manager) {
            var updateDoc = {};
            updateDoc['name'] = fields.name;
            updateDoc['type'] = fields.type;
            updateDoc['quantity'] = fields.quantity;
            updateDoc['inventory_address'] = { "street": fields.street, "building": fields.building, "country": fields.country, "zipcode": fields.zipcode, "coord": { "Latitude": fields.Latitude, "Longitude": fields.Longitude } };

            var filetype = files.filetoupload.type.split('/').pop();
            if (files.filetoupload.size > 0) {
                if (filetype == 'jgp' || filetype == 'png' || filetype == 'jpeg') {
                    fs.readFile(files.filetoupload.path, (err, data) => {
                        assert.equal(err, null);
                        updateDoc['photo'] = new Buffer.from(data).toString('base64');
                        updateDoc['photo_mimetype'] = files.filetoupload.type;
                        collection.updateOne({ "_id": new ObjectID(id) }, { $set: updateDoc }, function (err, res) {
                            if (err) throw err;
                        });
                    });
                    res.status(200).render('succeed');
                } else {
                    res.status(200).render('image');
                }
            } else {
                collection.updateOne({ "_id": new ObjectID(id) }, { $set: updateDoc }, function (err, res) {
                    if (err) throw err;
                });
                res.status(200).render('succeed');
            }
        } else {
            res.status(200).render('manager');
        }
    });
});

app.get('/create', function (req, res) {
    if (!req.session.authenticated) {
        res.status(200).redirect('login');
    } else {
        res.status(200).render('create');
    }
});

app.post('/created', function (req, res) {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {

        const db = client.db(dbName);
        const collection = db.collection('inventory');

        var updateDoc = {};

        var filetype = files.filetoupload.type.split('/').pop();
        if (files.filetoupload.size > 0) {
            if (filetype == 'jgp' || filetype == 'png' || filetype == 'jpeg') {
                fs.readFile(files.filetoupload.path, (err, data) => {
                    assert.equal(err, null);
                    updateDoc['name'] = fields.name;
                    updateDoc['type'] = fields.type;
                    updateDoc['quantity'] = fields.quantity;
                    updateDoc['photo'] = new Buffer.from(data).toString('base64');
                    updateDoc['photo_mimetype'] = files.filetoupload.type;
                    updateDoc['inventory_address'] = { "street": fields.street, "building": fields.building, "country": fields.country, "zipcode": fields.zipcode, "coord": { "Latitude": fields.Latitude, "Longitude": fields.Longitude } };
                    updateDoc['manager'] = req.session.username;
                    collection.insertOne(updateDoc, function (err, res) {
                        if (err) throw err;
                    });
                    res.status(200).render('succeed')
                })
            } else {
                res.status(200).render('image')
            }
        } else {
            updateDoc['name'] = fields.name;
            updateDoc['type'] = fields.type;
            updateDoc['quantity'] = fields.quantity;
            updateDoc['photo'] = "";
            updateDoc['photo_mimetype'] = "";
            updateDoc['inventory_address'] = { "street": fields.street, "building": fields.building, "country": fields.country, "zipcode": fields.zipcode, "coord": { "Latitude": fields.Latitude, "Longitude": fields.Longitude } };
            updateDoc['manager'] = req.session.username;
            collection.insertOne(updateDoc, function (err, res) {
                if (err) throw err;
            });
            res.status(200).render('succeed')
        }
    });
});
app.get('/api/inventory/name/:name', function(req,res)  {
    console.log("...Rest Api");
	console.log("name: " + fields.name);
    if (fields.name) {
        let criteria = {};
        criteria['name'] = fields.name;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing name"});
    }
});

app.use(function (req, res, next) {
    res.status(404).send('Sorry cant find that!');
});

client.connect(function (err) {
    assert.equal(null, err);
    console.log("Server start successfully");

    const db = client.db(dbName);

    app.listen(process.env.PORT || 8099);
});

