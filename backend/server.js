const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL veritabanı bağlantı 
const pool = new Pool({
    user: 'postgres',           
    host: 'localhost',          
    database: 'fleet_management_db', 
    password: 'SecurePass123!@#', 
    port: 5432,                
});

// Veritabanı bağlantısı test 
pool.connect((err, client, release) => {
    if (err) {
        return console.error('PostgreSQL veritabanına bağlanırken hata oluştu:', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('PostgreSQL test sorgusu çalışırken hata oluştu:', err.stack);
        }
        console.log('PostgreSQL veritabanı bağlantısı başarılı:', result.rows[0].now);
    });
});

// API Endpoint: Tüm hatları döndürür VehicleList için
app.get('/api/routes', async (req, res) => {
    try {
        const result = await pool.query('SELECT route_id, route_short_name, route_long_name FROM routes ORDER BY route_short_name ASC');
        const allRoutes = {};
        result.rows.forEach(row => {
            allRoutes[row.route_id] = {
                id: row.route_id,
                route_number: row.route_short_name, 
                route_name: row.route_long_name,
                start: '',
                end: '',
                center: null 
            };
        });
        res.json(allRoutes);
    } catch (err) {
        console.error('Routes verisi alınırken hata:', err.stack);
        res.status(500).json({ error: 'Routes verisi alınamadı.' });
    }
});

 
app.get('/api/stops', async (req, res) => {
    const searchTerm = req.query.search || '';
    try {
        let query = `SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops`;
        const params = [];
        if (searchTerm) {
            query += ` WHERE stop_name ILIKE $1 OR stop_id ILIKE $1`; // ILIKE büyük/küçük harf duyarsız arama
            params.push(`%${searchTerm}%`);
        }
        query += ` ORDER BY stop_name ASC LIMIT 50`; // Arama sonuçlarını sırala ve limit 

        const result = await pool.query(query, params);
        const formattedStops = result.rows.map(row => ({
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lng: parseFloat(row.stop_lon),
           
            district: '' 
        }));
        res.json(formattedStops);
    } catch (err) {
        console.error('Durak verisi alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak verisi alınamadı.' });
    }
});


// API EndpointBelirli bir hattın güzergah detaylarını döndürür
app.get('/api/route-details/:routeNumber/:direction', async (req, res) => {
    const { routeNumber, direction } = req.params;
    const pgDirection = direction === '1' ? 0 : 1;

    try {
        const tripsResult = await pool.query(
            `SELECT trip_id, shape_id FROM trips WHERE route_id = $1 AND direction_id = $2 LIMIT 1`,
            [routeNumber, pgDirection]
        );

        if (tripsResult.rows.length === 0) {
            return res.status(404).json({ message: 'Bu hat numarası ve yön için güzergah bulunamadı.' });
        }

        const tripId = tripsResult.rows[0].trip_id;
        const shapeId = tripsResult.rows[0].shape_id;

        const stopTimesResult = await pool.query(
            `SELECT
                st.stop_id,
                st.stop_sequence,
                st.arrival_time,
                st.departure_time,
                s.stop_name,
                s.stop_lat,
                s.stop_lon
            FROM stop_times st
            JOIN stops s ON st.stop_id = s.stop_id
            WHERE st.trip_id = $1
            ORDER BY st.stop_sequence ASC`,
            [tripId]
        );

        const stops = stopTimesResult.rows.map(row => ({
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lng: parseFloat(row.stop_lon),
            sequence: row.stop_sequence,
            
        }));

        let routeCoordinates = [];
        if (shapeId) {
            const shapesResult = await pool.query(
                `SELECT shape_pt_lat, shape_pt_lon, shape_pt_sequence
                FROM shapes
                WHERE shape_id = $1
                ORDER BY shape_pt_sequence ASC`,
                [shapeId]
            );
            routeCoordinates = shapesResult.rows.map(row => ([
                parseFloat(row.shape_pt_lat),
                parseFloat(row.shape_pt_lon)
            ]));
        } else {
            console.warn(`Uyarı: Hat ${routeNumber} için shape_id bulunamadı. Durak koordinatları kullanılıyor.`);
            routeCoordinates = stops.map(stop => [stop.lat, stop.lng]);
        }

        const routeInfoResult = await pool.query(
            `SELECT route_long_name FROM routes WHERE route_id = $1`,
            [routeNumber]
        );
        let routeName = routeInfoResult.rows.length > 0 ? routeInfoResult.rows[0].route_long_name : `Hat ${routeNumber}`;

        let startStopName = stops.length > 0 ? stops[0].name : 'Bilgi Yok';
        let endStopName = stops.length > 0 ? stops[stops.length - 1].name : 'Bilgi Yok';

        res.json({
            route_number: routeNumber,
            route_name: routeName,
            direction: direction,
            start_point: startStopName,
            end_point: endStopName,
            stops: stops, // Sıralı durak listesi
            coordinates: routeCoordinates 
        });

    } catch (err) {
        console.error(`Güzergah detayları alınırken hata (Hat: ${routeNumber}, Yön: ${direction}):`, err.stack);
        res.status(500).json({ error: 'Güzergah detayları alınamadı.' });
    }
});

// API Endpoint: Belirli bir hattın günlük kalkış saatlerini döndürür
app.get('/api/departure-times/:routeNumber/:dayOfWeek', async (req, res) => {
    const { routeNumber, dayOfWeek } = req.params;

    try {
        
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!validDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: 'Geçersiz gün bilgisi.' });
        }

        
        const calendarQuery = `SELECT service_id FROM calendar WHERE ${dayOfWeek} = 1`;
        const calendarResult = await pool.query(calendarQuery);
        const activeServiceIds = calendarResult.rows.map(row => row.service_id);

        if (activeServiceIds.length === 0) {
            return res.status(404).json({ message: 'Bu gün için aktif servis bulunamadı.' });
        }

        // servisID'leri ve hat numarası ile trip_id'ler
        const tripsResult = await pool.query(
            `SELECT trip_id, direction_id FROM trips
            WHERE route_id = $1 AND service_id = ANY($2::text[])`,
            [routeNumber, activeServiceIds]
        );

        if (tripsResult.rows.length === 0) {
            return res.status(404).json({ message: `Hat ${routeNumber} için ${dayOfWeek} günü sefer bulunamadı.` });
        }

        const tripIds = tripsResult.rows.map(row => row.trip_id);
        const tripDirections = {};
        tripsResult.rows.forEach(row => {
            tripDirections[row.trip_id] = row.direction_id === 0 ? 'Gidiş' : 'Dönüş';
        });

        //  Bu trip_id'ler için ilk duraktaki kalkış saatleri
        const departureTimesResult = await pool.query(
            `SELECT
                st.trip_id,
                st.departure_time,
                s.stop_name AS first_stop_name,
                s.stop_id AS first_stop_id
            FROM stop_times st
            JOIN stops s ON st.stop_id = s.stop_id
            WHERE st.trip_id = ANY($1::text[]) AND st.stop_sequence = 1
            ORDER BY st.departure_time ASC`,
            [tripIds]
        );

        const gidisDepartures = [];
        const donusDepartures = [];

        departureTimesResult.rows.forEach(row => {
                        console.log("Processing row for departure times:", row);

            const departure = {
                trip_id: row.trip_id,
                departure_time: row.departure_time,
                first_stop_name: row.first_stop_name,
                first_stop_id: row.first_stop_id
            };
            if (tripDirections[row.trip_id] === 'Gidiş') {
                gidisDepartures.push(departure);
            } else {
                donusDepartures.push(departure);
            }
        });

        res.json({
            route_number: routeNumber,
            day_of_week: dayOfWeek,
            gidis: gidisDepartures,
            donus: donusDepartures
        });

    } catch (err) {
        console.error(`Kalkış saatleri alınırken hata (Hat: ${routeNumber}, Gün: ${dayOfWeek}):`, err.stack);
        res.status(500).json({ error: 'Kalkış saatleri alınamadı.' });
    }

});
// API Endpoint Belirli bir duraktan geçen hatları döndürür
app.get('/api/stop-routes/:stopId', async (req, res) => {
    const { stopId } = req.params;
    try {
        // stop_times tablosunda bu durağı içeren trip_id'leri bul
        const tripIdsResult = await pool.query(
            `SELECT DISTINCT trip_id FROM stop_times WHERE stop_id = $1`,
            [stopId]
        );

        if (tripIdsResult.rows.length === 0) {
            return res.json([]); // Bu duraktan geçen hat yoksa boş dizi döndürür
        }

        const routeIds = tripIdsResult.rows.map(row => row.trip_id); 

        // Aynı route_id'ye sahip birden fazla trip olabilir, DISTINCT kullanıyoruz.
        const routesResult = await pool.query(
            `SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name
            FROM trips t
            JOIN routes r ON t.route_id = r.route_id
            WHERE t.trip_id = ANY($1::text[])
            ORDER BY r.route_short_name ASC`,
            [routeIds] // trip_id dizisini parametre olarak gönder
        );

        const formattedRoutes = routesResult.rows.map(row => ({
            id: row.route_id,
            route_number: row.route_short_name,
            route_name: row.route_long_name
        }));

        res.json(formattedRoutes);

    } catch (err) {
        console.error(`Duraktan geçen hatlar alınırken hata (Durak ID: ${stopId}):`, err.stack);
        res.status(500).json({ error: 'Duraktan geçen hatlar alınamadı.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});