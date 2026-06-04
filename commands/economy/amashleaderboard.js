const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'amashleaderboard',
    category: 'Economy',
    aliases: ['amashlb', 'alb', 'baltop', 'al'],
    cooldown: 30,
    description: 'Wealth rankings with a Global/Server toggle.',

    async execute(message) {
        try {
            // =======================================================
            // 1. PRE-COMPUTE DATA BEFORE INITIAL RESPONSE (NO INTERACTION LAG)
            // =======================================================
            
            // --- Global Data Setup ---
            const globalRows = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 10`).all();
            const globalList = globalRows.length 
                ? globalRows.map((row, index) => `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n')
                : "No wealthy users found in this view.";

            // --- Server Data Setup ---
            const potentialTopRows = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
            const potentialIds = potentialTopRows.map(r => r.userid);
            
            // Single API call to check who is present in this guild
            const fetchedMembers = await message.guild.members.fetch({ user: potentialIds, cache: false }).catch(() => new Map());
            
            let serverRows = [];
            for (const row of potentialTopRows) {
                if (serverRows.length >= 10) break;
                if (fetchedMembers.has(row.userid)) {
                    serverRows.push(row);
                }
            }

            const serverList = serverRows.length 
                ? serverRows.map((row, index) => `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n')
                : "No wealthy users found in this view.";

            // =======================================================
            // 2. HELPER FUNCTION TO GENERATE COLD VIEW STRUCTURES
            // =======================================================
            const generateView = (isGlobal) => {
                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Wealth Rankings` : `💰 ${message.guild.name} Wealth Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested By: ${message.author.tag}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('amash_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('amash_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            // Initial launch display (Starts on Server view)
            const response = await message.reply(generateView(false));

            // =======================================================
            // 3. COLLECTOR LOOP (COMPLETELY LOCAL & INSTANTANEOUS)
            // =======================================================
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "This vault is restricted to the original requester!", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'amash_global';
                    
                    // We generate the layout and update directly in one clean swoop!
                    await i.update(generateView(isGlobal));

                } catch (error) {
                    console.error("Amash LB Button Error:", error);
                }
            });

            // Clean exit layout handler
            collector.on('end', () => {
                if (collector.message) {
                    response.edit({ components: [] }).catch(() => null);
                }
            });
            
        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            message.reply("The vault is currently locked. Could not load rankings.");
        }
    }
};


