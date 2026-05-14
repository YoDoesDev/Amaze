const cooldowns = new Map();

module.exports = {
    handleCooldown: (message, command) => {
        const cooldownKey = command.cooldownGroup || command.name;
        const cooldownAmount = (command.cooldown || 5) * 1000;

        if (!cooldowns.has(cooldownKey)) {
            cooldowns.set(cooldownKey, new Map());
        }

        const timestamp = cooldowns.get(cooldownKey);
        const now = Date.now();

        if (timestamp.has(message.author.id)) {
            const expirationTime = timestamp.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(0);
                message.reply(`Slow down! Wait **${timeLeft}s** before using a \`${cooldownKey}\` command again.`);
                return true; // Stop execution
            }
        }

        timestamp.set(message.author.id, now);
        setTimeout(() => timestamp.delete(message.author.id), cooldownAmount);
        return false; // Continue execution
    }, 

    handleSlashCd: async (interaction, commandData) => {
        const { name, cooldown } = commandData;
        const userId = interaction.user.id;

        if (!cooldowns.has(name)) {
            cooldowns.set(name, new Map());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(name);
        const cooldownAmount = cooldown * 1000;

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                // THIS LINE IS THE KEY
                await interaction.reply({ 
                    content: `Please wait ${timeLeft.toFixed(1)} more seconds before using /${name} again.`, 
                    ephemeral: true 
                });
                return true; // This tells index.js to STOP
            }
        }

        // If not on cooldown, set the new timestamp and return false
        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownAmount);
        return false; // This tells index.js to PROCEED
    }
};
