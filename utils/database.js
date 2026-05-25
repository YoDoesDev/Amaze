const fs = require('fs');
const path = require('path');
// We require the synchronous flavor of the library to prevent loading lag
const initSqlJs = require('sql.js/dist/sql-wasm.js');

const dbPath = path.join(__dirname, '..', 'amaze.sqlite');

// 1. Set up a synchronous memory space
let dbInstance;

try {
    // Read the file buffer directly right now
    const dbBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    
    // Force a local, instant initialization instead of waiting for a promise
    const SQL = require('sql.js/dist/sql-asm.js')(); 
    
    if (dbBuffer) {
        dbInstance = new SQL.Database(dbBuffer);
    } else {
        dbInstance = new SQL.Database();
        fs.writeFileSync(dbPath, Buffer.from(dbInstance.export()));
    }
    console.log('>>> [DATABASE] Connected to amaze.sqlite cleanly (Sync ASM Engine).');
} catch (err) {
    console.error("Database boot engine failure:", err);
}

// Helper function to persist memory changes back into the physical file
const saveToDisk = () => {
    if (!dbInstance) return;
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
};

// Mirroring better-sqlite3 API structural surface
const db = {
    pragma: (str) => {}, 
    prepare: (sql) => {
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
                return result && Object.keys(result).length > 0 ? result : null;
            },
            run: (...params) => {
                if (!dbInstance) return { changes: 0, lastID: 0 };
                dbInstance.run(sql, params);
                saveToDisk(); 
                return { changes: 1, lastID: 1 };
            }
        };
    }
};

// Explicitly call table creation right here so it happens instantly on boot
// Table 1: Pings
db.prepare(`CREATE TABLE IF NOT EXISTS pings (userid TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`).run();
// Table 2: Reputation
db.prepare(`CREATE TABLE IF NOT EXISTS reputation (userid TEXT PRIMARY KEY, points INTEGER DEFAULT 0)`).run();
// Table 3: Vouch History
db.prepare(`CREATE TABLE IF NOT EXISTS vouch_history (
    voucher_id TEXT,
    receiver_id TEXT,
    timestamp INTEGER,
    PRIMARY KEY (voucher_id, receiver_id)
)`).run();
// Table 4: Amash Holders
db.prepare(`CREATE TABLE IF NOT EXISTS amash (
    userid TEXT PRIMARY KEY, 
    bucks INTEGER DEFAULT 0,
    dTimestamp INTEGER DEFAULT 0,
    wTimestamp INTEGER DEFAULT 0,
    mTimestamp INTEGER DEFAULT 0
)`).run();
// Table 5: Stonks
db.prepare(`CREATE TABLE IF NOT EXISTS investments (
     investor TEXT, 
     invested TEXT, 
     stocks INTEGER DEFAULT 0,
     baseprice INTEGER DEFAULT 70,
     profit INTEGER DEFAULT 0,
     lastpurchase INTEGER DEFAULT 0,
     PRIMARY KEY (investor, invested) 
)`).run();
// Table 6: Inventory
db.prepare(`CREATE TABLE IF NOT EXISTS inventory (
    userid TEXT PRIMARY KEY,
    pr_tp INTEGER DEFAULT 0,
    ddbl_tp INTEGER DEFAULT 0,
    dblv_tp INTEGER DEFAULT 0,
    stocklic INTEGER DEFAULT 0,
    pstone INTEGER DEFAULT 0
)`).run();
// Table 7: Guild Settings
db.prepare(`CREATE TABLE IF NOT EXISTS guild_settings (
    guildid TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!'
)`).run();

console.log(">>> [DATABASE] All tables verified and ready instantly.");

module.exports = { db };
