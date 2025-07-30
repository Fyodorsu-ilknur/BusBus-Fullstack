const sql = require('mssql');

const config = {
    user: 'gtfs_user',
    password: 'gtfssifre',
    server: 'ILKNUR\\SQLEXPRESS',
    database: 'FiloYonetimiDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function getStops() {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT stop_id, stop_name, stop_lat, stop_lon 
            FROM Stops
        `);
        console.log(`Toplam ${result.recordset.length} durak bulundu.`);
        console.log(result.recordset); // Veriyi konsola yazdır
        return result.recordset;
    } catch (err) {
        console.error('Veri çekme hatası:', err.message);
    } finally {
        await sql.close();
    }
}

// Kullanım
getStops();
