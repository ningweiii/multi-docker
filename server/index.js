
//all logical to connect redis and postgress and render
const keys = require("./keys");

// Express App Setup
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors');

// express application, ovject receive and response to traffic comming in and out to react app
const app = express();
// cross-origin resource sharing
// allow to make request from one domain(react app) to df domian
app.use(cors());
// parse incoming request of react app and turn body of post request to json format
app.use(bodyParser.json());

//Postgres Client setup
// pool module from pg lib
const { Pool} = require('pg')
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error', () => console.log('Lost PG connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err => console.log(err)));

// Redis Client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000

});
// duplicate connection, 
const redisPublisher = redisClient.duplicate();


// Express route handlers

app.get('/', (req, res) =>
{
    res.send('Hi');
})
// query all values ever been submitted 
app.get('/values/all', async(req, res) => 
{
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) =>{
    redisClient.hgetall('values', (err, values) => 
{
    res.send(values);
});
});

app.post('/values', async(req, res) =>
{
    const index = req.body.index;
    if (parseInt(index)> 40)
    {
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  
    res.send({ working: true });
})

app.listen(5000, err => {
    console.log('Listening');
});