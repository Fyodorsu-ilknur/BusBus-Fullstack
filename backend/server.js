const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL db baglantı
const pool = new Pool({
    user: 'postgres',           
    host: 'localhost',          
    database: 'fleet_management_db', 
    password: 'SecurePass123!@#', 
    port: 5432,                
});

// DB baglantisi için test
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

//vehiclelistiçin tum hatları dönürür
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
    
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    
    const actualLimit = Math.min(limit, 2000);
    
    console.log(` Durak çekiliyor: limit=${actualLimit}, offset=${offset}`);

    try {
        let query = `SELECT stop_id, stop_name, stop_lat, stop_lon FROM stops ORDER BY stop_name ASC LIMIT $1 OFFSET $2`;
        const params = [actualLimit, offset];

        const result = await pool.query(query, params);

        const formattedStops = result.rows.map(row => ({
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lng: parseFloat(row.stop_lon),
            district: '' 
        }));

        // sadece gerektiğinde toplam sayıyı hesapla
        let totalStops = 0;
        if (offset === 0) {
            const totalCountResult = await pool.query('SELECT COUNT(*) FROM stops');
            totalStops = parseInt(totalCountResult.rows[0].count);
        }

        console.log(` ${formattedStops.length} durak döndürüldü`);

        res.json({
            stops: formattedStops,
            total: totalStops,
            hasMore: formattedStops.length === actualLimit 
        });

    } catch (err) {
        console.error('Durak verisi alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak verisi alınamadı.' });
    }
});

//tüm duraklar araından arama
app.get('/api/stops/search', async (req, res) => {
    const searchTerm = req.query.q || '';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const actualLimit = Math.min(limit, 1000);

    if (!searchTerm.trim()) {
        return res.status(400).json({ error: 'Arama terimi boş olamaz.' });
    }

    console.log(` Durak araması: "${searchTerm}", limit=${actualLimit}, offset=${offset}`);

    try {
        // Arama query'si 
        const searchQuery = `
            SELECT stop_id, stop_name, stop_lat, stop_lon 
            FROM stops 
            WHERE LOWER(stop_name) LIKE LOWER($1) 
               OR stop_id::text LIKE $2
            ORDER BY 
                CASE 
                    WHEN LOWER(stop_name) = LOWER($3) THEN 1
                    WHEN LOWER(stop_name) LIKE LOWER($4) THEN 2
                    WHEN stop_id::text = $5 THEN 3
                    ELSE 4
                END,
                stop_name ASC
            LIMIT $6 OFFSET $7
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const exactTerm = searchTerm;
        const startPattern = `${searchTerm}%`;
        
        const result = await pool.query(searchQuery, [
            searchPattern,
            searchPattern,
            exactTerm,
            startPattern,
            searchTerm,
            actualLimit,
            offset
        ]);

        const formattedStops = result.rows.map(row => ({
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lng: parseFloat(row.stop_lon),
            district: ''
        }));

        //  Performans için 
        let totalResults = 0;
        if (offset === 0) {
            const countQuery = `
                SELECT COUNT(*) 
                FROM stops 
                WHERE LOWER(stop_name) LIKE LOWER($1) 
                   OR stop_id::text LIKE $2
            `;
            const countResult = await pool.query(countQuery, [searchPattern, searchPattern]);
            totalResults = parseInt(countResult.rows[0].count);
        }

        console.log(`🔍 Arama sonucu: ${formattedStops.length} durak bulundu`);

        res.json({
            stops: formattedStops,
            total: totalResults,
            hasMore: formattedStops.length === actualLimit,
            searchTerm: searchTerm
        });

    } catch (err) {
        console.error('Durak arama hatası:', err.stack);
        res.status(500).json({ error: 'Durak arama işleminde hata oluştu.' });
    }
});

// Tüm durak sayısını döndür 
app.get('/api/stops/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM stops');
        const totalStops = parseInt(result.rows[0].count);
        
        console.log(` Toplam durak sayısı: ${totalStops}`);
        
        res.json({ 
            total: totalStops 
        });
        
    } catch (err) {
        console.error('Durak sayısı alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak sayısı alınamadı.' });
    }
});

// Tüm durak ID'lerini döndür -tümünü seç için bu
app.get('/api/stops/all-ids', async (req, res) => {
    const limit = parseInt(req.query.limit) || 1000; 
    const offset = parseInt(req.query.offset) || 0;
    
    const actualLimit = Math.min(limit, 2000);
    
    console.log(` Tüm durak ID'leri çekiliyor: limit=${actualLimit}, offset=${offset}`);
    
    try {
        const result = await pool.query(
            'SELECT stop_id FROM stops ORDER BY stop_name ASC LIMIT $1 OFFSET $2', 
            [actualLimit, offset]
        );
        
        const stopIds = result.rows.map(row => row.stop_id);
        
        console.log(` ${stopIds.length} durak ID'si döndürüldü`);
        
        res.json({ 
            stopIds: stopIds,
            total: stopIds.length,
            hasMore: stopIds.length === actualLimit
        });
        
    } catch (err) {
        console.error('Tüm durak ID\'leri alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak ID\'leri alınamadı.' });
    }
});

// Hızlı durak ID'leri 
app.get('/api/stops/ids-only', async (req, res) => {
    const limit = parseInt(req.query.limit) || 1000;
    const actualLimit = Math.min(limit, 5000); 
    
    console.log(`⚡ Sadece durak ID'leri çekiliyor: limit=${actualLimit}`);
    
    try {
        const result = await pool.query(
            'SELECT stop_id FROM stops ORDER BY stop_id ASC LIMIT $1', 
            [actualLimit]
        );
        
        const stopIds = result.rows.map(row => row.stop_id);
        
        console.log(`⚡ ${stopIds.length} durak ID'si hızla döndürüldü`);
        
        res.json({ 
            stopIds: stopIds,
            count: stopIds.length
        });
        
    } catch (err) {
        console.error('Hızlı durak ID\'leri alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak ID\'leri alınamadı.' });
    }
});

// Batch olarak durak bilgilerini alma
app.post('/api/stops/batch', async (req, res) => {
    const { stopIds } = req.body;
    
    if (!stopIds || !Array.isArray(stopIds) || stopIds.length === 0) {
        return res.status(400).json({ error: 'Geçerli durak ID listesi gönderilmedi.' });
    }
    
    // limit artırıldı2000
    if (stopIds.length > 2000) {
        return res.status(400).json({ error: 'Tek seferde en fazla 2000 durak sorgulanabilir.' });
    }

    console.log(`Batch durak sorgusu: ${stopIds.length} durak`);

    try {
        const query = `
            SELECT stop_id, stop_name, stop_lat, stop_lon 
            FROM stops 
            WHERE stop_id = ANY($1::text[])
            ORDER BY stop_name ASC
        `;
        
        const result = await pool.query(query, [stopIds]);
        
        const formattedStops = result.rows.map(row => ({
            id: row.stop_id,
            name: row.stop_name,
            lat: parseFloat(row.stop_lat),
            lng: parseFloat(row.stop_lon),
            district: ''
        }));

        console.log(` Batch sonucu: ${formattedStops.length}/${stopIds.length} durak bulundu`);

        res.json({
            stops: formattedStops,
            requested: stopIds.length,
            found: formattedStops.length
        });

    } catch (err) {
        console.error('Batch durak sorgusu hatası:', err.stack);
        res.status(500).json({ error: 'Batch durak sorgusu başarısız.' });
    }
});

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
            stops: stops, 
            coordinates: routeCoordinates 
        });

    } catch (err) {
        console.error(`Güzergah detayları alınırken hata (Hat: ${routeNumber}, Yön: ${direction}):`, err.stack);
        res.status(500).json({ error: 'Güzergah detayları alınamadı.' });
    }
});

// Belirli bir hattın günlük kalkış saatlerini döndürecek
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

app.get('/api/stop-routes/:stopId', async (req, res) => {
    const { stopId } = req.params;
    try {
        const routesResult = await pool.query(
            `SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name
            FROM stop_times st
            JOIN trips t ON st.trip_id = t.trip_id
            JOIN routes r ON t.route_id = r.route_id
            WHERE st.stop_id = $1
            ORDER BY r.route_short_name ASC`,
            [stopId]
        );

        if (routesResult.rows.length === 0) {
            return res.json([]); 
        }

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

// =========================================


// Araç konum loglarını kaydetme
app.post('/api/vehicle-history/log', async (req, res) => {
    const { vehicleId, lat, lng, speed, direction, status, routeCode } = req.body;
    
    if (!vehicleId || !lat || !lng) {
        return res.status(400).json({ error: 'Eksik parametreler: vehicleId, lat, lng gerekli' });
    }
    
    try {
        const result = await pool.query(
            `INSERT INTO vehicle_location_logs 
             (vehicle_id, latitude, longitude, speed, direction, status, route_code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, timestamp`,
            [vehicleId, lat, lng, speed || 0, direction || 0, status || 'active', routeCode]
        );
        
        res.json({ 
            success: true, 
            logId: result.rows[0].id, 
            timestamp: result.rows[0].timestamp 
        });
    } catch (err) {
        console.error('Araç konum logu kaydedilirken hata:', err);
        res.status(500).json({ error: 'Konum logu kaydedilemedi: ' + err.message });
    }
});

// Belirli araç için geçmiş verileri getirme 
app.get('/api/vehicle-history/:vehicleId', async (req, res) => {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 1000 } = req.query;
    
    if (!vehicleId) {
        return res.status(400).json({ error: 'Araç ID gerekli' });
    }
    
    try {
        let query = `
            SELECT id, vehicle_id, latitude, longitude, timestamp, speed, direction, status, route_code
            FROM vehicle_location_logs 
            WHERE vehicle_id = $1
        `;
        let params = [vehicleId];
        let paramIndex = 2;
        
        // Tarih filtreleri
        if (startDate) {
            query += ` AND timestamp >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND timestamp <= $${paramIndex}`;
            params.push(endDate + ' 23:59:59');
            paramIndex++;
        }
        
        query += ` ORDER BY timestamp ASC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        
        console.log('Executing query:', query, 'with params:', params);
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Bu parametreler için veri bulunamadı',
                data: [],
                count: 0
            });
        }
        
        const historyData = result.rows.map(row => ({
            id: row.id,
            vehicleId: row.vehicle_id,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            timestamp: new Date(row.timestamp).toISOString(),
            speed: row.speed || 0,
            direction: row.direction || 0,
            status: row.status || 'active',
            routeCode: row.route_code
        }));
        
        res.json({
            success: true,
            count: historyData.length,
            data: historyData
        });
    } catch (err) {
        console.error(`Araç geçmiş verileri alınırken hata (Vehicle ID: ${vehicleId}):`, err);
        res.status(500).json({ error: 'Geçmiş verileri alınamadı: ' + err.message });
    }
});

// Tüm araçları listeleme 
app.get('/api/vehicles', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT vehicle_id, route_code, 
                   MAX(timestamp) as last_seen,
                   COUNT(*) as log_count
            FROM vehicle_location_logs 
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY vehicle_id, route_code
            ORDER BY last_seen DESC
        `);
        
        const vehicles = result.rows.map(row => ({
            id: row.vehicle_id,
            routeCode: row.route_code,
            lastSeen: row.last_seen,
            logCount: parseInt(row.log_count)
        }));
        
        res.json({
            success: true,
            vehicles: vehicles
        });
    } catch (err) {
        console.error('Araç listesi alınırken hata:', err);
        res.status(500).json({ error: 'Araç listesi alınamadı: ' + err.message });
    }
});

// Araç konum geçmişini silme
app.delete('/api/vehicle-history/:vehicleId', async (req, res) => {
    const { vehicleId } = req.params;
    const { beforeDate } = req.query;
    
    try {
        let query = 'DELETE FROM vehicle_location_logs WHERE vehicle_id = $1';
        let params = [vehicleId];
        
        if (beforeDate) {
            query += ' AND timestamp < $2';
            params.push(beforeDate);
        }
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Araç geçmişi silinirken hata:', err);
        res.status(500).json({ error: 'Geçmiş silinirken hata: ' + err.message });
    }
});

// Veritabanı bağlantı testi
app.get('/api/health/database', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({ status: 'ok', message: 'Veritabanı bağlantısı aktif' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Veritabanı bağlantısı hatası: ' + err.message });
    }
});

// Belirli tarih aralığındaki tüm araç logları
app.get('/api/vehicle-history', async (req, res) => {
    const { startDate, endDate, vehicleIds, limit = 500 } = req.query;
    
    try {
        let query = `
            SELECT vehicle_id, latitude, longitude, timestamp, speed, status, route_code,
                   COUNT(*) OVER() as total_count
            FROM vehicle_location_logs 
            WHERE 1=1
        `;
        let params = [];
        let paramIndex = 1;
        
        if (startDate) {
            query += ` AND timestamp >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND timestamp <= $${paramIndex}`;
            params.push(endDate + ' 23:59:59');
            paramIndex++;
        }
        
        if (vehicleIds) {
            const vehicleArray = vehicleIds.split(',');
            query += ` AND vehicle_id = ANY($${paramIndex}::text[])`;
            params.push(vehicleArray);
            paramIndex++;
        }
        
        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
        params.push(parseInt(limit));
        
        const result = await pool.query(query, params);
        
        res.json({
            logs: result.rows,
            total: result.rows.length > 0 ? result.rows[0].total_count : 0,
            hasMore: result.rows.length === parseInt(limit)
        });
    } catch (err) {
        console.error('Tüm araç geçmiş verileri alınırken hata:', err.stack);
        res.status(500).json({ error: 'Geçmiş verileri alınamadı.' });
    }
});

// Güzergah kesiti 
app.get('/api/vehicle-history/:vehicleId/route-segment', async (req, res) => {
    const { vehicleId } = req.params;
    const { startLat, startLng, endLat, endLng, startTime, endTime, radius = 0.001 } = req.query;
    
    try {
        const query = `
            SELECT id, vehicle_id, latitude, longitude, timestamp, speed, status, route_code
            FROM vehicle_location_logs 
            WHERE vehicle_id = $1
            AND timestamp BETWEEN $2 AND $3
            AND (
                -- Başlangıç noktasına yakın olan kayıtlar
                (ABS(latitude - $4) < $6 AND ABS(longitude - $5) < $6)
                OR
                -- Bitiş noktasına yakın olan kayıtlar  
                (ABS(latitude - $7) < $6 AND ABS(longitude - $8) < $6)
                OR
                -- Başlangıç ve bitiş arasındaki kayıtlar (basit rectangular area)
                (latitude BETWEEN LEAST($4, $7) AND GREATEST($4, $7) 
                 AND longitude BETWEEN LEAST($5, $8) AND GREATEST($5, $8))
            )
            ORDER BY timestamp ASC
        `;
        
        const params = [
            vehicleId, startTime, endTime,
            parseFloat(startLat), parseFloat(startLng), 
            parseFloat(radius),
            parseFloat(endLat), parseFloat(endLng)
        ];
        
        const result = await pool.query(query, params);
        
        res.json({
            vehicleId,
            routeSegment: {
                startPoint: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
                endPoint: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
                timeRange: { start: startTime, end: endTime }
            },
            logs: result.rows,
            totalPoints: result.rows.length
        });
    } catch (err) {
        console.error(`Güzergah kesiti analizi hatası (Vehicle ID: ${vehicleId}):`, err.stack);
        res.status(500).json({ error: 'Güzergah kesiti analizi yapılamadı.' });
    }
});

// Araç geçmiş 
app.get('/api/vehicle-history/:vehicleId/stats', async (req, res) => {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;
    
    try {
        let query = `
            SELECT 
                COUNT(*) as total_records,
                MIN(timestamp) as first_record,
                MAX(timestamp) as last_record,
                AVG(speed) as avg_speed,
                MAX(speed) as max_speed,
                MIN(speed) as min_speed,
                COUNT(DISTINCT route_code) as routes_used,
                COUNT(DISTINCT DATE(timestamp)) as days_active
            FROM vehicle_location_logs 
            WHERE vehicle_id = $1
        `;
        let params = [vehicleId];
        let paramIndex = 2;
        
        if (startDate) {
            query += ` AND timestamp >= ${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND timestamp <= ${paramIndex}`;
            params.push(endDate + ' 23:59:59');
            paramIndex++;
        }
        
        const result = await pool.query(query, params);
        const stats = result.rows[0];
        
        res.json({
            vehicleId,
            statistics: {
                totalRecords: parseInt(stats.total_records),
                firstRecord: stats.first_record,
                lastRecord: stats.last_record,
                avgSpeed: stats.avg_speed ? parseFloat(stats.avg_speed).toFixed(2) : 0,
                maxSpeed: stats.max_speed || 0,
                minSpeed: stats.min_speed || 0,
                routesUsed: parseInt(stats.routes_used),
                daysActive: parseInt(stats.days_active)
            }
        });
    } catch (err) {
        console.error(`Araç istatistikleri alınırken hata (Vehicle ID: ${vehicleId}):`, err.stack);
        res.status(500).json({ error: 'Araç istatistikleri alınamadı.' });
    }
});

app.listen(PORT, () => {
    console.log(` Backend sunucu http://localhost:${PORT} adresinde çalışıyor.`);
    console.log(` Maksimum durak limitleri: Normal=2000, Batch=2000, IDs-only=5000`);
    console.log(` Geçmiş İzleme API'ları aktif`);
});