const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("defame")
        .setDescription("Defame a user to reduce their reputation points (8-hour cooldown)")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user you want to defame")
                .setRequired(true)
        ),
    category: 'Reputation', 
    cooldown: 10,

    async execute(interaction) { 
        const targetUser = interaction.options.getUser("target");
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000; // 8 Hours in ms

        // 1. Initial Checks
        if (targetUser.id === authorId) {
            return interaction.editReply("Self-defaming? Chin up, soldier, don't be too hard on yourself.");
        }
        if (targetUser.bot) {
            return interaction.editReply("Bots don't have reputations.");
        }

        try {
            // 2. Fetch all logic variables in one go
            const row = db.prepare(`
                SELECT 
                    (SELECT pr_tp FROM inventory WHERE userid = ?) as target_shield,
                    (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                    (SELECT ddbl_tp FROM inventory WHERE userid = ?) as author_doubler
            `).get(targetUser.id, authorId, targetUser.id, authorId);

            // 3. Shield Check
            if (row?.target_shield && now < row.target_shield) {
                return interaction.editReply(`🛡️ **PR Shield Active!** ${targetUser.username} is protected.`);
            }

            // 4. Cooldown Check
            if (row?.last_vouch && (now - row.last_vouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - row.last_vouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`Slow down! Cooldown active for another **${hrs}h ${mins}m**.`);
            }

            const multiplier = (row?.author_doubler && now < row.author_doubler) ? 2 : 1;

            // 5. Atomic Execution
            // Lock the cooldown first
            db.prepare(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(authorId, targetUser.id, now);

            // Update Reputation
            db.prepare(`INSERT OR IGNORE INTO reputation (userid, points) VALUES (?, 0)`).run(targetUser.id);
            db.prepare(`UPDATE reputation SET points = points - ? WHERE userid = ?`).run(multiplier, targetUser.id);

            // Impact investors (The "Stock Market" crash logic)
            db.prepare(`UPDATE investments SET profit = profit - (stocks * ?) WHERE invested = ?`).run(5 * multiplier, targetUser.id);
              
            // Fetch final points for response
            const finalRep = db.prepare(`SELECT points FROM reputation WHERE userid = ?`).get(targetUser.id);

            // 6. Handle Server-Specific Currency Penalties
            if (interaction.guild.id === "1226181188054548500") {
                db.prepare(`UPDATE amash SET bucks = bucks - 100 WHERE userid = ?`).run(authorId);
                return interaction.editReply(`🥀 **Defamed!** ${targetUser.username} now has **${finalRep?.points ?? 0}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}\nCosted 100 Amash.`);
            }

            return interaction.editReply(`🥀 **Defamed!** ${targetUser.username} now has **${finalRep?.points ?? 0}** rep. ${multiplier > 1 ? '↘️ **(x2 Power)**' : ''}`);

        } catch (err) {
            console.error("Defame Error:", err);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred during the defamation process.");
        }
    }
};
