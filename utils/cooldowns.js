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
    }
};
