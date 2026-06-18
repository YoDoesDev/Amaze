const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const data = new SlashCommandBuilder()
    .setName('slay')
    .setDescription('Main entry point for the RPG game')
    .addSubcommand(sub => 
        sub.setName('charinfo').setDescription('View your character information.')
    )
    .addSubcommand(sub => 
        sub.setName('start').setDescription('Start your journey in the game.')
    );

module.exports = {
    data: data,
    async execute(interaction) {
        // Safe check: if for some reason it wasn't deferred, defer it now
        if (!interaction.deferred) await interaction.deferReply();

        const subcommandName = interaction.options.getSubcommand();

        try {
            const subcommandPath = path.join(__dirname, 'subs', `${subcommandName}.js`);
            
            if (!fs.existsSync(subcommandPath)) {
                return await interaction.editReply({ 
                    content: `The sub-command \`${subcommandName}\` file could not be found.`
                });
            }

            const subcommand = require(subcommandPath);
            // Pass the interaction along to the sub-command file
            await subcommand.execute(interaction);
        } catch (err) {
            console.error("Slash RPG Error:", err);
            await interaction.followUp({ content: 'There was an error executing this action.', ephemeral: true });
        }
    }
};
