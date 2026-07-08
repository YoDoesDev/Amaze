const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const cmdData = new SlashCommandBuilder()
    .setName('slay')
    .setDescription('Main entry point for the RPG game');

// Create an array to track options manually to bypass internal builder issues
const rawSubcommands = [];

const subsPath = path.join(__dirname, "subs");

if (fs.existsSync(subsPath)) {
    const subcommandFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));

    for (const file of subcommandFiles) {
        const subcommandPath = path.join(subsPath, file);
        const subcommand = require(subcommandPath);
        
        if (subcommand.data) {
            // Get the clean, complete JSON representation of the subcommand
            const rawData = subcommand.data.toJSON();
            rawSubcommands.push(rawData);
        }
    }
}

// FORCE OVERRIDE: Modify the output of toJSON to cleanly map the raw structures
cmdData.toJSON = function() {
    return {
        name: this.name,
        description: this.description,
        options: rawSubcommands // Directly inject the subcommands without letting the builder break
    };
};

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