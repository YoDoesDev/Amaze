const { db } = require('./database.js');

// Makeshift PrefixCache, will test optimization later.
const prefixCache = new Map();
let preparedPrefix = null;
let upsertPrefixStmt = null;

function getPrefixStmt() {
    if (!preparedPrefix) {
        preparedPrefix = db.prepare(
            "SELECT prefix FROM guild_settings WHERE guildid = ?"
        );
    }
    return preparedPrefix;
}

function getUpsertStmt() {
    if (!upsertPrefixStmt) {
        upsertPrefixStmt = db.prepare(`
            INSERT INTO guild_settings (guildid, prefix)
            VALUES (?, ?)
            ON CONFLICT(guildid) DO UPDATE SET prefix = excluded.prefix
        `);
    }
    return upsertPrefixStmt;
}

function getPrefix(guildId) {
    if (!guildId) return "!";

    if (prefixCache.has(guildId)) {
        return prefixCache.get(guildId);
    }

    const row = getPrefixStmt().get(guildId);
    const prefix = row?.prefix || "!";

    prefixCache.set(guildId, prefix);

    return prefix;
}

function setPrefix(guildId, prefix) {
    if (!guildId) return;
    prefixCache.set(guildId, prefix);
    getUpsertStmt().run(guildId, prefix);
}

module.exports = {
    getPrefix,
    setPrefix
};
