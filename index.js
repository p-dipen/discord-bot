const express = require('express');
const { usVisaAppointment } = require('./usappointment');
const usVisaAppointment2 = require('./usappointment2');
const app = express();

const PORT = process.env.PORT || 4000;

app.get('/scrape', (req, res) => {
  var str = '-r ca -d 2024-03-04 -a 52463688 -c 94 -t 120 -g';
  usVisaAppointment(str, res);
});

app.get('/scrape2', (req, res) => {
  var str = '-r ca -d 2024-03-04 -a 52463688 -c 94 -t 120 -g';
  usVisaAppointment2(str, res);
});

app.get('/', (req, res) => {
  res.send('Render Puppeteer server is up and running!');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
