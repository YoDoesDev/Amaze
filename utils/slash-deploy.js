const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
// Import your config/token
const { clientId, guildId } = require('./config.js'); 

const commands = [];
const slashPath = path.join(__dirname, '../slashCommands');

// 1. Logic to grab all command data (matches your loader logic)
const slashFolders = fs.readdirSync(slashPath);
for (const folder of slashFolders) {
    const folderPath = path.join(slashPath, folder);
    const isDir = fs.lstatSync(folderPath).isDirectory();
    const commandFiles = isDir 
        ? fs.readdirSync(folderPath).filter(file => file.endsWith('.js'))
        : [folder].filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = isDir ? path.join(folderPath, file) : path.join(slashPath, file);
        const command = require(filePath);
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }
}

// 2. Prepare the REST manager
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// 3. Deploy!
const slashReg = () => {
    try {
        console.log(`>>> [SYSTEM] Refreshing ${commands.length} slash commands...`);

    
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('>>> [SUCCESS] Commands deployed successfully!');
    } catch (error) {
        console.error(error);
    }
};

module.exports = { slashReg };
