const {
  PermissionFlagsBits, 
  EmbedBuilder, 
  ChannelType
} = require("discord.js");

const greetings = async guild => {
  console.log(`Amaze has joined a new server: ${guild.name}`);
    
    const defaultChannel = guild.channels.cache.find(
        channel => channel.type === 0 &&
        channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
    );
    
    if (!defaultChannel) return;
    
    const welcomeEmbed = new EmbedBuilder()
        .setColor('#FFB703') // Premium Gold theme for an economy bot
        .setTitle(`👋 Hello ${guild.name}! I'm Amaze!`)
        .setDescription(`Thanks for inviting me! I'm a unique economy and gaming bot built around influence, risk, and strategy. Here is what I bring to your server:\n`)
        .addFields([
        {
            name: '📈 Reputation Stock Market',
            value: 'Your reputation *is* your currency. Trade, invest, and manipulate a market where reputation drives absolute wealth!'
        },
        {
            name: '🎲 Games & Gambling',
            value: 'Test your luck with high-stakes gambling commands, or challenge server members to tactical games like **RPS** (Rock, Paper, Scissors)!'
        },
        {
            name: '🚀 Get Started',
            value: 'Type \`!help\` right now to discover my full list of systems and setup commands!'
        }])
        .setFooter({ text: 'Developed by yo.da.bro & forklifterisstillcertified' })
        .setTimestamp();
    
    
    try {
        await defaultChannel.send({ embeds: [welcomeEmbed] });
    } catch (error) {
        console.error(`Could not send welcome message in ${guild.name}:`, error);
    }
}

module.exports = {greetings};