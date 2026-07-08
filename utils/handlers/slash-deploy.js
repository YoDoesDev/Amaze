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
            // Check if toJSON exists (ensures it's a valid SlashCommandBuilder instance)
            if (typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
            } else {
                console.error(`\x1b[31m[ERROR] The command file at "${file}" has a .data property, but it is a plain object instead of a SlashCommandBuilder instance.\x1b[0m`);
            }
        } else {
            console.warn(`\x1b[33m[WARNING] Missing .data export property in file: "${file}"\x1b[0m`);
        }
    }
}

// 2. Prepare the REST manager with your .env token
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// 3. Deploy Routine
const slashReg = async () => {
    try {
        if (commands.length === 0) {
            console.log(">>> [SYSTEM] No valid slash commands found to deploy. Execution stopped.");
            return;
        }

        console.log(`>>> [SYSTEM] Refreshing ${commands.length} slash commands...`);

        // OPTION A: Global deployment (Registers everywhere, takes up to 1 hour to sync caches)
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        /* // OPTION B: Guild/Dev-only deployment (Instant server syncing, uncomment to switch)
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