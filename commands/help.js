const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'Displays all commands categorized or details of a specific command.',
    
    execute(message, args) {
        const { commands } = message.client;

        if (!args.length) {
            const categories = {};

            commands.forEach(cmd => {
                const cat = cmd.category || 'General'; 

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`${cmd.name}\``);
            });

            const embed = new EmbedBuilder()
                .setTitle('Amaze Command Categories')
                .setColor(0x00AE86)
                .setTimestamp()
                .setFooter({ text: 'Use !help <command> for syntax & aliases' });

            
            for (const [category, cmds] of Object.entries(categories)) {
                embed.addFields({ 
                    name: `**${category}**`, 
                    value: cmds.join(', '), 
                    inline: false 
                });
            }

            return message.reply({ embeds: [embed] });
        }

        
        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

        if (!command) {
            return message.reply("I couldn't find that command. Check your spelling!");
        }

        const detailEmbed = new EmbedBuilder()
            .setTitle(`Command: !${command.name}`)
            .setColor(0xFFFF00) // Different color for focus
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
