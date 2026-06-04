const { EmbedBuilder } = require('discord.js');
const { universalGet, universalSet, universalCreate, db } = require('../../utils/database.js'); // Brought back db for targeted count
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'buystocks',
    aliases: ['bs'],
    cooldownGroup: "stocks",
    cooldown: 20,
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
            // =======================================================
            // 1. FETCH PROFILE & BALANCE DATA VIA MATRIX WRAPPERS
            // =======================================================
            const amashRow = universalGet("amash", authorId);
            const invRow = universalGet("inventory", authorId);
            
            const investmentKey = `${authorId}_${targetUser.id}`;
            const targetInvestment = universalGet("investments", investmentKey);

            // =======================================================
            // 2. OPTIMIZED TARGETED QUERY (Avoids fetching whole table)
            // =======================================================
            // This only pulls a single number from the disk, keeping performance perfect.
            const sumRow = db.prepare(`SELECT SUM(stocks) as total FROM investments WHERE investor = ?`).get(authorId);
            const currentTotalStocks = sumRow?.total ?? 0;

            const currentBucks = amashRow?.bucks ?? 0;
            const hasLicense = invRow?.stocklic ?? 0;

            // 3. Stock Limit Logic
            if (!hasLicense && (currentTotalStocks + amt) > 20) {
                return message.reply(`⚠️ **Stock Limit Reached!** Without a **Stock License**, you can only hold a total of **20 stocks**. You currently have **${currentTotalStocks}**. Buy a license in the shop to invest more!`);
            }

            // 4. Balance Check
            if (currentBucks < totalCost) {
                return message.reply(`You don't have enough Amash! You need **${totalCost}** but you only have **${currentBucks}**.`);
            }

            // =======================================================
            // 5. EXECUTION MATRIX MUTATIONS
            // =======================================================
            universalSet("amash", authorId, {
                bucks: currentBucks - totalCost
            });

            if (!targetInvestment) {
                universalCreate("investments", investmentKey);
            }

            const runningStocks = targetInvestment?.stocks ?? 0;

            universalSet("investments", investmentKey, {
                investor: authorId,
                invested: targetUser.id,
                stocks: runningStocks + amt,
                lastpurchase: now
            });

            // 6. Success Embed
            const successMsg = new EmbedBuilder()
                .setColor('#10E647')
                .setTitle('Purchase Successful!')
                .setDescription(`Spent: **${totalCost} Amash**\nBought: **${amt}** stocks of **${targetUser.username}**.\nTotal Portfolio: **${currentTotalStocks + amt}** stocks.\n\n**Market Stability Fees (Exit Tax):**\n🕒 < 30 mins: **4% fee**\n🕒 < 2 hrs: **2% fee**\n🕒 > 2 hrs: **1% fee**\n\n**NOTE**: The time will reset everytime you buy a new stock of this person.`)
                .setTimestamp();

            return message.reply({ embeds: [successMsg] });

        } catch (err) {
            console.error("BuyStocks Error:", err);
            clearCooldown(message.author.id, module.exports);
            message.reply("A database error occurred during the transaction.");
        }
    }
};
