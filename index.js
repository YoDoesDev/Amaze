const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { initDb, db } = require('./database.js');
const fs = require('fs');
require('dotenv').config();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

client.commands = new Collection();
initDb();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log("Successfully registered " + file + "\n"); 
}
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [{ name: 'ping', description: 'Replies with Pong and updates count' }] },
        );
        console.log('Successfully registered /ping');
    } catch (error) { console.error(error); }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ping') {
        const command = client.commands.get('ping');
        try { await command.execute(interaction); } catch (e) { console.error(e); }
    }
});

const cooldowns = new Map();

client.on('messageCreate', async (message) => {
const prefix = '!';
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
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

client.login(process.env.TOKEN);