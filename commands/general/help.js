const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'help',
    aliases: ['h'],
    cooldown: 3,
    category: "General", 
    description: 'Displays all commands categorized or details of a specific command.',
    
    execute(message, args) {
        const { commands } = message.client;

        // --- 1. DISPLAY ALL CATEGORIES (!help) ---
        if (!args.length) {
            const categories = {};

            // Map out your standard 26 commands using their .category
            commands.forEach(cmd => {
                const cat = cmd.category || 'General'; 

                // Skip the main 'slay' router command so it doesn't double up
                if (cmd.name === 'slay') return;

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`${cmd.name}\``);
            });

            // DYNAMICALLY INJECT SUB-COMMANDS INTO THE EXPLICIT CATEGORY
            try {
                const subsPath = path.join(process.cwd(), 'commands', 'slay', 'subs');
                const targetCategory = 'Slay (WIP ⚠️)';
                
                if (fs.existsSync(subsPath)) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    
                    if (!categories[targetCategory]) categories[targetCategory] = [];
                    
                    subFiles.forEach(file => {
                        const subName = file.replace('.js', '');
                        categories[targetCategory].push(`\`slay ${subName}\``);
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

        // --- 2. DISPLAY SPECIFIC COMMAND DETAILS ---
        const searchName = args[0].toLowerCase();
        let command = commands.get(searchName) || commands.find(c => c.aliases && c.aliases.includes(searchName));

        if (!command || searchName === 'slay') {
            const subTarget = searchName === 'slay' && args[1] ? args[1].toLowerCase() : searchName;
            
            try {
                const subFilePath = path.join(process.cwd(), 'commands', 'slay', 'subs', `${subTarget}.js`);
                
                if (fs.existsSync(subFilePath)) {
                    const subCommand = require(subFilePath);
                    
                    const detailEmbed = new EmbedBuilder()
                        .setTitle(`Command: !slay ${subTarget}`)
                        .setColor(0xFFFF00)
                        .addFields(
                            { name: 'Description', value: subCommand.description || 'No description provided.' },
                            { name: 'Category', value: '`Slay (WIP ⚠️)`', inline: true }
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
