const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const PORT = 5000;

app.use(cors());

app.get('/api/routes', (req, res) => {
  const results = [];
  fs.createReadStream('data/routes.csv')
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      console.error("CSV okuma hatası:", err);
      res.status(500).send("CSV okuma hatası");
    });
;

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
