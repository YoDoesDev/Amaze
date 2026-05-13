const { EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  name: 'amash', 
  category: 'Economy', 
  cooldown: 30,
  description: 'Check your or someone else\'s Amash balance.', 
  async execute(message) {
    const targetUser = message.mentions.users.first() || message.author;

    try {
      // 1. Fetch the balance row
      const row = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(targetUser.id);
      
      // 2. Logic for uninitialized accounts
      if (!row) {
        return message.reply(
          targetUser.id === message.author.id 
          ? "You don't have an amash account yet! Use `!daily` to open one and get your first bucks." 
          : "That user doesn't have an amash account yet!"
        );
      } 
      
      // 3. Build and Send
      const embed = new EmbedBuilder()
        .setColor('#E6E510')
        .setTitle(`${targetUser.username}'s Balance`)
        .setDescription(`💰 **${targetUser.username}** has **${row.bucks}** Amash.`)
        .setFooter({ text: `Requested By: ${message.author.username}` })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Amash Balance Error:", err);
      return message.reply("A database error occurred while checking the balance.");
    }
  }
};
