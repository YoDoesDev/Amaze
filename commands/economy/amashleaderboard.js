const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'amashleaderboard',
    category: 'Economy',
    aliases: ['amashlb', 'alb', 'baltop', 'al'],
    cooldown: 30,
    description: 'Shows the wealthiest users with a Global/Server toggle.',

    async execute(message) {
        try {
            const getButtons = (isGlobal) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('amash_server')
                        .setLabel('Server')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!isGlobal),
                    new ButtonBuilder()
                        .setCustomId('amash_global')
                        .setLabel('Global')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(isGlobal)
                );
            };

            // Strategy: Fetch only the IDs we need to avoid Rate Limits
            const generateLB = async (isGlobal) => {
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    // Filter locally by checking if the user is in the current guild cache
                    // This is much safer than a full .fetch()
                    const guildMemberIds = message.guild.members.cache.map(m => m.id);
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                if (!data.length) return 'No millionaires found in this view.';

                // Fetch only these specific users to ensure names are updated without crashing
                const targetIds = data.map(d => d.userid);
                await message.guild.members.fetch({ user: targetIds }).catch(() => null);

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`;
                }).join('\n');
            };

            // Initial view
            const initialContent = await generateLB(false);
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`💰 ${message.guild.name} Wealth Rankings`)
                .setDescription(initialContent)
                .setFooter({ text: `Requested By: ${message.author.tag}` })
                .setTimestamp();

            const response = await message.channel.send({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "Run the command yourself!", ephemeral: true });
                }

                const showGlobal = i.customId === 'amash_global';
                const newDescription = await generateLB(showGlobal);

                const updatedEmbed = new EmbedBuilder()
                    .setColor(showGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(showGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${message.guild.name} Wealth Rankings`)
                    .setDescription(newDescription)
                    .setFooter({ text: `Requested By: ${message.author.tag}` })
                    .setTimestamp();

                await i.update({ 
                    embeds: [updatedEmbed], 
                    components: [getButtons(showGlobal)] 
                });
            });

            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            message.reply("The vault is currently locked. Could not load the leaderboard.");
        }
    }
};
