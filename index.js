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
const { handleCooldown } = require('./utils/handlers/cooldowns.js');
const { autoMsg } = require('./utils/handlers/autoMsg.js');
const { setupIntegrations } = require('./utils/handlers/integrations.js');
const { slashReg } = require('./utils/handlers/slash-deploy.js');
const { execute } = require("./utils/eval.js");
const { taxes } = require("./utils/handlers/taxes.js");
const { parseCommand } = require("./utils/handlers/cmdParse.js");
const { executeCommand } = require("./utils/handlers/execute.js");
const { slashExecute } = require("./utils/handlers/slashExecute.js");

// --- 4. INITIALIZATION ---
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

// PREFIXMANAGER LOADS AFTER DATABASE IS ESTABLISHED.
const { getPrefix } = require('./utils/prefixManager.js');

// --- 5. CLIENT READY EVENT ---
client.once("clientReady", () => {
    console.log(`>>> [SYSTEM] Amaze Live: ${client.guilds.cache.size} servers.`);
    
    // Launch Webhooks and Top.gg Sync
    setupIntegrations(client, app, db);

    client.user.setActivity(`!help | Circulating Amash in ${client.guilds.cache.size} servers`, { 
         type: ActivityType.Watching
    });
});

// --- 6. INTERACTION HANDLER ---
client.on("interactionCreate", async interaction => {
    // Return if it comes from a button
    if (interaction.isButton()) return;
    // If not a chat input command return
    if (!interaction.isChatInputCommand()) return;
    // Retrieve the command from the defined collection
    const command = client.slashCommands.get(interaction.commandName);
    // If the command doesn't exist, return
    if (!command) return;
    // Execute
    await slashExecute(interaction, command);
});

// --- 7. MESSAGE HANDLER ---
client.on('messageCreate', async (message) => {
    // Basic Gates
    if (message.author.bot) return;
    // Fetching Prefix
    const prefix = getPrefix(message.guild?.id) || "!";
    // Look for swears
    autoMsg(message, prefix);
    // If doesn't start with prefix return
    if(!message.content.startsWith("!") && !message.content.startsWith(prefix)) return;
    // Command Parsing
    const parsed = parseCommand(message, prefix, client);
    // Taking values from parsed object
    const command = parsed?.command;
    const args = parsed?.args;
    // Checking if it's eval
    if (message.content.startsWith(`!eval`)) return await execute(message, client, db);
    // If no written command exists return
    if (!command) return;
    // Cooldown
    if (handleCooldown(message, command)) return;
    // Tax time
    await taxes(message, message.author.id);
    // Execution
    await executeCommand(command, message, args, prefix);
});

// Shield 1: Catches errors in async/promised code (like Discord API calls)
process.on('unhandledRejection', (error) => {
  console.error('Promise rejection:', error);
});

// Shield 2: Catches standard synchronous errors before they hit the floor
process.on('uncaughtException', (error) => {
  console.error('Exception:', error);
});
// --- 8. START BOT ---
client.login(process.env.TOKEN);
