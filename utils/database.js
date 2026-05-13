// 1. Connect to the database
// This replaces the old new sqlite3.Database() with a synchronous connection
const path = require('path');
const Database = require('better-sqlite3'); // Or your specific sqlite package

// We use '..' to go out of the 'utils' folder and find the file in the root
const db = new Database(path.join(__dirname, '..', 'amaze.sqlite'), {});

module.exports = { db };


console.log('>>> [DATABASE] Connected to amaze.sqlite (Better-SQLite3).');

const initDb = () => {
    // 2. Set Performance Settings
    // These replace your old db.run("PRAGMA...") calls
    db.pragma('journal_mode = DELETE');
    db.pragma('synchronous = OFF');
    db.pragma('temp_store = MEMORY');

    // 3. Initialize Tables (Synchronous & Sequential)
    // Table 1: Pings
    db.prepare(`CREATE TABLE IF NOT EXISTS pings (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`).run();
    
    // Table 2: Reputation
    db.prepare(`CREATE TABLE IF NOT EXISTS reputation (user_id TEXT PRIMARY KEY, points INTEGER DEFAULT 0)`).run();
    
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

// starts

const userIdsToRemove = ['602199249079738368', '40434699'];

// Create the placeholders (?, ?, ?) based on the number of IDs
const placeholders = userIdsToRemove.map(() => '?').join(', ');

try {
    
    db.prepare(`DELETE FROM amash WHERE userid LIKE 122873311395844%`);
    // Delete from Amash
    db.prepare(`DELETE FROM amash WHERE userid IN (${placeholders})`).run(userIdsToRemove);

    console.log(`✅ Successfully purged ${userIdsToRemove.length} users from the database.`);
} catch (err) {
    console.error("Failed to delete users:", err);
}

// ends

    console.log(">>> [DATABASE] All tables verified and ready.");
};

module.exports = { db, initDb };
