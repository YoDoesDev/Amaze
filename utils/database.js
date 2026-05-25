const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'amaze.sqlite');

// Load existing database file into memory buffer if it exists
let dbBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
let dbInstance;

// Synchronously initialize the WebAssembly engine
initSqlJs().then(SQL => {
    if (dbBuffer) {
        dbInstance = new SQL.Database(dbBuffer);
    } else {
        dbInstance = new SQL.Database();
        // Force write an empty file so it exists
        fs.writeFileSync(dbPath, Buffer.from(dbInstance.export()));
    }
    console.log('>>> [DATABASE] Connected to amaze.sqlite cleanly via WASM (Pure JS).');
    
    // Automatically boot tables
    initDb();
}).catch(err => {
    console.error("Failed to initialize pure-JS database wrapper:", err);
});

// Helper function to persist memory changes back into the physical file
const saveToDisk = () => {
    if (!dbInstance) return;
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
};

// Mirroring better-sqlite3 API structural surface
const db = {
    pragma: (str) => {}, // Pragmas handled automatically by WASM engine
    prepare: (sql) => {
        // Convert '?' syntax parameters to fit sql.js array structure mapping
        return {
            get: (...params) => {
                if (!dbInstance) return null;
                const stmt = dbInstance.prepare(sql);
                stmt.bind(params);
                let result = null;
                if (stmt.step()) {
                    result = stmt.getAsObject();
                }
                stmt.free();
                // If it's an empty row object, return null to match better-sqlite3
                return result && Object.keys(result).length > 0 ? result : null;
            },
            run: (...params) => {
                if (!dbInstance) return { changes: 0, lastID: 0 };
                dbInstance.run(sql, params);
                saveToDisk(); // Instantly write data updates to your phone file system
                return { changes: 1, lastID: 1 };
            }
        };
    }
};

const initDb = () => {
    // Exact schema setups from your source script
    db.prepare(`CREATE TABLE IF NOT EXISTS pings (userid TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS reputation (userid TEXT PRIMARY KEY, points INTEGER DEFAULT 0)`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS vouch_history (
        voucher_id TEXT,
        receiver_id TEXT,
        timestamp INTEGER,
        PRIMARY KEY (voucher_id, receiver_id)
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS amash (
        userid TEXT PRIMARY KEY, 
        bucks INTEGER DEFAULT 0,
        dTimestamp INTEGER DEFAULT 0,
        wTimestamp INTEGER DEFAULT 0,
        mTimestamp INTEGER DEFAULT 0
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS investments (
         investor TEXT, 
         invested TEXT, 
         stocks INTEGER DEFAULT 0,
         baseprice INTEGER DEFAULT 70,
         profit INTEGER DEFAULT 0,
         lastpurchase INTEGER DEFAULT 0,
         PRIMARY KEY (investor, invested) 
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory (
        userid TEXT PRIMARY KEY,
        pr_tp INTEGER DEFAULT 0,
        ddbl_tp INTEGER DEFAULT 0,
        dblv_tp INTEGER DEFAULT 0,
        stocklic INTEGER DEFAULT 0,
        pstone INTEGER DEFAULT 0
    )`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS guild_settings (
        guildid TEXT PRIMARY KEY,
        prefix TEXT DEFAULT '!'
    )`).run();

    console.log(">>> [DATABASE] All tables verified and ready via Pure JS.");
};

module.exports = { db, initDb };
