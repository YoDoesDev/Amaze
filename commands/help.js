const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
  name: 'help',
  description: 'List all commands by category.',
  async execute(message) {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    const categories = {};

    commandFiles.forEach(file => {
      const cmd = require(`./${file}`);
      const cat = cmd.category || 'General'; 
      
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`\`!${cmd.name}\``);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📚 Amaze Help Menu')
      .setTimestamp();

    for (const [categoryName, commands] of Object.entries(categories)) {
      embed.addFields({ 
        name: `**${categoryName}**`, 
        value: commands.join(', '), 
        inline: false 
      });
    }

    message.channel.send({ embeds: [embed] });
  }
}