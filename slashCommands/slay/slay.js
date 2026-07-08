const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const cmdData = new SlashCommandBuilder()
    .setName('slay')
    .setDescription('Main entry point for the RPG game');

const subsPath = path.join(__dirname, "subs");

if (fs.existsSync(subsPath)) {
    const subcommandFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));

    for (const file of subcommandFiles) {
        const subcommandPath = path.join(subsPath, file);
        const subcommand = require(subcommandPath);
        
        // If your subfile exports its builder under 'data'
        if (subcommand.data) {
            // Convert your SlashCommandBuilder to a raw JSON object
            const rawData = subcommand.data.toJSON();
            
            cmdData.addSubcommand(sub => {
                sub
                    .setName(rawData.name)
                    .setDescription(rawData.description);
                
                // If your subfile has options, spread them cleanly into the internal API layout
                if (rawData.options) {
                    sub.options = [...rawData.options];
                }
                
                return sub;
            });
        }
    }
}

module.exports = {
    category: "Slay (WIP ⚠️)",
    data: cmdData,
    async execute(interaction) {
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
            await subcommand.execute(interaction);
        } catch (err) {
            console.error("Slash RPG Error:", err);
            await interaction.followUp({ content: 'There was an error executing this action.', ephemeral: true });
        }
    }
};