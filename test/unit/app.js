
import express from 'express';
import cors from 'cors';

let app = express();

app.use(cors());

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

module.exports = app;
