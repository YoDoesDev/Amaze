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
        GatewayIntentBits.MessageContent 
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

    
    const now = Date.now();
    const cooldownAmount = 5000; 
    if (cooldowns.has(message.author.id)) {
        const lastUsed = cooldowns.get(message.author.id);
        const expirationTime = lastUsed + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;

            return message.reply(`Slow down! Wait **${timeLeft.toFixed(1)}s** before using \`${commandName}\` again.`);
        }
    }

    cooldowns.set(message.author.id, now);

    setTimeout(() => cooldowns.delete(message.author.id), cooldownAmount);

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

    console.log(`Voter detected! ID: ${userId}`);

    // This handles both new users (Insert) and existing users (Update)
    const sql = `
        INSERT INTO amash (user_id, bucks) 
        VALUES(?, 150) 
        ON CONFLICT(user_id) 
        DO UPDATE SET bucks = amash.bucks + 150`;

    db.run(sql, [userId], async (err) => {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).send("DB Error");
        }
        console.log(`Successfully added 150 bucks to ${userId}`);
        
        // Safer way to send DMs
        try {
            const user = await client.users.fetch(userId);
            await user.send("Thanks for voting for Amaze! You've received **150 bucks**. 🚀");
        } catch (error) {
            console.log(`Could not DM user ${userId}: DMs are likely closed.`);
        }
        
        res.status(200).send("Reward Processed");
    });
});

// Make sure the bot listens on the port you put in Pipedream
app.listen(2186, () => console.log("Webhook listener is live on port 2186"));


client.login(process.env.TOKEN);
