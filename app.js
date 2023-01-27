var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');
const { Template } = require('ejs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "password"));
var session = driver.session();

app.get('/', async function(req, res){
    try {
        const session = driver.session();
        const result = await session.run("MATCH (n:PLAYER) RETURN n");
        var playerArr = [];
        result.records.forEach(function(record){
            playerArr.push({
                id: record._fields[0].identity.low,
                name: record._fields[0].properties.name
            });
        });
        const result3 = await session.run("MATCH (n:COACH) RETURN n");
        var coachArr = [];
        result3.records.forEach(function(record){
            coachArr.push({
                id: record._fields[0].identity.low,
                name: record._fields[0].properties.name
            });
        });
        const result2 = await session.run("MATCH (n:TEAM) RETURN n");
        var nbateamArr = [];
        result2.records.forEach(function(record){
            nbateamArr.push({
                id: record._fields[0].identity.low,
                name: record._fields[0].properties.name
            });
        });
        res.render('index', {
            players: playerArr,
            coachs:coachArr,
            nbateams: nbateamArr
        });
        await session.close();
    } catch (error) {
        console.log(error);
    }
});

app.post('/player/add', async function(req, res){
    var name = req.body.name;
    var age = req.body.age;
    var number = req.body.number;
    var height = req.body.height;
    var weight = req.body.weight;
    try {
        const session = driver.session();
        session.run("CREATE(n:PLAYER {name: $nameParam, age: $age, number: $number, height: $height, weight: $weight}) RETURN n", { nameParam: name, age: age, number: number, height: height, weight: weight });
        res.redirect('/');
        await session.close();
    } catch (error) {
        console.log(error);
    }
});
app.post('/coach/add', async function(req, res){
    var name = req.body.name;
    var age = req.body.age;
    try {
        const session = driver.session();
        session.run("CREATE(n:COACH {name: $nameParam, age: $age}) RETURN n", { nameParam: name, age: age});
        res.redirect('/');
        await session.close();
    } catch (error) {
        console.log(error);
    }
});

app.post('/nbateam/add', async function(req, res){
    try {
        var name = req.body.name;
        const session = driver.session();
        await session.run("CREATE(n:TEAM {name:$nameParam}) RETURN n.name", {nameParam: name});
        res.redirect('/');
        await session.close();
    } catch (error) {
        console.log(error);
    }
});
app.post('/nbateam/connect', async function(req, res) {
    var name = req.body.name;
    var team = req.body.team;
    var coach = req.body.coach;
    try {
        const session = driver.session();
        await session.run('MATCH (a:PLAYER {name: $nameParam}), (b:TEAM {name: $teamParam}) MERGE (a)-[r:PLAYS_FOR]->(b) RETURN a,b', { nameParam: name, teamParam: team });
        await session.run('MATCH (c:COACH {name: $coachParam}), (b:TEAM {name: $teamParam}) MERGE (c)-[r:COACHES_FOR]->(b) RETURN c,b', { coachParam: coach, teamParam: team });
        await session.run('MATCH (c:COACH {name: $coachParam}), (a:PLAYER {name: $nameParam}) MERGE (c)-[r:COACHES]->(a) RETURN a,c', { coachParam: coach, nameParam: name });
        res.redirect('/');
        await session.close();
    } catch (error) {
        console.log(error);
    }
});


// PLAYER Route
app.get('/player/:id', async function (req, res) {
    var id = req.params.id;
    try {
        const session = driver.session();
        const result = await session.run("MATCH(a:PLAYER) WHERE id(a)=$idParam RETURN a.name as name, a.age as age, a.number as number, a.height as height, a.weight as weight", { idParam: parseInt(id) });
        var name = result.records[0].get("name");
    
        var infoArr=[];
        infoArr.push({
            age : result.records[0].get("age"),
            number : result.records[0].get("number"),
            height : result.records[0].get("height"),
            weight : result.records[0].get("weight")
        });
        const result2 = await session.run("MATCH (a:COACH)-[r:COACHES]-(b:PLAYER) WHERE id(b)=$idParam RETURN a", { idParam: parseInt(id) });
        var coachArr = [];
        result2.records.forEach(function (record) {
            if (record._fields[0] != null) {
                coachArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }
        });
        const result3 = await session.run("OPTIONAL MATCH (a:PLAYER)-[r:PLAYS_FOR]-(b:TEAM) WHERE id(a)=$idParam RETURN b", { idParam: parseInt(id) });
        var nbateamArr = [];
        result3.records.forEach(function (record) {
            if (record._fields[0] != null) {
                nbateamArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }
        });
        res.render('player', {
            id: id,
            name: name,
            nbateams: nbateamArr,
            infos:infoArr,
            coachs:coachArr
        });
        await session.close();
    } catch (error) {
        console.log(error);
    }
});
app.get('/nbateam/:id', async function (req, res) {
    var id = req.params.id;
    try {
        const session = driver.session();
        const result = await session.run("MATCH(a:TEAM) WHERE id(a)=$idParam RETURN a.name as name", { idParam: parseInt(id) });
        var name = result.records[0].get("name");
        const result3 = await session.run("MATCH (a:PLAYER)-[r:PLAYS_FOR]-(b:TEAM) WHERE id(b)=$idParam RETURN a", { idParam: parseInt(id) });
        var playerArr = [];
        result3.records.forEach(function (record) {
            if (record._fields[0] != null) {
                playerArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }
        });
        const result2 = await session.run("MATCH (a:COACH)-[r:COACHES_FOR]-(b:TEAM) WHERE id(b)=$idParam RETURN a", { idParam: parseInt(id) });
        var coachArr = [];
        result2.records.forEach(function (record) {
            if (record._fields[0] != null) {
                coachArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }
        });
        res.render('nbateam', {
            id: id,
            name: name,
            coachs: coachArr,
            players:playerArr
        });
        await session.close();
    } catch (error) {
        console.log(error);
    }
});
app.get('/coach/:id', async function (req, res) {
    var id = req.params.id;
    try {
        const session = driver.session();
        const result = await session.run("MATCH(a:COACH) WHERE id(a)=$idParam RETURN a.name as name", { idParam: parseInt(id) });
        var name = result.records[0].get("name");
        const result2 = await session.run("MATCH (a:COACH)-[r:COACHES_FOR]-(b:TEAM) WHERE id(a)=$idParam RETURN b", { idParam: parseInt(id) });
        var nbateamArr = [];
        result2.records.forEach(function (record) {
            if (record._fields[0] != null) {
                nbateamArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }});
        const result3 = await session.run("MATCH (a:COACH)-[r:COACHES]-(b:PLAYER) WHERE id(a)=$idParam RETURN b", { idParam: parseInt(id) });
        var coachArr = [];
        result3.records.forEach(function (record) {
            if (record._fields[0] != null) {
                coachArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            }
        });
        res.render('coach', {
            id: id,
            name: name,
            coachs: coachArr,
            nbateams:nbateamArr,
        });
        await session.close();
    } catch (error) {
        console.log(error);
    }
});

app.listen(3000);

console.log('Server started on port 3000');

module.exports = app;