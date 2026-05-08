 const { EmbedBuilder } = require('discord.js');
const { db } = require('../database.js');

module.exports = {
  name: 'give',
  category: 'Economy',
  cooldown: 120,
  description: 'Use this command to give someone amash!\n\nSyntax: `!give <@user> <amash>`',
  async execute(message, args) { 
    const target = message.mentions.users.first();
    const amt = parseInt(args[1]);
    const authorId = message.author.id;

    // 1. Initial Validations
    if (!target) {
      return message.reply("Mention someone to give them amash!");
    }
    if (isNaN(amt) || amt < 1) {
      return message.reply("Please enter a valid positive integer for the amount!");
    }
    if (target.id === authorId) {
      return message.reply("😭 You could use `!daily`, `!weekly`, or `!monthly` but no!");
    }
    if (target.bot) {
      return message.reply("You can't give money to bots; they have no use for it.");
    }

    try {
      // 2. Check Author Balance
      const row = db.prepare(`SELECT bucks FROM amash WHERE userid = ?`).get(authorId);
      const balance = row?.bucks ?? 0;

      if (balance < amt) {
        return message.reply(`You don't have enough amash! You need **${amt}**, but you only have **${balance}**.`);
      }

      // 3. Execution (The Transfer)
      // Subtract from Author
      db.prepare(`UPDATE amash SET bucks = bucks - ? WHERE userid = ?`).run(amt, authorId);

      // Add to Target (Using your ON CONFLICT logic)
      db.prepare(`
        INSERT INTO amash (userid, bucks) VALUES (?, ?)
        ON CONFLICT (userid) DO UPDATE SET bucks = bucks + excluded.bucks
      `).run(target.id, amt);

      // 4. Success Response
      const embed = new EmbedBuilder()
        .setColor('#23A559')
        .setTitle("Amash Transferred!")
        .setDescription(`You have successfully sent <@${target.id}> **${amt}** Amash\n\n\`\`\`js\n${message.author.username} —> ${amt} —> ${target.username}\n\`\`\``)
        .setTimestamp();

      return message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Give Command Error:", err);
      return message.reply("A database error occurred during the transfer.");
    }
  }
}
