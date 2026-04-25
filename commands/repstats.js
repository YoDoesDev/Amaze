const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js'); 

module.exports = {
    name: 'repstats',
    aliases: ['rs'], 
    category: 'Reputation', 
    description: 'Check your/other\'s  reputation points\n\nSyntax: `!repstats [@user]`\n\n<> = REQUIRED\n [] = OPTIONAL\n Alias: !rs',
    async execute(message, args) {
        console.log(">>> [DEBUG] repstats command started");

        try {
            const targetUser = message.mentions.users.first() || message.author;
            console.log(`>>> [DEBUG] Targeting user: ${targetUser.tag} (${targetUser.id})`);

            db.get(`SELECT points FROM reputation WHERE user_id = ?`, [targetUser.id], (err, row) => {
                if (err) {
                    console.error(">>> [ERROR] SQL Error:", err.message);
                    return message.reply("Database error occurred.");
                }

                console.log(">>> [DEBUG] DB Row Result:", row);
                const points = row ? row.points : 0;

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`${targetUser.username}'s Standing`)
                    .setDescription(`✨ **Total Reputation:** ${points} points`);

                message.channel.send({ embeds: [embed] })
                    .then(() => console.log(">>> [DEBUG] Embed sent successfully"))
                    .catch(e => console.error(">>> [ERROR] Failed to send embed:", e));
            });
        } catch (error) {
            console.error(">>> [CRITICAL] Execution crashed:", error);
        }
    }
};
