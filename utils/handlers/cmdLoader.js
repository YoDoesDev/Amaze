const fs = require('fs');
const path = require('path');

module.exports = {
    // --- PREFIX COMMAND LOADER ---
    loadCommands: (client) => {
        const foldersPath = path.join(process.cwd(), 'commands');
        if (!fs.existsSync(foldersPath)) return console.log(">>> [ERR] Prefix folder not found.");

        const commandFolders = fs.readdirSync(foldersPath);
        let subCommandCount = 0;
        let routerCount = 0;

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

                    // If this is our main router, flag it to subtract later
                    if (command.name === 'slay') {
                        routerCount++;
                    }
                }
            }

            // Look inside the nested subs folder to count its files
            if (isDir) {
                const subsPath = path.join(folderPath, 'subs');
                if (fs.existsSync(subsPath) && fs.lstatSync(subsPath).isDirectory()) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    subCommandCount += subFiles.length;
                }
            }
        }

        // Math: Total registered commands minus the 1 router file plus the sub-commands
        const totalDisplayCount = client.commands.size - routerCount + subCommandCount;
        console.log(`>>> [SYSTEM] Loaded ${totalDisplayCount} Prefix Commands.`);
    },

    // --- SLASH COMMAND LOADER ---
    loadSlashCommands: (client) => {
        const slashPath = path.join(process.cwd(), 'slashCommands');
        if (!fs.existsSync(slashPath)) return console.log(">>> [ERR] Slash folder not found.");

        const slashFolders = fs.readdirSync(slashPath);
        let subCommandCount = 0;
        let routerCount = 0;

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

                    if (command.data.name === 'slay') {
                        routerCount++;
                    }
                }
            }

            if (isDir) {
                const subsPath = path.join(folderPath, 'subs');
                if (fs.existsSync(subsPath) && fs.lstatSync(subsPath).isDirectory()) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    subCommandCount += subFiles.length;
                }
            }
        }

        const totalDisplayCount = client.slashCommands.size - routerCount + subCommandCount;
        console.log(`>>> [SYSTEM] Loaded ${totalDisplayCount} Slash Commands.`);
    }
};
