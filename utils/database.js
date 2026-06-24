const path = require('path');
const Database = require('better-sqlite3');

const {
    reputation, 
    amash, 
    vouch_history, 
    inventory, 
    investments, 
    portfolio, 
    characters
} = require("./cache.js");

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
    db.prepare(`CREATE TABLE IF NOT EXISTS
    characters (
        userid TEXT PRIMARY KEY, 
        type INTEGER DEFAULT 0,
        spd INTEGER DEFAULT 10,
        str INTEGER DEFAULT 20,
        dma INTEGER DEFAULT 5,
        xp INTEGER DEFAULT 0,
        lvl INTEGER DEFAULT 0
    )`).run();
    
    console.log(">>> [DATABASE] All tables verified and ready.");
};

const TABLE_SCHEMAS = {
    pings: { keys: ['userid'], defaults: { count: 0 } },
    reputation: { keys: ['userid'], defaults: { points: 0 }, cache: reputation},
    amash: { keys: ['userid'], defaults: { bucks: 0, dTimestamp: 0, wTimestamp: 0, mTimestamp: 0 }, cache: amash},
    inventory: { keys: ['userid'], defaults: { pr_tp: 0, ddbl_tp: 0, dblv_tp: 0, stocklic: 0, pstone: 0 }, cache: inventory},
    guild_settings: { keys: ['guildid'], defaults: { prefix: '!' } },
    vouch_history: { keys: ['voucher_id', 'receiver_id'], cache: vouch_history}, 
    investments: { keys: ['investor', 'invested'], defaults: { stocks: 0, baseprice: 70, profit: 0, lastpurchase: 0 }, cache: investments, cacheCollection: portfolio}, 
    characters : {
        keys: ['userid'], 
        defaults: {
            type: 0,
            spd: 10,
            str: 20,
            dma: 5,
            xp: 0,
            lvl: 0
        }, 
        cache: characters
    }
};

function universalGet(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    const cacheKey = secondaryId? `${primaryId}:${secondaryId}`:primaryId;
    if(schema.cache.has(cacheKey)){
        return schema.cache.get(cacheKey).data;
    }
    
    let query = `SELECT * FROM ${tableName} WHERE ${schema.keys[0]} = ? `;
    const pass = [primaryId];
    
    if(secondaryId !== null){
        query += `AND ${schema.keys[1]} = ?`;
        pass.push(secondaryId);
    }
    
    const data = db.prepare(query).get(...pass);
    
    if(data) schema.cache.set(cacheKey, {
        data, 
        timestamp: Date.now()
    });
    
    return data;
}

function universalCreate(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    // 1. Build dynamic query
    const keys = secondaryId ? schema.keys : [schema.keys[0]];
    const values = secondaryId ? [primaryId, secondaryId] : [primaryId];
    
    // Convert keys array to string (e.g., "user_id, guild_id")
    const keyString = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    
    // 2. Insert
    db.prepare(`INSERT OR IGNORE INTO ${tableName} (${keyString}) VALUES (${placeholders})`).run(...values);
    
    // 3. Create initial data object
    const data = { 
        [schema.keys[0]]: primaryId, 
        ...(secondaryId && { [schema.keys[1]]: secondaryId }),
        ...schema.defaults 
    };
    
    // 4. Update Cache
    const cacheKey = secondaryId ? `${primaryId}:${secondaryId}` : primaryId;
    schema.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
}


function universalSet(tableName, primaryId, updateData, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);

    // 1. Build the dynamic UPDATE clause
    const columns = Object.keys(updateData);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(updateData)];

    // 2. Build the WHERE clause and push primary/secondary keys
    let whereClause = `WHERE ${schema.keys[0]} = ?`;
    values.push(primaryId);

    if (secondaryId !== null) {
        whereClause += ` AND ${schema.keys[1]} = ?`;
        values.push(secondaryId);
    }

    // 3. Execute
    db.prepare(`UPDATE ${tableName} SET ${setClause} ${whereClause}`).run(...values);

    // 4. Update Cache (Sync memory)
    const cacheKey = secondaryId ? `${primaryId}:${secondaryId}` : primaryId;
    if (schema.cache.has(cacheKey)) {
        const cached = schema.cache.get(cacheKey);
        // Merge the new data into the existing cached object
        schema.cache.set(cacheKey, {
            data: { ...cached.data, ...updateData },
            timestamp: Date.now()
        });
    } 
    
    if (schema.cacheCollection) {
        schema.cacheCollection.delete(primaryId);
    }
}


function universalDelete(tableName, primaryId, secondaryId = null) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" not found.`);
    
    // Safety check for composite keys
    if (schema.keys.length > 1 && !secondaryId) {
        throw new Error(`>>> [DB ERROR] Secondary ID required for composite table "${tableName}".`);
    }

    const cacheKey = secondaryId ? `${primaryId}:${secondaryId}` : primaryId;
    
    // Build query dynamically
    let query = `DELETE FROM ${tableName} WHERE ${schema.keys[0]} = ?`;
    const params = [primaryId];
    
    if (secondaryId !== null) {
        query += ` AND ${schema.keys[1]} = ?`;
        params.push(secondaryId);
    }

    // Delete and clear cache
    const result = db.prepare(query).run(...params);
    schema.cache.delete(cacheKey);
    
    if (schema.cacheCollection) {
        schema.cacheCollection.delete(primaryId);
    }


    return result.changes > 0;
}


function universalFetchAll(tableName, primaryId) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) throw new Error(`>>> [DB ERROR] Table "${tableName}" is not registered.`);
    
    if (!schema.cacheCollection) {
        throw new Error(`>>> [DB ERROR] Table "${tableName}" does not support collection fetching.`);
    }
    
    const cacheKey = primaryId;
    
    if(schema.cacheCollection.has(primaryId)) {
        return schema.cacheCollection.get(primaryId).data;
    }
    
    const data = db.prepare(`SELECT * FROM ${tableName} WHERE ${schema.keys[0]} = ?`).all(primaryId) || [];
    
    schema.cacheCollection.set(cacheKey, {
        data, 
        timestamp: Date.now()
    });
    
    return data;
}

module.exports = { universalGet, universalCreate, universalSet, universalDelete, universalFetchAll, db, initDb };
