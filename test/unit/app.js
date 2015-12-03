
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

let app = express();
let extended = { extended: false };

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded(extended));

// parse application/json
app.use(bodyParser.json(extended));

app.all('/', (req, res, next) => {

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

app.get('/404-with-json-expected', (req, res, next) => {
  res.sendStatus(404);
});

module.exports = app;
