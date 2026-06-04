const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');
const { clearCooldown } = require("../../utils/handlers/cooldowns.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("repleaderboard")
        .setDescription("View Global or Server-wide reputation rankings"),
    category: 'Reputation',
    cooldown: 30,

    async execute(interaction) {
        const authorId = interaction.user.id;

        try {
            // Function to generate the board content
            const createLeaderboard = async (isGlobal) => {
                // Fetch top 100 once to keep it efficient
                const allData = db.prepare(`SELECT userid, points FROM reputation ORDER BY points DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    // Fetching members in the current guild from the top 100 list
                    const fetchedMembers = await interaction.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                const list = data.length 
                    ? data.map((row, i) => `**${i + 1}.** <@${row.userid}> — \`${row.points}\` pts`).join('\n')
                    : "No data available for this view.";

                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Reputation` : `🏆 ${interaction.guild.name} Rankings`)
                    .setDescription(list)
                    .setFooter({ text: `Requested by ${interaction.user.tag}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );

                return { embeds: [embed], components: [buttons] };
            };

            // 1. Initial Send (Server view by default)
            const initialBoard = await createLeaderboard(false);
            const response = await interaction.editReply(initialBoard);

            // 2. Collector setup (using the message object returned from editReply)
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // Ensure only the person who ran the command can flip pages
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu! Run `/repleaderboard` to see your own.", ephemeral: true });
                }

                try {
                    const isGlobal = i.customId === 'lb_global';
                    const nextBoard = await createLeaderboard(isGlobal);

                    // Acknowledge the button press and update the embed simultaneously
                    await i.update(nextBoard);

                } catch (error) {
                    console.error("Leaderboard Button Error:", error);
                }
            });

            // 3. Clean up: Remove buttons when the collector expires (1 minute)
            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error("Leaderboard Main Error:", error);
            clearCooldown(authorId, module.exports);
            return interaction.editReply("An error occurred while loading the leaderboard.");
        }
    }
};
