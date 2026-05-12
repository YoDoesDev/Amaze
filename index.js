// Automated Deploy Active: May 2026.
// Amaze Bot - Optimized for Performance and Scalability

// --- 1. EXTERNAL DEPENDENCIES ---
const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    ActivityType, 
    Options 
} = require('discord.js');
const express = require('express');
require('dotenv').config();

// --- DATABASE & MANAGERS ---
const { initDb, db } = require('./utils/database.js');
const { getPrefix } = require('./utils/prefixManager.js');


// --- 3. CUSTOM UTILITIES ---
const { loadCommands } = require('./utils/cmdLoader.js');
const { handleCooldown } = require('./utils/cooldowns.js');
const { autoMsg } = require('./utils/automsg.js');
const { setupIntegrations } = require('./utils/integrations.js');

// --- 4. INITIALIZATION ---
const app = express();
app.use(express.json());

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
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
client.aliases = new Map();

// Fire up the systems
initDb();
loadCommands(client);

// --- 5. CLIENT READY EVENT ---
client.once("clientReady", () => {
    console.log(`>>> [SYSTEM] Amaze Live: ${client.guilds.cache.size} servers.`);
    
    // Launch Webhooks and Top.gg Sync
    setupIntegrations(client, app, db);

    client.user.setActivity(`!help | Circulating Amash in ${client.guilds.cache.size} servers`, { 
         type: ActivityType.Watching
    });
});

// --- 6. MESSAGE HANDLER ---
client.on('messageCreate', async (message) => {
    // Basic Gates
    if (message.author.bot) return;
    
    const prefix = getPrefix(message.guild.id) || "!";

    // Run Auto-Replies (thx, fk u, etc.)
    autoMsg(message, prefix);

    // Command Gate
    if (!message.content.startsWith(prefix)) return;

    // Command Parsing
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const trueCommandName = client.aliases.get(commandName) || commandName;
    const command = client.commands.get(trueCommandName);

    if (!command) return;

    // Cooldown Logic
    if (handleCooldown(message, command)) return;

    // Execution Logic
    try {
        await command.execute(message, args);

        // Rare chance for a vote reminder (Social Proof)
        if (Math.random() < 0.07) {
            message.reply(`Having fun? Use \`${prefix}vote\` to support Amaze!`);
        }
    } catch (error) {
        console.error(`>>> [ERROR] Command Execution: ${error.message}`);
        message.reply("There was an error executing that command!");
    }   
});

// --- 7. START BOT ---
client.login(process.env.TOKEN);
