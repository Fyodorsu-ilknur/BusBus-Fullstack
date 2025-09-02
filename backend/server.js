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

// API Endpoint:vehiclelistiçin tum hatları dönürür
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

// API Endpoint durakalrı dondurecek - OPTIMIZE EDİLDİ
app.get('/api/stops', async (req, res) => {
    
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // ✅ Güvenlik kontrolü - maksimum limit 2000
    const actualLimit = Math.min(limit, 2000);
    
    console.log(`📊 Durak çekiliyor: limit=${actualLimit}, offset=${offset}`);

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

        // ✅ Performans için sadece gerektiğinde toplam sayıyı hesapla
        let totalStops = 0;
        if (offset === 0) {
            const totalCountResult = await pool.query('SELECT COUNT(*) FROM stops');
            totalStops = parseInt(totalCountResult.rows[0].count);
        }

        console.log(`✅ ${formattedStops.length} durak döndürüldü`);

        res.json({
            stops: formattedStops,
            total: totalStops,
            hasMore: formattedStops.length === actualLimit // Eğer istenen kadar döndü ise daha fazlası var demektir
        });

    } catch (err) {
        console.error('Durak verisi alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak verisi alınamadı.' });
    }
});

// API Endpoint: Durak arama (tüm duraklar arasından arama) - OPTIMIZE EDİLDİ
app.get('/api/stops/search', async (req, res) => {
    const searchTerm = req.query.q || '';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // ✅ Arama için maksimum limit 1000
    const actualLimit = Math.min(limit, 1000);

    if (!searchTerm.trim()) {
        return res.status(400).json({ error: 'Arama terimi boş olamaz.' });
    }

    console.log(`🔍 Durak araması: "${searchTerm}", limit=${actualLimit}, offset=${offset}`);

    try {
        // Arama query'si - durak adı veya ID'ye göre arama
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

        // ✅ Performans için sadece ilk sayfa için toplam sayıyı hesapla
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

// API Endpoint: Tüm durak sayısını döndür (Tümünü Seç için)
app.get('/api/stops/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM stops');
        const totalStops = parseInt(result.rows[0].count);
        
        console.log(`📊 Toplam durak sayısı: ${totalStops}`);
        
        res.json({ 
            total: totalStops 
        });
        
    } catch (err) {
        console.error('Durak sayısı alınırken hata:', err.stack);
        res.status(500).json({ error: 'Durak sayısı alınamadı.' });
    }
});

// API Endpoint: Tüm durak ID'lerini döndür (Tümünü Seç için) - OPTIMIZE EDİLDİ
app.get('/api/stops/all-ids', async (req, res) => {
    const limit = parseInt(req.query.limit) || 1000; // ✅ Varsayılan limit 1000
    const offset = parseInt(req.query.offset) || 0;
    
    // ✅ Güvenlik: maksimum 2000 ID döndür
    const actualLimit = Math.min(limit, 2000);
    
    console.log(`🎯 Tüm durak ID'leri çekiliyor: limit=${actualLimit}, offset=${offset}`);
    
    try {
        const result = await pool.query(
            'SELECT stop_id FROM stops ORDER BY stop_name ASC LIMIT $1 OFFSET $2', 
            [actualLimit, offset]
        );
        
        const stopIds = result.rows.map(row => row.stop_id);
        
        console.log(`✅ ${stopIds.length} durak ID'si döndürüldü`);
        
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

// ✅ YENİ: Hızlı durak ID'leri endpoint'i (sadece ID'ler, coğrafi veri yok)
app.get('/api/stops/ids-only', async (req, res) => {
    const limit = parseInt(req.query.limit) || 1000;
    const actualLimit = Math.min(limit, 5000); // Sadece ID olduğu için daha yüksek limit
    
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

// API Endpoint: Batch olarak durak bilgilerini al (performans için) - OPTIMIZE EDİLDİ
app.post('/api/stops/batch', async (req, res) => {
    const { stopIds } = req.body;
    
    if (!stopIds || !Array.isArray(stopIds) || stopIds.length === 0) {
        return res.status(400).json({ error: 'Geçerli durak ID listesi gönderilmedi.' });
    }
    
    // ✅ Limit artırıldı: 2000'e kadar
    if (stopIds.length > 2000) {
        return res.status(400).json({ error: 'Tek seferde en fazla 2000 durak sorgulanabilir.' });
    }

    console.log(`📦 Batch durak sorgusu: ${stopIds.length} durak`);

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

        console.log(`📦 Batch sonucu: ${formattedStops.length}/${stopIds.length} durak bulundu`);

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

app.listen(PORT, () => {
    console.log(`🚀 Backend sunucu http://localhost:${PORT} adresinde çalışıyor.`);
    console.log(`📊 Maksimum durak limitleri: Normal=2000, Batch=2000, IDs-only=5000`);
});