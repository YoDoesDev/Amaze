const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { clientId, guildId } = require('../config.js'); 

const commands = [];
const slashPath = path.join(__dirname, '../../slashCommands');

// --- PATH-BASED IGNORE CONFIGURATION ---
// Use lowercase relative paths from inside your slashCommands directory.
const ignoredPaths = [
    'slay/slay.js' 
];

const slashFolders = fs.readdirSync(slashPath);
for (const folder of slashFolders) {
    const folderPath = path.join(slashPath, folder);
    const isDir = fs.lstatSync(folderPath).isDirectory();
    
    const commandFiles = isDir 
        ? fs.readdirSync(folderPath).filter(file => file.endsWith('.js'))
        : [folder].filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        // Construct a clean relative path identifier: e.g. "slay/slay.js" or "utility.js"
        const relativeKey = isDir 
            ? `${folder}/${file}`.toLowerCase() 
            : file.toLowerCase();

        // Check if this specific file path is on the hit list
        if (ignoredPaths.includes(relativeKey)) {
            console.log(`>>> [SYSTEM] Explicitly ignoring targeted file: "${relativeKey}"`);
            continue;
        }

        const filePath = isDir ? path.join(folderPath, file) : path.join(slashPath, file);
        const command = require(filePath);
        
        if (command.data) {
            if (typeof command.data.toJSON === 'function') {
                try {
                    commands.push(command.data.toJSON());
                } catch (builderError) {
                    console.error(`\x1b[31m[CRITICAL OPTIONS ERROR] Found inside file: "${file}"\x1b[0m`);
                    console.error(`Reason: ${builderError.message}\n`);
                }
            } else {
                console.error(`\x1b[31m[ERROR] "${file}" has a plain object instead of a SlashCommandBuilder.\x1b[0m`);
            }
        }
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const slashReg = async () => {
    try {
        if (commands.length === 0) {
            console.log(">>> [SYSTEM] No valid slash commands left to deploy.");
            return;
        }
        console.log(`>>> [SYSTEM] Refreshing ${commands.length} slash commands...`);
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('>>> [SUCCESS] Commands deployed successfully!');
    } catch (error) {
        console.error(">>> [DEPLOY ERROR]:", error);
    }
};

slashReg();