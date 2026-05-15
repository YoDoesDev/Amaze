const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("amashleaderboard")
        .setDescription("Shows the amash leaderboard with server/global toggle"),
    category: 'Economy',
    cooldown: 30,

    async execute(interaction) {
        // No deferReply here since index.js handles it!
        try {
            const generateLB = async (isGlobal) => {
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    const fetchedMembers = await interaction.guild.members.fetch({ user: topIds }).catch(() => new Map());
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

            const initialDesc = await generateLB(false);
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`💰 ${interaction.guild.name} Wealth Rankings`)
                .setDescription(initialDesc)
                .setFooter({ text: `Requested By: ${interaction.user.tag}` })
                .setTimestamp();

            // Use editReply because the interaction is already deferred by index.js
            const response = await interaction.editReply({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    const showGlobal = i.customId === 'amash_global';
                    const newDesc = await generateLB(showGlobal);

                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setColor(showGlobal ? '#FEE75C' : '#5865F2')
                        .setTitle(showGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${interaction.guild.name} Wealth Rankings`)
                        .setDescription(newDesc);

                    await i.update({ 
                        embeds: [updatedEmbed], 
                        components: [getButtons(showGlobal)] 
                    });
                } catch (err) {
                    console.error("LB Button Error:", err);
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            // Always use editReply here since it's already deferred
            await interaction.editReply({ content: "The vault is currently locked.", embeds: [], components: [] });
        }
    }
};
