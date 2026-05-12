const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'repleaderboard',
    category: 'Reputation',
    aliases: ['replb', 'rl'],
    cooldown: 30, // Reduced slightly since buttons are more interactive
    description: 'Shows a leaderboard with a toggle between Global and Server-only rankings.',

    async execute(message) {
        try {
            // 1. Setup Initial Buttons
            const getButtons = (isGlobal) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!isGlobal), // Disabled if already on Server view
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(isGlobal) // Disabled if already on Global view
                );
            };

            // 2. Fetch Server Members for filtering
            const members = await message.guild.members.fetch();
            const memberIds = Array.from(members.keys());

            // 3. Data Processing Function
            const generateLB = (isGlobal) => {
                const allData = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC`).all();
                
                // Filter if server-only, otherwise just take top 10
                const data = isGlobal 
                    ? allData.slice(0, 10) 
                    : allData.filter(row => memberIds.includes(row.userid)).slice(0, 10);

                if (!data.length) return 'No data found for this view.';

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.points}** points`;
                }).join('\n');
            };

            // 4. Initial Embed (Defaulting to Server LB)
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🏆 ${message.guild.name} Leaderboard`)
                .setDescription(generateLB(false))
                .setFooter({ text: `Requested By: ${message.author.tag}` })
                .setTimestamp();

            const response = await message.channel.send({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            // 5. Collector Logic
            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                // Security: Only the person who ran the command can toggle
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "Run the command yourself to use the buttons!", ephemeral: true });
                }

                const showGlobal = i.customId === 'lb_global';

                const updatedEmbed = new EmbedBuilder()
                    .setColor(showGlobal ? 0xFEE75C : 0x5865F2) // Gold for Global, Blue for Server
                    .setTitle(showGlobal ? `🌐 Global Leaderboard` : `🏆 ${message.guild.name} Leaderboard`)
                    .setDescription(generateLB(showGlobal))
                    .setFooter({ text: `Requested By: ${message.author.tag}` })
                    .setTimestamp();

                await i.update({ 
                    embeds: [updatedEmbed], 
                    components: [getButtons(showGlobal)] 
                });
            });

            // Cleanup: Remove buttons when collector expires
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Leaderboard Execution crashed:", error);
            message.reply("Could not load the leaderboard at this time.");
        }
    }
};
