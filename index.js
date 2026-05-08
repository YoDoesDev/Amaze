// Automated Deploy Active: May 1, 2026.

const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { initDb, db } = require('./database.js');
const express = require('express');
const app = express();
app.use(express.json());
const fs = require('fs');
const { get } = require('http');
require('dotenv').config();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

client.once("clientReady", () => {
    console.log("Bot is ready. GLHF, devs.");
});

client.commands = new Collection();
initDb();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log("Amaze v1.0.1");
    console.log("Successfully registered " + file + "\n"); 
}
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);


const cooldowns = new Map();

client.on('messageCreate', async (message) => {

    console.log("MESSAGE RECEIVED:", message.content);
    const triggerHappy = ['thx', 'thanks', 'thank you', 'tysm'];
    const triggerAngry = ['fk u', 'fuck you', 'fuck u', 'i hate u']
    
    const containsTriggerHappy = triggerHappy.some(word => message.content.toLowerCase().includes(word));
    const containsTriggerAngry = triggerAngry.some(word => message.content.toLowerCase().includes(word));

    if (containsTriggerHappy) {
        if (Math.random() < 0.3) { 
            message.channel.send(`Glad you're happy! Remember, you can use \`!vouch @user\` to increase their reputation!`);
        }
    }
    if (containsTriggerAngry) {
        if (Math.random() < 0.6) { 
            message.channel.send(`Angry at someone? Use \`!defame @user\` to decrease their reputation!`);
        }
    }
    
    const prefix = '!';
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // FIXED: This now looks for the command name OR an alias
    const command = client.commands.get(commandName) || 
                client.commands.find(cmd => cmd.aliases && Array.isArray(cmd.aliases) && cmd.aliases.includes(commandName));
    
    if (!command) return;

    // I will be commenting everything because this is hard
    // Note to self: set cooldown in SECONDS.

    const cooldownKey = command.cooldownGroup || command.name;
    const cooldownAmount = (command.cooldown || 5) * 1000;

    // Make a new key-value pair which is ANOTHER MAP in cooldowns if it aint exist already
    if (!cooldowns.has(cooldownKey)) {
        cooldowns.set(cooldownKey, new Map());
    }
    
    // picking up a map from the cooldowns
    const timestamp = cooldowns.get(cooldownKey);
    const now = Date.now();

    // timestamp is in the format userID => time

    if (timestamp.has(message.author.id)) {
        const timeWhenCooldownEnds = timestamp.get(message.author.id) + cooldownAmount;

        if (now < timeWhenCooldownEnds) {
            const timeLeft = ((timeWhenCooldownEnds - now) / 1000).toFixed(0);

            return message.reply(
                `Slow down! Wait **${timeLeft}s** before using a \`${cooldownKey}\` command again.`
            );
        }
    }

    timestamp.set(message.author.id, now);

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`Error executing ${commandName}:`, error);
        message.reply("There was an error trying to execute that command!");
    }
});

app.post('/votereward', (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.status(400).send("No User ID provided");

    // 1. Respond IMMEDIATELY to Pipedream
    res.status(200).send("OK");
    console.log(`Voter detected! ID: ${userId}`);

    // 2. Run the DB and DM logic in the background
    const sql = `
        INSERT INTO amash (userid, bucks) 
        VALUES(?, 150) 
        ON CONFLICT(userid) 
        DO UPDATE SET bucks = amash.bucks + 150`;

    db.run(sql, [userId], function(err) { // Used 'function' for 'this.changes'
        if (err) return console.error("Database error:", err.message);
        
        console.log(`Successfully added 150 bucks to ${userId}. Rows: ${this.changes}`);
        
        // Background DM attempt
        client.users.fetch(userId)
            .then(user => user.send("Thanks for voting for Amaze! You've received **150 bucks**. 🚀"))
            .catch(() => console.log(`Could not DM user ${userId}.`));
    });
});


// Make sure the bot listens on the port you put in Pipedream
app.listen(2186, () => console.log("Webhook listener is live on port 2186"));


client.login(process.env.TOKEN);
