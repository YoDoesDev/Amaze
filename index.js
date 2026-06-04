// Automated Deploy Active: May 2026.
// Amaze Bot - Optimized for Performance and Scalability

// --- 1. EXTERNAL DEPENDENCIES ---
const {
    Client,
    Collection,
    GatewayIntentBits,
    ActivityType,
    Options,
    Partials
} = require('discord.js');
const express = require('express');
require('dotenv').config();

// --- DATABASE & MANAGERS ---
const { initDb, db } = require('./utils/database.js');

// --- 3. CUSTOM UTILITIES ---
const { loadCommands, loadSlashCommands } = require('./utils/handlers/cmdLoader.js');
const { setupIntegrations } = require('./utils/handlers/integrations.js');

// --- 4. EVENT HANDLERS ---
const { greetings } = require("./utils/events/guildCreate.js");
const { execPrefix } = require("./utils/events/messageCreate.js");
const { execSlash } = require("./utils/events/interactionCreate.js");

// --- 5. INITIALIZATION ---
const app = express();
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ],
    partials: [
        Partials.Channel
    ],
    // Extreme memory optimization for 256MB RAM
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
        ReactionManager: 0,
        GuildMemberManager: 50,
        UserManager: 50,
        ThreadManager: 0,
        ThreadMemberManager: 0
    })
});

client.commands = new Collection();
client.slashCommands = new Collection();
client.aliases = new Map();

// Fire up the systems
initDb();
loadCommands(client);
loadSlashCommands(client);

// --- 6. CLIENT READY EVENT ---
client.once("clientReady", () => {
    console.log(`>>> [SYSTEM] Amaze Live: ${client.guilds.cache.size} servers.`);
    
    // Launch Webhooks and Top.gg Sync
    setupIntegrations(client, app, db);
    
    client.user.setActivity(`!help | Circulating Amash in ${client.guilds.cache.size} servers`, {
        type: ActivityType.Watching
    });
});

// --- 7. INTERACTION LISTENER ---
client.on("interactionCreate", async interaction => {
    await execSlash(interaction, client);
});

// --- 8. MESSAGE LISTENER ---
client.on('messageCreate', async (message) => {
    await execPrefix(message, client);
});

client.on("guildCreate", async guild => {
    await greetings(guild);
});

process.on('unhandledRejection', (error) => {
    console.error('Promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Exception:', error);
});
// --- 9. START BOT ---
client.login(process.env.TOKEN);