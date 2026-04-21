const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./amaze.sqlite', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the amaze.sqlite database.');
});

const initDb = () => {
    db.serialize(() => {
        // Table 1: Pings
        db.run(`CREATE TABLE IF NOT EXISTS pings (user_id TEXT PRIMARY KEY, count INTEGER DEFAULT 0)`);
        
        // Table 2: Reputation
        db.run(`CREATE TABLE IF NOT EXISTS reputation (user_id TEXT PRIMARY KEY, points INTEGER DEFAULT 0)`);

        // Table 3: Vouch History
        db.run(`CREATE TABLE IF NOT EXISTS vouch_history (
            voucher_id TEXT,
            receiver_id TEXT,
            timestamp INTEGER,
            PRIMARY KEY (voucher_id, receiver_id)
        )`);

        // Table 4: Amash Holders
        db.run(`CREATE TABLE IF NOT EXISTS amash
            userid TEXT PRIMARY KEY, 
            bucks INTEGER DEFAULT 0
            dTimestamp INTEGER DEFAULT 0
            wTimestamp INTEGER DEFAULT 0
            mTimestamp INTEGER DEFAULT 0`);
    });
}

module.exports = { db, initDb };
