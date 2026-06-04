const { EmbedBuilder } = require('discord.js');
// FIXED: Using raw 'db' for an ultra-fast, targeted native SQL index sweep
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: 'amashleaderboard',
    aliases: ['amashlb', 'baltop', 'leaderboard'],
    cooldown: 30,
    description: 'View the richest users globally or server-wide based on Amash.',
    category: 'Economy',

    async execute(message, args) {
        const authorId = message.author.id;
        const inputType = args[0]?.toLowerCase();

        try {
            // Determine if the user is asking for global or local server rankings
            // Default to 'server' to keep communities engaged locally
            const isGlobal = inputType === 'global' || inputType === 'g';

            let leaderboardList = "";
            let embedTitle = "";
            let embedColor = "";

            if (isGlobal) {
                // =======================================================
                // 1. HIGH-PERFORMANCE GLOBAL SWEEP (LIMIT 10)
                // =======================================================
                // Pulls exactly 10 rows from disk using indexes. No fetch-all array sorting!
                const topGlobal = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 10`).all();
                
                embedTitle = "🌐 Global Amash Leaderboard";
                embedColor = "#FEE75C"; // Rich Gold

                leaderboardList = topGlobal.length 
                    ? topGlobal.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.bucks.toLocaleString()}\` Amash`).join('\n')
                    : "No data available for the global economy.";
            } else {
                // =======================================================
                // 2. HIGH-PERFORMANCE SERVER-WIDE FILTER (LIMIT 100 POOL)
                // =======================================================
                // Grab the top 100 richest users globally first to act as our potential pool
                const top100Global = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                const potentialIds = top100Global.map(r => r.userid);

                // Check which of those top 100 global players are actually in this specific Discord server
                const fetchedMembers = await message.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());

                let serverRows = [];
                for (const row of top100Global) {
                    if (serverRows.length >= 10) break; // Hard stop as soon as we secure our top 10 local users
                    if (fetchedMembers.has(row.userid)) {
                        serverRows.push(row);
                    }
                }

                embedTitle = `🏆 ${message.guild.name} Wealth Rankings`;
                embedColor = "#5865F2"; // Discord Blurple

                leaderboardList = serverRows.length
                    ? serverRows.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.bucks.toLocaleString()}\` Amash`).join('\n')
                    : "None of the global top 100 players are currently in this server.";
            }

            // 3. Assemble and Send the Visual Leaderboard
            const embed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setColor(embedColor)
                .setDescription(leaderboardList)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: `Requested by ${message.author.username} • Type !amashlb global for global stats` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Amash Leaderboard Prefix Error:", err);
            // Safely restore user's command execution state if a database deadlock occurs
            return message.reply("An error occurred while loading the wealth rankings.");
        }
    }
};
