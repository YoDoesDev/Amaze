const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays all slash commands categorized or details of a specific command.')
        .addStringOption(option =>
            option
                .setName('command')
                .setDescription('The command you want specific details about')
                .setRequired(false)
        ),
        
    async execute(interaction) {
        if (!interaction.deferred) await interaction.deferReply();

        const { slashCommands } = interaction.client;
        const commandOption = interaction.options.getString('command')?.toLowerCase();

        // --- 1. DISPLAY ALL CATEGORIES (/help) ---
        if (!commandOption) {
            const categories = {};

            slashCommands.forEach(cmd => {
                const cat = cmd.category || 'General';

                // Skip the main router command since we are listing sub-commands instead
                if (cmd.data?.name === 'slay') return;

                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(`\`/${cmd.data?.name || cmd.name}\``);
            });

            // DYNAMIC INJECTION FOR THE 'Slay (WIP ⚠️)' CATEGORY
            try {
                const subsPath = path.join(process.cwd(), 'slashCommands', 'slay', 'subs');
                const targetCategory = 'Slay (WIP ⚠️)';

                if (fs.existsSync(subsPath)) {
                    const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                    
                    if (!categories[targetCategory]) categories[targetCategory] = [];

                    subFiles.forEach(file => {
                        const subName = file.replace('.js', '');
                        categories[targetCategory].push(`\`/slay ${subName}\``);
                    });
                }
            } catch (err) {
                console.error("Error adding slash subcommands to help menu:", err);
            }

            const embed = new EmbedBuilder()
                .setTitle('Amaze Slash Command Categories')
                .setColor(0x00AE86)
                .setTimestamp()
                .setFooter({ text: 'Use /help [command] for specific layout details' });

            for (const [category, cmds] of Object.entries(categories)) {
                embed.addFields({
                    name: `**${category}**`,
                    value: cmds.length > 0 ? cmds.join(', ') : 'No commands found.',
                    inline: false
                });
            }

            return await interaction.editReply({ embeds: [embed] });
        }

        // --- 2. DISPLAY SPECIFIC COMMAND DETAILS (/help command: hunt) ---
        let command = slashCommands.get(commandOption);

        if (!command || commandOption === 'slay') {
            try {
                const subFilePath = path.join(process.cwd(), 'slashCommands', 'slay', 'subs', `${commandOption}.js`);

                if (fs.existsSync(subFilePath)) {
                    const subCommand = require(subFilePath);

                    const detailEmbed = new EmbedBuilder()
                        .setTitle(`Command: /slay ${commandOption}`)
                        .setColor(0xFFFF00)
                        .addFields(
                            { name: 'Description', value: subCommand.description || 'No description provided.' },
                            { name: 'Category', value: '`Slay (WIP ⚠️)`', inline: true }
                        );

                    return await interaction.editReply({ embeds: [detailEmbed] });
                }
            } catch (err) {
                console.error("Error searching slash subcommands:", err);
            }
        }

        if (!command) {
            return await interaction.editReply({ content: "I couldn't find that command. Check your spelling!" });
        }

        const detailEmbed = new EmbedBuilder()
            .setTitle(`Command: /${command.data?.name || command.name}`)
            .setColor(0xFFFF00)
            .addFields(
                { name: 'Description', value: command.data?.description || 'No description provided.' },
                { name: 'Category', value: `\`${command.category || 'General'}\``, inline: true }
            );

        return await interaction.editReply({ embeds: [detailEmbed] });
    }
};
