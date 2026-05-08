const { db } = require('../database.js');

module.exports = {
    name: 'editprefix',
    category: 'Config',
    aliases: ['prefix'],
    description: 'Change the server prefix.',
    cooldown: 5,

    async execute(message, args) {

        if (!message.member.permissions.has('Administrator')) {
            return message.reply('You need Administrator permission.');
        }

        const newPrefix = args[0];

        if (!newPrefix) {
            return message.reply('Provide a new prefix.');
        }

        if (newPrefix.length > 5) {
            return message.reply('Prefix must be 5 characters or less.');
        }

        db.run(
            `INSERT INTO guild_settings (guildid, prefix)
             VALUES (?, ?)
             ON CONFLICT(guildid)
             DO UPDATE SET prefix = excluded.prefix`,
            [message.guild.id, newPrefix],
            (err) => {

                if (err) {
                    console.error(err);
                    return message.reply('Database error.');
                }

                message.reply(`Server prefix changed to \`${newPrefix}\``);
            }
        );
    }
};