const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { clientId, guildId } = require('../config.js'); 

const commands = [];
const slashPath = path.join(__dirname, '../../slashCommands');

// Clean slate: No ignores! We want to read everything, including slay.js
const slashFolders = fs.readdirSync(slashPath);
for (const folder of slashFolders) {
    const folderPath = path.join(slashPath, folder);
    const isDir = fs.lstatSync(folderPath).isDirectory();
    
    const commandFiles = isDir 
        ? fs.readdirSync(folderPath).filter(file => file.endsWith('.js'))
        : [folder].filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = isDir ? path.join(folderPath, file) : path.join(slashPath, file);
        
        try {
            const command = require(filePath);
            
            if (command.data) {
                if (typeof command.data.toJSON === 'function') {
                    // This executes the command builders and packs options down to JSON structures
                    commands.push(command.data.toJSON());
                } else {
                    console.error(`\x1b[31m[ERROR] "${file}" has a plain object instead of a SlashCommandBuilder.\x1b[0m`);
                }
            }
        } catch (error) {
            console.error(`\x1b[31m\n[CRITICAL ERROR] Failed to parse or build command data inside file: "${file}"\x1b[0m`);
            console.error(`\x1b[33mError Message:\x1b[0m ${error.message}`);
            console.error(`\x1b[30mStack Trace:\x1b[0m\n${error.stack}\n`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const slashReg = async () => {
    try {
        if (commands.length === 0) {
            console.log(">>> [SYSTEM] No valid slash commands compiled. Deployment aborted.");
            return;
        }
        console.log(`>>> [SYSTEM] Refreshing ${commands.length} slash commands...`);
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('>>> [SUCCESS] Commands deployed successfully!');
    } catch (error) {
        console.error(">>> [DEPLOY REST ERROR]:", error);
    }
};

slashReg();