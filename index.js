// Automated Deploy Active: May 1, 2026.
// Amaze Bot - Optimized for Performance and Scalability

const { 
    Client,
    Collection,
    GatewayIntentBits,
    ActivityType,
    Options
} = require('discord.js');

const { initDb, db } = require('./database.js');
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { getPrefix } = require('./prefixManager.js');

app.use(express.json());

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ],

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

// Keeping your 'clientReady' as per latest updates
client.once("clientReady", () => {
    console.log(`Currently in ${client.guilds.cache.size} servers:`);
client.guilds.cache.forEach(guild => console.log(` - ${guild.name} (${guild.memberCount} members)`));
    
    console.log("Bot is ready. GLHF, devs.");

    client.user.setActivity(`!help | Circulating Amash in ${client.guilds.cache.size} servers.`, { 
         type: ActivityType.Watching
    });
});

client.commands = new Collection();
client.aliases = new Map();
initDb();

// --- COMMAND REGISTRATION (SUBFOLDER SUPPORT) ---
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const folderPath = path.join(foldersPath, folder);
    
    if (fs.lstatSync(folderPath).isDirectory()) {

        const commandFiles = fs
            .readdirSync(folderPath)
            .filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            
            // Check if the file is a valid command
            if (command.name && command.execute) {
                // Takes category directly from module.exports in the file
                // If you forget to define one, it defaults to the folder name
                client.commands.set(command.name, {
                    ...command,
                    category: command.category || "General"
                });

                // Register Aliases in a Map, because it's apparently O(1) lookup.
                if (command.aliases) {
                    for (const alias of command.aliases) {
                        client.aliases.set(alias, command.name);
                    }
                }
            }
        }
    } else if (folder.endsWith('.js')) {

        const filePath = path.join(foldersPath, folder);
        const command = require(filePath);
        if (command.name && command.execute) {
            client.commands.set(command.name, {
                ...command,
                category: command.category || 'General'
            });

            if (command.aliases) {
                for (const alias of command.aliases) {
                    client.aliases.set(alias, command.name);
                }
            }

        }
    }
}


console.log(`Amaze v1.1.0: Registered ${client.commands.size} commands across categories.`);

const cooldowns = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    


    try {

        const prefix = getPrefix(message.guild.id);

        if (!message.content.startsWith(prefix)) {
            const content = message.content.toLowerCase();

            if (['thx', 'thanks', 'thank you', 'tysm'].some(w => content.includes(w))) {
                if (Math.random() < 0.3) {
                    return message.channel.send(`Glad you're happy! Remember, you can use \`${prefix}vouch @user\` to increase their reputation!`);
                }
            }

            if (['fk u', 'fuck you', 'fuck u', 'i hate u'].some(w => content.includes(w))) {
                if (Math.random() < 0.6) {
                    return message.channel.send(`Angry at someone? Use \`${prefix}defame @user\` to decrease their reputation!`);
                }
            }
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const trueCommandName =
        client.aliases.get(commandName) || commandName;

        const command = client.commands.get(trueCommandName);

        if (!command) return;

        const cooldownKey = command.cooldownGroup || command.name;
        const cooldownAmount = (command.cooldown || 5) * 1000;

        if (!cooldowns.has(cooldownKey)) {
            cooldowns.set(cooldownKey, new Map());
        }

        const timestamp = cooldowns.get(cooldownKey);
        const now = Date.now();

        if (timestamp.has(message.author.id)) {
            const timeWhenCooldownEnds = timestamp.get(message.author.id) + cooldownAmount;

            if (now < timeWhenCooldownEnds) {
                const timeLeft = ((timeWhenCooldownEnds - now) / 1000).toFixed(0);
                return message.reply(`Slow down! Wait **${timeLeft}s** before using a \`${cooldownKey}\` command again.`);
            }
        }

        timestamp.set(message.author.id, now);

        setTimeout(() => { 
            timestamp.delete(message.author.id); 
        }, cooldownAmount);

        await command.execute(message, args);

        if (Math.random() < 0.025) {
            message.reply(`Having fun on Amaze? Feel free to vote and leave a review using the \`${prefix}vote\` command!`);
        }

    } catch (error) {
        console.error(`>>> [ERROR] Command Execution Fail: ${error.message}`);
        message.reply("There was an error executing that command!");
    }   
    
    console.log(`------------------------------
👤 User: ${message.author.tag}
⚙️ Cmd: ${commandName}
🏠 Guild: ${message.guild.name}
------------------------------`);
    
});

app.post('/votereward', (req, res) => {
    res.status(200).send("OK");
    const { userId } = req.body;
    if (!userId) return;

    try {
        db.prepare(`
            INSERT INTO amash (userid, bucks) 
            VALUES(?, 150) 
            ON CONFLICT(userid) 
            DO UPDATE SET bucks = bucks + 150
        `).run(userId);

        console.log(`>>> [VOTE] Reward +150 to ${userId}`);
        
        client.users.fetch(userId)
            .then(user => user.send("Thanks for voting! You've received **150 bucks**. 🚀"))
            .catch(() => {}); 
            
    } catch (err) {
        console.error(">>> [ERROR] Vote Reward DB Fail:", err.message);
    }
});

app.listen(2186, () => console.log(">>> [WEBHOOK] Listener live on port 2186"));
client.login(process.env.TOKEN);
