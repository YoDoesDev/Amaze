const { db } = require('../database.js');

module.exports = {
    name: 'editprefix',
    category: 'Config',
    aliases: ['prefix'],
    description: 'Change the server prefix.',
    cooldown: 5,

    async execute(message, args) { 
        // 1. Permission Check
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('You need Administrator permission.');
        }

        const newPrefix = args[0];

        // 2. Validation
        if (!newPrefix) {
            return message.reply('Provide a new prefix.');
        }

        if (newPrefix.length > 5) {
            return message.reply('Prefix must be 5 characters or less.');
        }

        try {
            // 3. Update Logic (Synchronous & Immediate)
            db.prepare(`
                INSERT INTO guild_settings (guildid, prefix)
                VALUES (?, ?)
                ON CONFLICT(guildid)
                DO UPDATE SET prefix = excluded.prefix
            `).run(message.guild.id, newPrefix);

            message.reply(`Server prefix changed to \`${newPrefix}\``);

        } catch (err) {
            console.error("Prefix Edit Error:", err);
            message.reply('An error occurred while updating the database.');
        }
    }
};
