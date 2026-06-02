const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
// Import your config/token
const { clientId, guildId } = require('../config.js'); 

const commands = [];
const slashPath = path.join(__dirname, '../../slashCommands');

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

    
        rest.put(
            Routes.applicationCommands(clientId, guildId),
            { body: commands }, 
        ).then(() => {
        console.log('>>> [SUCCESS] Commands deployed successfully!');
    })
    .catch((error) => {
        console.error(">>> [DEPLOY ERROR]:", error);
    });;

        console.log('>>> [SUCCESS] Commands deployed successfully!');
    } catch (error) {
        console.error(error);
    }
};

try {
    // 5. Defer the reply globally for your slash commands right before running them
    await interaction.deferReply();
    
    await taxes(interaction, interaction.user.id);
    // if (handleSlashCd(interaction, command)) return;
    
    // 6. Run the command's execute function
    await command.execute(interaction);
    
} catch (error) {
    console.error(`[ERROR] Execution failed for /${interaction.commandName}:`, error);
    
    // User-friendly error handling fallback
    const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
    } else {
        await interaction.reply(errorMessage);
    }
}

slashReg();
