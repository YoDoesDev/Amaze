const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
    name: 'amashleaderboard',
    aliases: ['amashlb', 'wealthlb'],
    category: 'Economy',
    cooldown: 30,
    description: 'Shows the amash leaderboard with server/global toggle',

    async execute(message, args) {
        const authorId = message.author.id;
        const hasGuild = !!message.guild;

        const loadingMessage = await message.reply("Opening the currency vaults...").catch(() => null);
        if (!loadingMessage) return;

        try {
            // =======================================================
            // 1. DISK DATA CAPTURE & COMPILATION
            // =======================================================
            const allData = db.prepare(`SELECT userid, bucks FROM amash ORDER BY bucks DESC LIMIT 100`).all();

            // Pre-compile global view layout strings
            const globalRows = allData.slice(0, 10);
            const globalList = globalRows.length
                ? globalRows.map((row, idx) => `**${idx + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n')
                : 'No wealthy users found in this view.';

            // Pre-compile local guild view layout strings safely
            let serverList = 'No wealthy users found in this view.';
            if (hasGuild) {
                const topIds = allData.map(r => r.userid);
                const fetchedMembers = await message.guild.members.fetch({ user: topIds }).catch(() => new Map());
                
                const serverRows = allData.filter(row => fetchedMembers.has(row.userid)).slice(0, 10);
                if (serverRows.length) {
                    serverList = serverRows.map((row, idx) => `**${idx + 1}.** <@${row.userid}> — **${row.bucks.toLocaleString()}** Amash`).join('\n');
                }
            }

            // =======================================================
            // 2. STATELESS RENDERING ARCHITECTURE
            // =======================================================
            const getButtons = (isGlobal) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('amash_server')
                        .setLabel('Server')
                        .setStyle(isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(!isGlobal || !hasGuild),
                    new ButtonBuilder()
                        .setCustomId('amash_global')
                        .setLabel('Global')
                        .setStyle(!isGlobal ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(isGlobal)
                );
            };

            const renderEmbed = (isGlobal) => {
                const guildName = hasGuild ? message.guild.name : "Server";
                return new EmbedBuilder()
                    .setColor(isGlobal ? '#FEE75C' : '#5865F2')
                    .setTitle(isGlobal ? `🌐 Global Wealth Leaderboard` : `💰 ${guildName} Wealth Rankings`)
                    .setDescription(isGlobal ? globalList : serverList)
                    .setFooter({ text: `Requested By: ${message.author.username}` })
                    .setTimestamp();
            };

            const defaultToGlobal = !hasGuild;
            await loadingMessage.edit({
                content: null,
                embeds: [renderEmbed(defaultToGlobal)],
                components: [getButtons(defaultToGlobal)]
            });

            // =======================================================
            // 3. COLLECTOR LOOP
            // =======================================================
            const collector = loadingMessage.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async i => {
                if (i.user.id !== authorId) {
                    return i.reply({ content: "This isn't your menu!", ephemeral: true });
                }

                try {
                    const showGlobal = i.customId === 'amash_global';
                    await i.update({ 
                        embeds: [renderEmbed(showGlobal)], 
                        components: [getButtons(showGlobal)] 
                    });
                } catch (err) {
                    console.error("Amash LB Button Error:", err);
                }
            });

            collector.on('end', () => {
                loadingMessage.edit({ components: [] }).catch(() => null);
            });

        } catch (error) {
            console.error(">>> [CRITICAL] Amash Leaderboard Prefix Error:", error);
            await loadingMessage.edit({ content: "The vault is currently locked due to an unexpected system exception.", embeds: [], components: [] }).catch(() => null);
        }
    }
};