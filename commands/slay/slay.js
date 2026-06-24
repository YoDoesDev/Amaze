 const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
// Import your cooldown utility (Adjust path if your utils folder is structured differently)
const cooldownUtil = require('../../utils/handlers/cooldowns.js'); 

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

        // --- IF AN ARGUMENT IS PROVIDED (!slay train, !slay buystocks) ---
        try {
            const subsPath = path.join(__dirname, 'subs');
            const subFiles = fs.readdirSync(subsPath).filter(file => file.endsWith('.js'));
            
            let targetFile = null;
        
            // Loop through the subfiles to check for a name or alias match
            for (const file of subFiles) {
                const sub = require(path.join(subsPath, file));
                
                const nameMatch = sub.name && sub.name.toLowerCase() === subcommandName;
                const aliasMatch = sub.aliases && Array.isArray(sub.aliases) && sub.aliases.map(a => a.toLowerCase()).includes(subcommandName);
        
                if (nameMatch || aliasMatch) {
                    targetFile = file;
                    break;
                }
            }
        
            if (!targetFile) {
                return message.reply("That RPG action doesn't exist. Type `!slay` to see available actions.");
            }
        
            const subcommand = require(path.join(subsPath, targetFile));

            // --- THE FIX: RUN THE COOLDOWN CHECK ON THE SUBCOMMAND OBJECT ---
            const isTimedOut = cooldownUtil.handleCooldown(message, subcommand);
            if (isTimedOut) return; // Stop execution right here if they are on cooldown

            // If clear, execute the subcommand cleanly
            await subcommand.execute(message, args.slice(1));
        
        } catch (err) {
            console.error("Prefix Subcommand Router Error:", err);
            message.reply("There was an error trying to execute that action.");
        }
    }
};
