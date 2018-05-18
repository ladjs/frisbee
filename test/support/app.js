const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const extended = { extended: false };

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded(extended));

// parse application/json
app.use(bodyParser.json(extended));

app.all('/', (req, res) => {
  /*
  // HEAD request body must be 0 in length
  if (req.method === 'HEAD' || req.method === 'OPTIONS') {
    res.send(200, '');
    return;
  }
  */

  res.json({
    message: 'OK'
  });
});

app.get('/400-with-message', (req, res) => {
  res.status(400).json({ message: 'Oops!' });
});

app.get('/querystring', (req, res) => {
  res.json(req.query);
});

app.delete('/querystring', (req, res) => {
  res.json(req.query);
});

app.get('/404', (req, res) => {
  res.sendStatus(404);
});

app.get('/404-with-valid-json', (req, res) => {
  res
    .set('Content-Type', 'application/json')
    .status(400)
    .send({ foo: 'baz' });
});

app.get('/404-with-invalid-json', (req, res) => {
  res
    .set('Content-Type', 'application/json')
    .status(404)
    .send('foobaz');
});

app.get('/404-with-stripe-error', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Some error happened',
      stack: {},
      code: 23,
      param: 'hello_world'
    }
  });
});

module.exports = app;
