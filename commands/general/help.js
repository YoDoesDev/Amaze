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

        // --- 1. DISPLAY ALL CATEGORIES ---
        if (!args.length) {
            const categories = {};

            commands.forEach(cmd => {
                const cat = cmd.category || 'General'; 

                // Skip the main router command so it doesn't duplicate
                if (cmd.name === 'slay') return;

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`${cmd.name}\``);
            });

            // DYNAMICALLY ADD SUB-COMMANDS TO THE 'slay' CATEGORY
            try {
                // Adjust this path if your folder name is exactly 'slay'
                const subsPath = path.join(__dirname, '../commands/slay/subs');
                
                if (fs.existsSync(subsPath)) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    
                    if (!categories['slay']) categories['slay'] = [];
                    
                    subFiles.forEach(file => {
                        const subName = file.replace('.js', '');
                        // Formats it nicely as "slay profile" or just "profile" depending on your preference
                        categories['slay'].push(`\`slay ${subName}\``);
                    });
                }
            } catch (err) {
                console.error("Error reading slay subcommands for main help menu:", err);
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

        // --- 2. DISPLAY SPECIFIC SUB-COMMAND DETAILS ---
        const searchName = args[0].toLowerCase();
        
        // Check if they are looking up a regular command first
        let command = commands.get(searchName) || commands.find(c => c.aliases && c.aliases.includes(searchName));

        // If they typed "!help profile" or "!help slay profile", check the subs directory
        if (!command || searchName === 'slay') {
            // Determine the target sub-command name
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

        // Fallback to standard command lookup if no sub-command matched
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

        return message.reply({ embeds: [detailEmbed]});
    },
};
