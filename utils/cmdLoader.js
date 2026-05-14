const fs = require('fs');
const path = require('path');

module.exports = {
    // --- PREFIX COMMAND LOADER ---
    loadCommands: (client) => {
        const foldersPath = path.join(__dirname, '../commands');
        if (!fs.existsSync(foldersPath)) return console.log(">>> [ERR] Prefix folder not found.");

        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(foldersPath, folder);
            const isDir = fs.lstatSync(folderPath).isDirectory();
            
            const commandFiles = isDir 
                ? fs.readdirSync(folderPath).filter(file => file.endsWith('.js'))
                : [folder].filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = isDir ? path.join(folderPath, file) : path.join(foldersPath, file);
                const command = require(filePath);
                
                if (command.name && command.execute) {
                    client.commands.set(command.name, {
                        ...command,
                        category: command.category || (isDir ? folder : "General")
                    });

                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.aliases.set(alias, command.name);
                        }
                    }
                }
            }
        }
        console.log(`>>> [SYSTEM] Loaded ${client.commands.size} Prefix Commands.`);
    },

    // --- SLASH COMMAND LOADER ---
    loadSlashCommands: (client) => {
        const slashPath = path.join(__dirname, '../slashCommands');
        if (!fs.existsSync(slashPath)) return console.log(">>> [ERR] Slash folder not found.");

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
                
                if (command.data && command.execute) {
                    client.slashCommands.set(command.data.name, {
                        ...command,
                        category: command.category || (isDir ? folder : "General")
                    });
                }
            }
        }
        console.log(`>>> [SYSTEM] Loaded ${client.slashCommands.size} Slash Commands.`);
    }
};
