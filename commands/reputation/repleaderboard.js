const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 30,
    description: 'Shows a leaderboard with a toggle between Global and Server-only rankings.',

    async execute(message) {
        try {
            // Helper to build the Embed & Buttons
            const createLeaderboard = async (isGlobal) => {
                // Fetch all data from DB
                const allData = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    // Optimized: Use cache for filtering instead of a full .fetch()
                    const guildMemberIds = message.guild.members.cache.map(m => m.id);
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                // Targeted Fetch: Only get the 10 users we actually need
                if (data.length > 0) {
                    const targetIds = data.map(d => d.userid);
                    await message.guild.members.fetch({ user: targetIds }).catch(() => null);
                }

                const list = data.length 
                    ? data.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                    : "No data available for this view.";

                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${message.guild.name} Rankings`)
                    .setDescription(list)
                    .setFooter({ text: `Requested by ${message.author.tag}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            // Initial Send
            const initialView = await createLeaderboard(false);
            const response = await message.reply(initialView);

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "Only the command user can switch views.", ephemeral: true });
                }

                const showGlobal = i.customId === 'lb_global';
                const updatedView = await createLeaderboard(showGlobal);

                await i.update(updatedView);
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error("Leaderboard Error:", error);
            message.reply("An error occurred while fetching the leaderboard.");
        }
    }
};

