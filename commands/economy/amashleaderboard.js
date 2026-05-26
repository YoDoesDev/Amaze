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
                let data = [];

                if (isGlobal) {
                    // Fetch top 10 globally straight from database
                    data = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 10`).all();
                } else {
                    // 1. Fetch top 100 from database to have a healthy buffer zone
                    const potentialTopRows = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();
                    
                    // 2. Filter down to members who are actually in this server right now
                    for (const row of potentialTopRows) {
                        if (data.length >= 10) break; // We only need the top 10 display slots filled
                        
                        try {
                            // Check if the user exists in the cache or fetch them individually (highly reliable)
                            const member = message.guild.members.cache.get(row.userid) || await message.guild.members.fetch(row.userid);
                            if (member) data.push(row);
                        } catch {
                            // User is not in this guild, skip them cleanly
                            continue;
                        }
                    }
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
