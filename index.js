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
const { loadCommands, loadSlashCommands } = require('./utils/Index/cmdLoader.js');
const { handleCooldown } = require('./utils/cooldowns.js');
const { autoMsg } = require('./utils/Index/autoMsg.js');
const { setupIntegrations } = require('./utils/Index/integrations.js');
const { slashReg } = require('./utils/Index/slash-deploy.js');
const { execute } = require("./utils/eval.js");
const { taxes } = require("./utils/taxes.js");

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
    slashReg();
    // Launch Webhooks and Top.gg Sync
    setupIntegrations(client, app, db);

    client.user.setActivity(`!help | Circulating Amash in ${client.guilds.cache.size} servers`, { 
         type: ActivityType.Watching
    });
});

// --- 6. INTERACTION HANDLER ---
client.on("interactionCreate", async interaction => {
    // 1. Guard check: instantly exit if it's a button interaction
    if (interaction.isButton()) return;
    
    // 2. Only pass Chat Input (Slash) commands down to execution
    if (!interaction.isChatInputCommand()) return;
    
    // 3. Retrieve the command from your defined collection
    const command = client.slashCommands.get(interaction.commandName);

    // 4. If the command doesn't exist, just exit
    if (!command) return;

    try {
        // 5. Defer the reply globally for your slash commands right before running them
        await interaction.deferReply();
        
        await taxes(interaction, interaction.user.id);
        // if (handleSlashCd(interaction, command)) return;
        
        // 6. Run the command's execute function
        await command.execute(interaction); 

    } catch (error) {
        console.error(`[ERROR] Execution failed for /${interaction.commandName}:`, error);

        // User-friendly error handling fallback
        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// --- 7. MESSAGE HANDLER ---
client.on('messageCreate', async (message) => {
    // Basic Gates
    if (message.author.bot) return;
    
    const prefix = getPrefix(message.guild?.id) || "!";

    // Run Auto-Replies (thx, fk u, etc.)
    autoMsg(message, prefix);

    // Command Gate
    if (!message.content.startsWith(prefix)) return;
    if (message.content.startsWith(`${prefix}eval`)) {
         return await execute(message, client, db);
    }

    await taxes(message, message.author.id);
    
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
