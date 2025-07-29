
//json dosyalarımı daha temiz hale getirmek için bunu oluşturdum çünkü ne yapsam 33ten fazla durak gösteremedim birde bunu deniyorum
const fs = require('fs');

// Dosyayı oku
const rawData = fs.readFileSync('src/data/routes.json');
const json = JSON.parse(rawData);

// Fields bilgisi
const fields = json.fields.map(f => f.id);

// Records kısmını obje dizisine dönüştür
const converted = json.records.map(record => {
  const obj = {};
  fields.forEach((key, idx) => {
    obj[key] = record[idx];
  });
  return obj;
});

// Sonuç dosyasını yaz
fs.writeFileSync('src/data/convertedRoutes.json', JSON.stringify(converted, null, 2));
console.log('Dönüştürme tamamlandı.');
