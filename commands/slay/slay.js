const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "slay",
    description: "Main entry point for the RPG game",
    async execute(message, args) {
        const subcommandName = args[0]?.toLowerCase();

        // --- IF NO ARGUMENTS PROVIDED (!slay) ---
        if (!subcommandName) {
            try {
                const subsPath = path.join(__dirname, 'subs');
                const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
                
                // Format the subcommands nicely for the embed
                const subNames = subFiles.map(file => `\`${file.replace('.js', '')}\``);

                const embed = new EmbedBuilder()
                    .setTitle('⚔️ Slay RPG Actions')
                    .setDescription('Welcome to the RPG game! Here are the available actions you can take:')
                    .setColor(0x9B59B6) // Nice purple RPG color
                    .addFields({ 
                        name: 'Commands', 
                        value: subNames.length > 0 ? subNames.join(', ') : 'No RPG actions found yet.' 
                    })
                    .setFooter({ text: 'Usage: !slay [action] (e.g., !slay hunt)' });

                return message.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                return message.reply("Could not load RPG menu at the moment.");
            }
        }

        // --- IF ARGUMENTS ARE PROVIDED (!slay hunt) ---
        try {
            const subcommand = require(path.join(__dirname, 'subs', `${subcommandName}.js`));
            await subcommand.execute(message, args.slice(1));
        } catch (err) {
            console.error(err);
            message.reply("That RPG action doesn't exist. Type `!slay` to see available actions.");
        }
    }
};
