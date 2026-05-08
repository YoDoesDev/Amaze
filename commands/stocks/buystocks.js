const { EmbedBuilder } = require('discord.js');
const { db } = require('../../database.js');

module.exports = {
    name: 'buystocks',
    aliases: ['bs'],
    cooldownGroup: "stocks",
    cooldown: 180,
    category: 'Stocks',
    description: 'Buy the stocks of a person to get profit from their reputation.',

    async execute(message, args) { 
        const targetUser = message.mentions.users.first();
        const amt = isNaN(args[1]) ? 1 : parseInt(args[1]);
        const costPerStock = 70;
        const totalCost = amt * costPerStock;
        const authorId = message.author.id;
        const now = message.createdTimestamp;

        // Initial Checks
        if (!targetUser) {
            const errMsg2 = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Who do you wanna invest in?\n\nSyntax: `!buystocks @user <number>`");
            return message.reply({ embeds: [errMsg2] });
        }
        if (amt < 1) {
            const errMsg = new EmbedBuilder().setColor('#E61010').setTitle(`⚠️ Command Error!`).setDescription("Please write a positive number!");
            return message.reply({ embeds: [errMsg] });
        }
        if (targetUser.id === authorId) return message.reply("You cannot invest in yourself!");

        try {
            // 1. Fetch Data (Direct Assignment)
            const row = db.prepare(`
                SELECT 
                    (SELECT bucks FROM amash WHERE userid = ?) as bucks,
                    (SELECT SUM(stocks) FROM investments WHERE investor = ?) as total_stocks,
                    (SELECT stocklic FROM inventory WHERE userid = ?) as has_license
            `).get(authorId, authorId, authorId);

            const currentBucks = row?.bucks ?? 0;
            const currentTotalStocks = row?.total_stocks ?? 0;
            const hasLicense = row?.has_license ?? 0;

            // 2. Stock Limit Logic (Logical simplicity)
            if (!hasLicense && (currentTotalStocks + amt) > 20) {
                return message.reply(`⚠️ **Stock Limit Reached!** Without a **Stock License**, you can only hold a total of **20 stocks**. You currently have **${currentTotalStocks}**. Buy a license in the shop to invest more!`);
            }

            // 3. Balance Check
            if (currentBucks < totalCost) {
                return message.reply(`You don't have enough Amash! You need **${totalCost}** but you only have **${currentBucks}**.`);
            }

            // 4. Execution (Sequential updates - No serialize needed)
            db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(totalCost, authorId);

            db.prepare(`
                INSERT INTO investments (investor, invested, stocks, lastpurchase) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT (investor, invested) 
                DO UPDATE SET stocks = stocks + excluded.stocks, lastpurchase = excluded.lastpurchase
            `).run(authorId, targetUser.id, amt, now);

            // 5. Success Embed
            const successMsg = new EmbedBuilder()
                .setColor('#10E647')
                .setTitle('Purchase Successful!')
                .setDescription(`Spent: **${totalCost} Amash**\nBought: **${amt}** stocks of **${targetUser.username}**.\nTotal Portfolio: **${currentTotalStocks + amt}** stocks.\n\n**Market Stability Fees (Exit Tax):**\n🕒 < 30 mins: **4% fee**\n🕒 < 2 hrs: **2% fee**\n🕒 > 2 hrs: **1% fee**\n\n**NOTE**: The time will reset everytime you buy a new stock of this person.`);

            message.reply({ embeds: [successMsg] });

        } catch (err) {
            console.error("BuyStocks Error:", err);
            message.reply("A database error occurred during the transaction.");
        }
    }
}
