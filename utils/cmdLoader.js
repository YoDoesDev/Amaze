const fs = require('fs');
const path = require('path');

module.exports = {
    loadCommands: (client) => {
        const foldersPath = path.join(__dirname, '../commands');
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

                    if (command.aliases) {
                        for (const alias of command.aliases) {
                            client.aliases.set(alias, command.name);
                        }
                    }
                }
            }
        }
        console.log(`>>> [SYSTEM] Registered ${client.commands.size} commands.`);
    }
};
