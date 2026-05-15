const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("amashleaderboard")
        .setDescription("Shows the amash leaderboard with server/global toggle"), // Fixed capital D
    category: 'Economy',
    cooldown: 30,

    async execute(interaction) { // Changed 'message' to 'interaction'
        try {
            // Need to defer because members.fetch and DB calls take time
            await interaction.deferReply();

            const generateLB = async (isGlobal) => {
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                
                let data; // Use this variable consistently
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    const fetchedMembers = await interaction.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());

                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                if (!data.length) return 'No wealthy users found in this view.';

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
                .setColor(0x5865F2)
                .setTitle(`💰 ${interaction.guild.name} Wealth Rankings`)
                .setDescription(initialDesc)
                .setFooter({ text: `Requested By: ${interaction.user.tag}` })
                .setTimestamp();

            const response = await interaction.editReply({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // Security: use i.user.id and interaction.user.id
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "Only the person who ran the command can flip pages.", ephemeral: true });
                }

                const showGlobal = i.customId === 'amash_global';
                const newDesc = await generateLB(showGlobal);

                const updatedEmbed = EmbedBuilder.from(embed)
                    .setColor(showGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(showGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${interaction.guild.name} Wealth Rankings`)
                    .setDescription(newDesc);

                await i.update({ 
                    embeds: [updatedEmbed], 
                    components: [getButtons(showGlobal)] 
                });
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            if (interaction.deferred) {
                await interaction.editReply("The vault is currently locked.");
            } else {
                await interaction.reply("The vault is currently locked.");
            }
        }
    }
};
