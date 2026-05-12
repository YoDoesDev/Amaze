const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'amashleaderboard',
    category: 'Economy',
    aliases: ['amashlb', 'alb', 'baltop', `al`],
    cooldown: 30,
    description: 'Shows the wealthiest users with a Global/Server toggle.',

    async execute(message) {
        try {
            // 1. Setup the Buttons
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

            // 2. Fetch Server Members for filtering
            const members = await message.guild.members.fetch();
            const memberIds = Array.from(members.keys());

            // 3. Data Processing Function for Economy
            const generateLB = (isGlobal) => {
                // Ensure the table/column names match your 'amaze.sqlite' schema
                // Based on previous chats, your currency table is 'users' and column is 'bucks'
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC`).all();
                
                const data = isGlobal 
                    ? allData.slice(0, 10) 
                    : allData.filter(row => memberIds.includes(row.userid)).slice(0, 10);

                if (!data.length) return 'No millionaires found in this view.';

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`;
                }).join('\n');
            };

            // 4. Initial Embed (Defaulting to Server LB)
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`💰 ${message.guild.name} Wealth Rankings`)
                .setDescription(generateLB(false))
                .setFooter({ text: `Requested By: ${message.author.tag}` })
                .setTimestamp();

            const response = await message.channel.send({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            // 5. Interaction Collector
            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: "Run the command yourself to flip the pages!", ephemeral: true });
                }

                const showGlobal = i.customId === 'amash_global';

                const updatedEmbed = new EmbedBuilder()
                    .setColor(showGlobal ? 0xFEE75C : 0x5865F2)
                    .setTitle(showGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${message.guild.name} Wealth Rankings`)
                    .setDescription(generateLB(showGlobal))
                    .setFooter({ text: `Requested By: ${message.author.tag}` })
                    .setTimestamp();

                await i.update({ 
                    embeds: [updatedEmbed], 
                    components: [getButtons(showGlobal)] 
                });
            });

            // Cleanup: Remove buttons after 1 minute
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            message.reply("The vault is currently locked. Could not load the leaderboard.");
        }
    }
};
