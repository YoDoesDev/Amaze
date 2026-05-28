const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vouch")
        .setDescription("Vouch for a user to increase their reputation (8-hour cooldown)")
        .addUserOption(option => 
            option.setName("target")
                .setDescription("The user you want to vouch for")
                .setRequired(true)
        ),
    category: 'Reputation', 
    cooldown: 10,

    async execute(interaction) {
        const targetUser = interaction.options.getUser("target");
        const authorId = interaction.user.id;
        const now = Date.now();
        const cooldownTime = 8 * 60 * 60 * 1000;

        // 1. Validations
        if (targetUser.id === authorId) {
            return interaction.editReply("Self-vouching? Focus on the work, not the praise.");
        }
        if (targetUser.bot) {
            return interaction.editReply("Bots don't have reputations.");
        }

        try {
            // 2. Fetch History and Doubler Status
            const row = db.prepare(`
                SELECT 
                    (SELECT timestamp FROM vouch_history WHERE voucher_id = ? AND receiver_id = ?) as last_vouch,
                    (SELECT dblv_tp FROM inventory WHERE userid = ?) as vouch_doubler
            `).get(authorId, targetUser.id, authorId);

            // 3. Cooldown Logic
            if (row?.last_vouch && (now - row.last_vouch) < cooldownTime) {
                const timeLeftMs = cooldownTime - (now - row.last_vouch);
                const hrs = Math.floor(timeLeftMs / 3600000);
                const mins = Math.floor((timeLeftMs % 3600000) / 60000);
                return interaction.editReply(`This user's reputation was recently influenced. Wait **${hrs}h ${mins}m** to fame them again.`);
            }

            // 4. Check for Doubler
            const isDoubled = row?.vouch_doubler && now < row.vouch_doubler;
            const multiplier = isDoubled ? 2 : 1;

            // 5. Database Updates (The Transfer)
            // Update history
            db.prepare(`INSERT OR REPLACE INTO vouch_history (voucher_id, receiver_id, timestamp) VALUES (?, ?, ?)`).run(authorId, targetUser.id, now);

            // Ensure reputation row exists and Update
            db.prepare(`INSERT OR IGNORE INTO reputation (userid, points) VALUES (?, 0)`).run(targetUser.id);
            db.prepare(`UPDATE reputation SET points = points + ? WHERE userid = ?`).run(multiplier, targetUser.id);

            // Update Investor Profits (Multiplied)
            const profitGain = 5 * multiplier;
            db.prepare(`UPDATE investments SET profit = profit + (stocks * ?) WHERE invested = ?`).run(profitGain, targetUser.id);

            // 6. Fetch Final Result and Respond
            const repRow = db.prepare(`SELECT points FROM reputation WHERE userid = ?`).get(targetUser.id);

            let responseMsg = `✨ **Vouch Recorded!** ${targetUser.username} now has **${repRow?.points ?? 0}** reputation points.`;
            if (isDoubled) responseMsg = `⏭️ **VOUCH DOUBLER ACTIVE!** ${responseMsg}`;

            return interaction.editReply(responseMsg);

        } catch (err) {
            console.error("Vouch Command Error:", err);
            // If the command fails, we clear the internal command cooldown
            clearCooldown(authorId, module.exports);
            return interaction.editReply("A database error occurred while recording the vouch.");
        }
    }
};
