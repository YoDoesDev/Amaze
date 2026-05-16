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
            // Function to generate the board data (Embed + Buttons)
            const createBoard = async (isGlobal) => {
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

                const list = data.length 
                    ? data.map((row, index) => `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n')
                    : "No wealthy users found in this view.";

                const embed = new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Wealth Rankings` : `💰 ${message.guild.name} Wealth Rankings`)
                    .setDescription(list)
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

            // Initial view (Server)
            const initialView = await createBoard(false);
            const response = await message.reply(initialView);

            // Collector for button interactions
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                // 1. Authorization check
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "This vault is restricted to the original requester!", ephemeral: true });
                }

                try {
                    // 2. Determine view based on button clicked
                    const isGlobal = i.customId === 'amash_global';

                    // 3. Generate the new board content FIRST
                    const nextView = await createBoard(isGlobal);

                    // 4. Use i.update to swap the message content instantly
                    await i.update(nextView);

                } catch (error) {
                    console.error("Amash LB Button Error:", error);
                    // Fallback if the interaction is still alive but update failed
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: "Could not switch views.", ephemeral: true });
                    }
                }
            });

            // Remove buttons when finished to save bot resources
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            message.reply("The vault is currently locked. Could not load rankings.");
        }
    }
};
