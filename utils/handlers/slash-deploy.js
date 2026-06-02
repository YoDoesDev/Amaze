
 const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Destructure configuration variables
const { clientId, guildId } = require('../config.js'); 

const commands = [];
const slashPath = path.join(__dirname, '../../slashCommands');

// 1. Gather all command payload data
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

// 2. Prepare the REST manager with your .env token
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// 3. Deploy Routine
const slashReg = async () => {
    try {
        console.log(`>>> [SYSTEM] Refreshing ${commands.length} slash commands...`);

        // CHOOSE ONE ROUTE BELOW:

        // OPTION A: Global deployment (Registers everywhere, takes up to 1 hour to sync)
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        /* // OPTION B: Guild/Dev-only deployment (Instant testing, uncomment to use)
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
        */

        console.log('>>> [SUCCESS] Commands deployed successfully into the Discord network!');
    } catch (error) {
        console.error(">>> [DEPLOY ERROR]:", error);
    }
};

slashReg();

