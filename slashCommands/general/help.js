const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays all commands or details of a specific command")
        .addStringOption(option => 
            option.setName("command")
                .setDescription("The specific command to get info on")
                .setRequired(false)
        ),
    category: 'General',
    cooldown: 3,

    async execute(interaction) {
        const { commands } = interaction.client;
        const commandName = interaction.options.getString("command");

        // CASE 1: General Help (No specific command requested)
        if (!commandName) {
            const categories = {};

            commands.forEach(cmd => {
                // Handle both Slash (cmd.data.name) and Prefix (cmd.name) compatibility
                const name = cmd.data ? cmd.data.name : cmd.name;
                const cat = cmd.category || 'General';

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`${name}\``);
            });

            const embed = new EmbedBuilder()
                .setTitle('Amaze Command Categories')
                .setColor(0x00AE86)
                .setTimestamp()
                .setFooter({ text: 'Use /help [command] for details' });

            for (const [category, cmds] of Object.entries(categories)) {
                embed.addFields({ 
                    name: `**${category}**`, 
                    value: cmds.join(', '), 
                    inline: false 
                });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        // CASE 2: Specific Command Help
        const name = commandName.toLowerCase();
        // Look for slash data name OR legacy name/aliases
        const command = commands.get(name) || 
                        commands.find(c => (c.data && c.data.name === name) || (c.aliases && c.aliases.includes(name)));

        if (!command) {
            return interaction.editReply("I couldn't find that command. Check your spelling!");
        }

        const actualName = command.data ? command.data.name : command.name;
        const actualDesc = command.data ? command.data.description : command.description;

        const detailEmbed = new EmbedBuilder()
            .setTitle(`Command: /${actualName}`)
            .setColor(0xFFFF00)
            .addFields(
                { name: 'Description', value: actualDesc || 'No description provided.' },
                { name: 'Category', value: `\`${command.category || 'General'}\``, inline: true }
            );

        // Include aliases if they exist (mostly for legacy support)
        if (command.aliases && command.aliases.length > 0) {
            detailEmbed.addFields({ name: 'Aliases', value: `\`${command.aliases.join(', ')}\``, inline: true });
        }

        return interaction.editReply({ embeds: [detailEmbed] });
    },
};
