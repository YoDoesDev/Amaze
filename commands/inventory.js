const { EmbedBuilder } = require('discord.js');
const { db } = require('../discord.js');

module.exports = {
  name: 'inventory', 
  aliases: ['inv'], 
  description: 'Use this to check what you have bought.', 
  async execute(message){
    const now = message.createdTimestamp;
    db.get(`SELECT * FROM inventory WHERE userid = ?`, [message.author.id], (err, row) => {
      if(err){
        console.log(err);
        return message.reply("A Database error occurred.");
      } 
      if (!row) {
        return message.reply("Your inventory is empty! Use the shop to buy items.");
      } 
      const url = message.author.displayAvatarURL({ 
          extension: 'png', 
          size: 1024, 
          forceStatic: false
        });
      
      const pr = row.pr_tp > now? "ON":"OFF";
      const ddbl = row.ddbl_tp > now? "ON":"OFF";
      const dblv = row.dblv_tp > now? "ON":"OFF";
      const pstone = row.pstone;
      const lic = row.stocklic < 1? 'NOT ACQUIRED':'ACQUIRED';
      
      const msg = `1. 🛡 PR Shield: ${pr}\n
      2. ⏭️ Vouch Doubler: ${dblv}\n
      3. ↘️ Defame Doubler: ${ddbl}\n
      4. 💎 Philosopher's Stone: ${pstone}\n
      5. 📃 Stock License: ${lic}\n`;
      
      const embed = new EmbedBuilder().setTitle(`${message.author.username}'s Inventory`).setThumbnail(url).setDescription(msg).setTimestamp().setColor('#3A70DC');
      
      return message.reply({embeds: [embed]});
    })
  }
}
