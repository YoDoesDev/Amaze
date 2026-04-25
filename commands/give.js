const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'give',
  category: 'Economy',
  description: 'Use this command to give someone amash!\n\nSyntax: `!give <@user> <amash>`',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amt = args[1];
    
    if (!target) {
      return message.reply("Mention someone to give them amash!");
    }
    if (isNaN(amt) || (amt < 1 || !Number.isInteger(Number(amt)))) {
      return message.reply("Please enter a valid amount of amash!");
    }
    
    db.get(`SELECT bucks FROM amash WHERE userid = ?`, [message.author.id], (err, row) => {
      if (err) {
        console.log(err);
        return message.reply("A Database Error Occured");
      }
      
      if (row.bucks < amt) {
        return message.reply(`You don't have enough amash to give ${amt} to ${target.username}! You only have ${row.bucks} amash.`)
      }
      
      
      db.run(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`, [amt, message.author.id]);
      
      db.run(`INSERT INTO amash (userid, bucks) VALUES (?, ?)
      ON CONFLICT (userid) DO UPDATE SET bucks = bucks + excluded.bucks`, [target.id, amt]);
      
      const embed = new EmbedBuilder().setColor('#23A559').setTitle("Amash Transferred!").setDescription(`You have successfully sent <@${target.id}> ${amt} Amash\n\n\`\`\`js\n${message.author.username} —> ${amt} —> ${target.username}\n\`\`\``).setTimestamp();
      
      return message.reply({ embeds: [embed] })
    })
  }
}