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
            // Function to generate the list content
            const generateLB = async (isGlobal) => {
                // Pull Top 100 to ensure we find enough matches for the local server
                const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                
                let data;
                if (isGlobal) {
                    data = allData.slice(0, 10);
                } else {
                    // Get IDs from the DB and fetch them to check if they are in this server
                    const topIds = allData.map(r => r.userid);
                    const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                    const guildMemberIds = Array.from(fetchedMembers.keys());

                    // Filter DB results to only include those actually in the server
                    data = allData.filter(row => guildMemberIds.includes(row.userid)).slice(0, 10);
                }

                if (!data.length) return 'No wealthy users found in this view.';

                return data.map((row, index) => {
                    return `**${index + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`;
                }).join('\n');
            };

            // Helper for buttons
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

            // Initial view (Server)
            const initialDesc = await generateLB(false);
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`💰 ${message.guild.name} Wealth Rankings`)
                .setDescription(initialDesc)
                .setFooter({ text: `Requested By: ${message.author.tag}` })
                .setTimestamp();

            const response = await message.reply({ 
                embeds: [embed], 
                components: [getButtons(false)] 
            });

            // Collector for button interactions
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
    // 1. Security Check
    if (i.user.id !== message.author.id) {
        return i.reply({ content: "Unauthorized.", ephemeral: true });
    }

    try {
        // 2. STOP THE CLOCK (Tells Discord: "Working on it!")
        await i.deferUpdate();

        // 3. Update the board
        const updatedBoard = await generateLB(i.customId === 'amash_global');
        await i.editReply(updatedBoard); 

    } catch (error) {
        console.error("Leaderboard Button Error:", error);
    }
});


            // Remove buttons when finished
            collector.on('end', () => {
                response.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Error:", error);
            message.reply("The vault is currently locked. Could not load rankings.");
        }
    }
};
