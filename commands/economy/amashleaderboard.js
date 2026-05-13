const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'amashleaderboard',
    category: 'Economy',
    aliases: ['amashlb', 'alb', 'baltop', 'al'],
    cooldown: 30,

    async execute(message) {
        try {
            const generateLB = async (isGlobal) => {
                // Use correct table 'amash' and column 'bucks'
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    const topIds = allData.map(r => r.userid);
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                if (!data.length) return 'No millionaires found.';

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`;
                }).join('\n');
            };

            const getButtons = (isGlobal) => new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('amash_server').setLabel('Server').setStyle(ButtonStyle.Primary).setDisabled(!isGlobal),
                new ButtonBuilder().setCustomId('amash_global').setLabel('Global').setStyle(ButtonStyle.Secondary).setDisabled(isGlobal)
            );

            const initialDesc = await generateLB(false);
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`💰 ${message.guild.name} Wealth Rankings`)
                .setDescription(initialDesc)
                .setFooter({ text: `Requested By: ${message.author.tag}` });

            const response = await message.reply({ embeds: [embed], components: [getButtons(false)] });
            const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return i.reply({ content: "Unauthorized.", ephemeral: true });
                const showGlobal = i.customId === 'amash_global';
                const newDesc = await generateLB(showGlobal);
                
                const updatedEmbed = EmbedBuilder.from(embed)
                    .setColor(showGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(showGlobal ? `🌐 Global Wealth` : `💰 ${message.guild.name} Wealth`)
                    .setDescription(newDesc);

                await i.update({ embeds: [updatedEmbed], components: [getButtons(showGlobal)] });
            });

            collector.on('end', () => response.edit({ components: [] }).catch(() => null));
        } catch (error) {
            console.error(error);
            message.reply("Economy error.");
        }
    }
};
