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

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!') || message.author.bot) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commandName === 'vouch') {
        const command = client.commands.get('vouch');
        if (command) {
            try { await command.execute(message, args); } catch (e) { console.error(e); }
        }
    }
});

client.login(process.env.TOKEN);