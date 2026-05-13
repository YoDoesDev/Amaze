const { db } = require('./database.js');

// Makeshift PrefixCache, will test optimization later.
const prefixCache = new Map();
const preparedPrefix = db.prepare(
    "SELECT prefix FROM guild_settings WHERE guildid = ?"
);

function getPrefix(guildId) {
    if (prefixCache.has(guildId)) {
        return prefixCache.get(guildId);
    }

    const row = preparedPrefix.get(guildId);
    const prefix = row?.prefix || "!";

    prefixCache.set(guildId, prefix);

    return prefix;
}

function setPrefix(guildId, prefix) {
    prefixCache.set(guildId, prefix);
}

module.exports = {
    getPrefix,
    setPrefix
};
