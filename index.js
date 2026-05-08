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

    client.user.setActivity('!help | Circulating amash', { 
         
    });
    
    /* Other types we can use:
       ActivityType.Watching   -> "Watching !help | ..."
       ActivityType.Listening  -> "Listening to !help | ..."
       ActivityType.Competing  -> "Competing in !help | ..."
    */
  });

client.commands = new Collection();
initDb();

// Command Registration
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}
console.log(`Amaze v1.1.0: Registered ${commandFiles.length} commands.`);

const cooldowns = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    db.get(
        "SELECT prefix FROM guild_settings WHERE guildid = ?",
        [message.guild.id],
        async (err, row) => {

            if (err) {
                console.error(err);
                return;
            }

            const prefix = row?.prefix || "!";

            if (!message.content.startsWith(prefix)) {
                const content = message.content.toLowerCase();

                if (['thx', 'thanks', 'thank you', 'tysm'].some(w => content.includes(w))) {
                    if (Math.random() < 0.3) {
                        return message.channel.send(
                            `Glad you're happy! Remember, you can use \`${prefix}vouch @user\` to increase their reputation!`
                        );
                    }
                }

                if (['fk u', 'fuck you', 'fuck u', 'i hate u'].some(w => content.includes(w))) {
                    if (Math.random() < 0.6) {
                        return message.channel.send(
                            `Angry at someone? Use \`${prefix}defame @user\` to decrease their reputation!`
                        );
                    }
                }

                return;
            }

            const args = message.content
                .slice(prefix.length)
                .trim()
                .split(/ +/);

            const commandName = args.shift().toLowerCase();

            const command =
                client.commands.get(commandName) ||
                client.commands.find(cmd =>
                    cmd.aliases && cmd.aliases.includes(commandName)
                );

            if (!command) return;

            const cooldownKey = command.cooldownGroup || command.name;
            const cooldownAmount = (command.cooldown || 5) * 1000;

            if (!cooldowns.has(cooldownKey)) {
                cooldowns.set(cooldownKey, new Map());
            }

            const timestamp = cooldowns.get(cooldownKey);
            const now = Date.now();

            if (timestamp.has(message.author.id)) {
                const timeWhenCooldownEnds =
                    timestamp.get(message.author.id) + cooldownAmount;

                if (now < timeWhenCooldownEnds) {
                    const timeLeft =
                        ((timeWhenCooldownEnds - now) / 1000).toFixed(0);

                    return message.reply(
                        `Slow down! Wait **${timeLeft}s** before using a \`${cooldownKey}\` command again.`
                    );
                }
            }

            timestamp.set(message.author.id, now);

            try {
                await command.execute(message, args);

                if (Math.random() < 0.025) {
                    message.reply(
                        `<@${message.author.id}>, having fun on Amaze? Feel free to vote me and leave a review using the \`${prefix}vote\` command!`
                    );
                }

            } catch (error) {
                console.error(`Error in ${commandName}:`, error);
                message.reply("There was an error executing that command!");
            }
        }
    );
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
