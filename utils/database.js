const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'amaze.sqlite'), {});

console.log('>>> [DATABASE] Connected to amaze.sqlite (Better-SQLite3).');

const initDb = () => {
    db.pragma('journal_mode = DELETE');
    db.pragma('synchronous = OFF');
    db.pragma('temp_store = MEMORY');
    
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
    
    console.log(">>> [DATABASE] All tables verified and ready.");
};

// --- DATABASE ARCHITECTURE SCHEMA MATRIX ---
const TABLE_SCHEMAS = {
    pings: { keys: ['userid'], defaults: { count: 0 } },
    reputation: { keys: ['userid'], defaults: { points: 0 } },
    amash: { keys: ['userid'], defaults: { bucks: 0, dTimestamp: 0, wTimestamp: 0, mTimestamp: 0 } },
    inventory: { keys: ['userid'], defaults: { pr_tp: 0, ddbl_tp: 0, dblv_tp: 0, stocklic: 0, pstone: 0 } },
    guild_settings: { keys: ['guildid'], defaults: { prefix: '!' } },
    
    // Composite Dual-Key Tables
    vouch_history: { keys: ['voucher_id', 'receiver_id'] },
    investments: { keys: ['investor', 'invested'], defaults: { stocks: 0, baseprice: 70, profit: 0, lastpurchase: 0 } }
};

/**
 * 1. UNIVERSAL GETTER
 * Retrieves a single unique row from a target table. Returns null if it doesn't exist.
 * @param {string} tableName - Target SQLite table name
 * @param {string} primaryId - First lookup ID (e.g., userid or guildid)
 * @param {string} [secondaryId] - Secondary lookup ID (Required for composite tables)
 * @returns {object|null} The row object or null if not found
 */
function universalGet(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered in the schema matrix.`);
    
    // Handle Single-Key Tables
    if (schema.keys.length === 1) {
        const keyName = schema.keys[0];
        const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${keyName} = ?`).get(primaryId);
        return row || null;
    }
    
    // Handle Composite-Key Tables
    if (schema.keys.length === 2) {
        if (!secondaryId) throw new Error(`>>> [DB ERROR] Table "${tableName}" requires both tracking keys for matching.`);
        const [key1, key2] = schema.keys;
        const row = db.prepare(`SELECT * FROM ${tableName} WHERE ${key1} = ? AND ${key2} = ?`).get(primaryId, secondaryId);
        return row || null;
    }
}

/**
 * 2. UNIVERSAL CREATOR / REGISTRATION SEEDER
 * Explicitly initializes a brand-new row in the target table using primary schema structures.
 * @param {string} tableName - Target SQLite table name
 * @param {string} primaryId - First structural ID
 * @param {string} [secondaryId] - Secondary tracking ID for composite entries
 * @returns {object} The complete, default-seeded object structure that was saved
 */
function universalCreate(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered in the schema matrix.`);
    
    // Seed Single-Key Tables
    if (schema.keys.length === 1) {
        const keyName = schema.keys[0];
        db.prepare(`INSERT OR IGNORE INTO ${tableName} (${keyName}) VALUES (?)`).run(primaryId);
        return {
            [keyName]: primaryId, ...schema.defaults };
    }
    
    // Seed Composite-Key Tables
    if (schema.keys.length === 2) {
        const [key1, key2] = schema.keys;
        
        if (tableName === 'vouch_history') {
            const currentTimestamp = Date.now();
            db.prepare(`INSERT OR IGNORE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(primaryId, secondaryId, currentTimestamp);
            return { voucher_id: primaryId, receiver_id: secondaryId, timestamp: currentTimestamp };
        }
        
        db.prepare(`INSERT OR IGNORE INTO investments (investor, invested) VALUES (?, ?)`).run(primaryId, secondaryId);
        return { investor: primaryId, invested: secondaryId, ...schema.defaults };
    }
}

/**
 * 3. UNIVERSAL MUTATOR / SETTER
 * Dynamically builds an optimized update string to modify only specified properties.
 * @param {string} tableName - Target SQLite table name
 * @param {string} primaryId - First structural lookup ID
 * @param {object} updateData - Key-Value object containing target mutations (e.g. { bucks: 50 })
 * @param {string} [secondaryId] - Secondary structural lookup ID for composite entries
 */
function universalSet(tableName, primaryId, updateData, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered in the schema matrix.`);
    
    const columns = Object.keys(updateData);
    if (columns.length === 0) return; // Drop out early if no values given
    
    // Dynamic clause translation: "bucks = ?, dTimestamp = ?"
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => updateData[col]);
    
    // Update Single-Key Rows
    if (schema.keys.length === 1) {
        const keyName = schema.keys[0];
        values.push(primaryId);
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${keyName} = ?`).run(...values);
        return;
    }
    
    // Update Composite-Key Rows
    if (schema.keys.length === 2) {
        if (!secondaryId) throw new Error(`>>> [DB ERROR] Table "${tableName}" requires secondary coordinates for mutations.`);
        const [key1, key2] = schema.keys;
        values.push(primaryId, secondaryId);
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${key1} = ? AND ${key2} = ?`).run(...values);
        return;
    }
}

/**
 * 4. UNIVERSAL FETCH ALL
 * Retrieves all rows matching the main primary ID (Useful for portfolios or logs).
 * @param {string} tableName - Target SQLite table name
 * @param {string} primaryId - The dominant lookup ID (e.g., investor ID)
 * @returns {Array} An array containing all matching row objects, or an empty list
 */
function universalFetchAll(tableName, primaryId) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered in the schema matrix.`);
    
    const primaryKeyName = schema.keys[0];
    const rows = db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKeyName} = ?`).all(primaryId);
    
    return rows || [];
}

// --- MODULE EXPORTS ---
module.exports = {
    universalGet,
    universalCreate,
    universalSet,
    universalFetchAll,
    db,
    initDb
};