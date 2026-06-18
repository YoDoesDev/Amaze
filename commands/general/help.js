const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    aliases: ['h'],
    cooldown: 3,
    description: 'Displays all commands categorized or details of a specific command.',
    
    execute(message, args) {
        const { commands } = message.client;

        // --- 1. DISPLAY ALL CATEGORIES (!help) ---
        if (!args.length) {
            const categories = {};

            // Map out your standard 26 commands
            commands.forEach(cmd => {
                const cat = cmd.category || 'General'; 

                // Skip the main 'slay' router so it doesn't just show up as "!slay"
                if (cmd.name === 'slay') return;

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`${cmd.name}\``);
            });

            // DYNAMICALLY INJECT SUB-COMMANDS INTO THE 'slay' CATEGORY DISPLAY
            try {
                // Adjust this path if your folder name inside /commands is different
                const subsPath = path.join(__dirname, '../commands/slay/subs');
                
                if (fs.existsSync(subsPath)) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    
                    // Create the category if it doesn't exist
                    if (!categories['slay']) categories['slay'] = [];
                    
                    // Add each sub-command formatted as "slay <name>"
                    subFiles.forEach(file => {
                        const subName = file.replace('.js', '');
                        categories['slay'].push(`\`slay ${subName}\``);
                    });
                }
            } catch (err) {
                console.error("Error adding slay subcommands to help menu:", err);
            }

            const embed = new EmbedBuilder()
                .setTitle('Amaze Command Categories')
                .setColor(0x00AE86)
                .setTimestamp()
                .setFooter({ text: 'Use !help <command> for syntax & aliases' });

            for (const [category, cmds] of Object.entries(categories)) {
                embed.addFields({ 
                    name: `**${category}**`, 
                    value: cmds.length > 0 ? cmds.join(', ') : 'No commands found.', 
                    inline: false 
                });
            }

            return message.reply({ embeds: [embed] });
        }

        // --- 2. DISPLAY SPECIFIC COMMAND DETAILS (!help hunt or !help slay hunt) ---
        const searchName = args[0].toLowerCase();
        
        // 1. Check if they are looking up a regular command (e.g., !help ping)
        let command = commands.get(searchName) || commands.find(c => c.aliases && c.aliases.includes(searchName));

        // 2. If they searched for an RPG command, check the subs folder
        if (!command || searchName === 'slay') {
            // If they typed "!help slay charinfo", args[1] is our sub-command. Otherwise use args[0]
            const subTarget = searchName === 'slay' && args[1] ? args[1].toLowerCase() : searchName;
            
            try {
                const subFilePath = path.join(__dirname, '../commands/slay/subs', `${subTarget}.js`);
                
                if (fs.existsSync(subFilePath)) {
                    const subCommand = require(subFilePath);
                    
                    const detailEmbed = new EmbedBuilder()
                        .setTitle(`Command: !slay ${subTarget}`)
                        .setColor(0xFFFF00)
                        .addFields(
                            { name: 'Description', value: subCommand.description || 'No description provided.' },
                            { name: 'Category', value: '`slay`', inline: true }
                        );

                    if (subCommand.syntax) {
                        detailEmbed.addFields({ name: 'Syntax', value: `\`slay ${subCommand.syntax}\`` });
                    }

                    return message.reply({ embeds: [detailEmbed] });
                }
            } catch (err) {
                console.error("Error searching slay subcommands:", err);
            }
        }

        // Fallback: If it's not a regular command and not an RPG command
        if (!command) {
            return message.reply("I couldn't find that command. Check your spelling!");
        }

        const detailEmbed = new EmbedBuilder()
            .setTitle(`Command: !${command.name}`)
            .setColor(0xFFFF00)
            .addFields(
                { name: 'Description', value: command.description || 'No description provided.' },
                { name: 'Category', value: `\`${command.category || 'General'}\``, inline: true }
            );

        if (command.syntax) {
            detailEmbed.addFields({ name: 'Syntax', value: `\`${command.syntax}\`` });
        }

        return message.reply({ embeds: [detailEmbed] });
    },
};
