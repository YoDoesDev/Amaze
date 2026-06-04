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

const TABLE_SCHEMAS = {
    pings: { keys: ['userid'], defaults: { count: 0 } },
    reputation: { keys: ['userid'], defaults: { points: 0 } },
    amash: { keys: ['userid'], defaults: { bucks: 0, dTimestamp: 0, wTimestamp: 0, mTimestamp: 0 } },
    inventory: { keys: ['userid'], defaults: { pr_tp: 0, ddbl_tp: 0, dblv_tp: 0, stocklic: 0, pstone: 0 } },
    guild_settings: { keys: ['guildid'], defaults: { prefix: '!' } },
    vouch_history: { keys: ['voucher_id', 'receiver_id'] },
    investments: { keys: ['investor', 'invested'], defaults: { stocks: 0, baseprice: 70, profit: 0, lastpurchase: 0 } }
};

function universalGet(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    if (schema.keys.length === 1) {
        return db.prepare(`SELECT * FROM ${tableName} WHERE ${schema.keys[0]} = ?`).get(primaryId) || null;
    } else {
        if (!secondaryId) throw new Error(`>>> [DB ERROR] Table "${tableName}" requires dual keys.`);
        return db.prepare(`SELECT * FROM ${tableName} WHERE ${schema.keys[0]} = ? AND ${schema.keys[1]} = ?`).get(primaryId, secondaryId) || null;
    }
}

function universalCreate(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    if (schema.keys.length === 1) {
        db.prepare(`INSERT OR IGNORE INTO ${tableName} (${schema.keys[0]}) VALUES (?)`).run(primaryId);
        return { [schema.keys[0]]: primaryId, ...schema.defaults };
    } else {
        db.prepare(`INSERT OR IGNORE INTO ${tableName} (${schema.keys[0]}, ${schema.keys[1]}) VALUES (?, ?)`).run(primaryId, secondaryId);
        return { [schema.keys[0]]: primaryId, [schema.keys[1]]: secondaryId, ...schema.defaults };
    }
}

function universalSet(tableName, primaryId, secondaryIdOrData, dataOrNull = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    const isComposite = schema.keys.length === 2;
    const secondaryId = isComposite ? secondaryIdOrData : null;
    const updateData = isComposite ? dataOrNull : secondaryIdOrData;
    
    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(updateData)];
    
    if (!isComposite) {
        values.push(primaryId);
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${schema.keys[0]} = ?`).run(...values);
    } else {
        values.push(primaryId, secondaryId);
        db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE ${schema.keys[0]} = ? AND ${schema.keys[1]} = ?`).run(...values);
    }
}

function universalDelete(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" not found.`);

    if (schema.keys.length === 2) {
        if (!secondaryId) throw new Error("Secondary ID required for composite table deletion.");
        return db.prepare(`DELETE FROM ${tableName} WHERE ${schema.keys[0]} = ? AND ${schema.keys[1]} = ?`).run(primaryId, secondaryId).changes > 0;
    } else {
        return db.prepare(`DELETE FROM ${tableName} WHERE ${schema.keys[0]} = ?`).run(primaryId).changes > 0;
    }
}

function universalFetchAll(tableName, primaryId) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    return db.prepare(`SELECT * FROM ${tableName} WHERE ${schema.keys[0]} = ?`).all(primaryId) || [];
}

module.exports = { universalGet, universalCreate, universalSet, universalDelete, universalFetchAll, db, initDb };
