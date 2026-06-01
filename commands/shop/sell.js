const { items } = require('./shop.js');
const { EmbedBuilder } = require('discord.js');
const { db } = require('../../utils/database.js');

module.exports = {
  name: "sell", 
  description: `Sell Philosopher's Stone for Amash\nSyntax: \`!sell [amount]\`\n\n[] = OPTIONAL`,
  category: "Shop", 
  cooldown: 10,
  async execute(message, args){
    const amt = parseInt(args[0]) || 1;
    const author = message.author;
    
    if(isNaN(amt) || amt%1 > 0 || amt <= 0){
      return message.reply("Please enter a valid amount of Philosopher's Stones you wanna sell.");
    }
    
    const pstones = db.prepare("SELECT pstone FROM inventory WHERE userid = ?").get(author.id);
    
    if(!pstones || pstones.pstone < amt){
      const uHave = !pstones?0:pstones.pstone
      return message.reply(`You don't have enough Stones to sell them! You have only ${uHave} Philosopher's Stone(s).`)
    }
    
    db.prepare("UPDATE inventory SET pstone = pstone - ? WHERE userid = ?").run(amt, author.id);
    db.prepare("UPDATE amash SET amash = amash + ? WHERE userid = ?").run((45000 * amt), author.id);
    
    const embed = new EmbedBuilder()
    .setTitle("💎 Stones Sold!")
    .setDescription(`<@${author.id}>, you have sold ${amt} Philosopher's Stone(s) and received ${45000 * amt} amash!`)
    .setColor('#30E025')
    .setFooter({
      text: `Sold by: ${author.tag}`
    })
    .setTimestamp();
    
    return message.reply({embeds: [embed]});
  }
}