// Automated Deploy Active: May 1, 2026.

const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { initDb, db } = require('./database.js');
const express = require('express');
const app = express();
app.use(express.json());
const fs = require('fs');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

client.once("clientReady", () => { // Fixed event name from "clientReady" to "ready"
    console.log("Bot is ready. GLHF, devs.");
});

client.commands = new Collection();
initDb();

// Command Registration
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}
console.log(`Amaze v1.0.1: Registered ${commandFiles.length} commands.`);

const cooldowns = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = '!';
    
    // 1. Quick Response Logic (Trigger Words)
    // We only do this if it's NOT a command to save processing time
    if (!message.content.startsWith(prefix)) {
        const content = message.content.toLowerCase();
        
        if (['thx', 'thanks', 'thank you', 'tysm'].some(w => content.includes(w))) {
            if (Math.random() < 0.3) {
                return message.channel.send(`Glad you're happy! Remember, you can use \`!vouch @user\` to increase their reputation!`);
            }
        }
        
        if (['fk u', 'fuck you', 'fuck u', 'i hate u'].some(w => content.includes(w))) {
            if (Math.random() < 0.6) {
                return message.channel.send(`Angry at someone? Use \`!defame @user\` to decrease their reputation!`);
            }
        }
        return;
    }

    // 2. Command Parsing
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || 
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) return;

    // 3. Cooldown Logic
    const now = Date.now();
    const cooldownAmount = 5000; 
    if (cooldowns.has(message.author.id)) {
        const expirationTime = cooldowns.get(message.author.id) + cooldownAmount;
        if (now < expirationTime) {
            return message.reply(`Slow down! Wait **${((expirationTime - now) / 1000).toFixed(1)}s**.`);
        }
    }
    cooldowns.set(message.author.id, now);
    setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

    // 4. Execution
    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`Error in ${commandName}:`, error);
        message.reply("There was an error executing that command!");
    }
});

// WEBHOOK: Optimized for Latency
app.post('/votereward', (req, res) => {
    // Respond to Top.gg/Pipedream immediately
    res.status(200).send("OK");

    const { userId } = req.body;
    if (!userId) return;

    // Background process to prevent lag
    setImmediate(() => {
        const sql = `
            INSERT INTO amash (userid, bucks) 
            VALUES(?, 150) 
            ON CONFLICT(userid) 
            DO UPDATE SET bucks = amash.bucks + 150`;

        db.serialize(() => { // Using serialize for specific write order
            db.run(sql, [userId], function(err) {
                if (err) return console.error("DB Error:", err.message);
                
                console.log(`Vote Reward: +150 to ${userId}`);
                
                client.users.fetch(userId)
                    .then(user => user.send("Thanks for voting! You've received **150 bucks**. 🚀"))
                    .catch(() => {}); // Silently fail if DMs are closed
            });
        });
    });
});

app.listen(2186, () => console.log("Webhook listener live on port 2186"));
client.login(process.env.TOKEN);
