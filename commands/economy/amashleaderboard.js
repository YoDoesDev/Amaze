const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
// Direct 'db' import for optimized performance
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    name: "amashleaderboard",
    aliases: ["amashlb", "baltop", "al"],
    category: 'Economy',
    cooldown: 30,
    description: "Shows the amash leaderboard with server/global toggle",

    async execute(message, args) {
        const authorId = message.author.id;

        try {
            // Helper function to process the dataset and generate the ranking lists
            const generateLB = async (isGlobal) => {
                // HIGH PERFORMANCE: Let SQLite sort and truncate on disk. Only pulls 100 rows maximum!
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    // Safe Limit Safeguard: Grab the top 100 wealthiest globally to filter for guild matching
                    const topIds = allData.map(r => r.userid);
                    
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                if (!data || data.length === 0) return 'No wealthy users found in this view.';

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`;
                }).join('\n');
            };

            const getButtons = (isGlobal) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('amash_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('amash_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(isGlobal)
                );
            };

            // 1. Initial State (Server view default)
            const initialDesc = await generateLB(false);
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`💰 ${message.guild.name} Wealth Rankings`)
                .setDescription(initialDesc)
                .setFooter({ text: `Requested By: ${message.author.username}` })
                .setTimestamp();

            // Send via message.reply for the prefix interface framework
            const response = await message.reply({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            // 2. Collector setup (using the sent message response object)
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // Protect the execution session context
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    const showGlobal = i.customId === 'amash_global';
                    const newDesc = await generateLB(showGlobal);

                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setColor(showGlobal ? '#FEE75C' : '#5865F2')
                        .setTitle(showGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${message.guild.name} Wealth Rankings`)
                        .setDescription(newDesc);

                    await i.update({ 
                        embeds: [updatedEmbed], 
                        components: [getButtons(showGlobal)] 
                    });
                } catch (err) {
                    console.error("LB Button Error:", err);
                }
            });

            // 3. Cleanup expiration state
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            clearCooldown(authorId, module.exports);
            return message.reply({ content: "The vault is currently locked." });
        }
    }
};
