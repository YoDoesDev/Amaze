 const { EmbedBuilder } = require('discord.js');
const {
  universalGet, 
  universalSet, 
  universalCreate, 
} = require('../../utils/database.js');

module.exports = {
  name: 'weekly', 
  aliases: ['wk'], 
  category: 'Economy', 
  cooldown: 60,
  description: 'Use this command to gain amash every week.', 
  async execute(message) {
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 604800000; // 7 days in ms

    try {
      // 1. Check current database state using your matrix wrapper
      const row = universalGet("amash", authorId);
      
      // 2. Cooldown Logic
      if (row && row.wTimestamp && (now - row.wTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.wTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        
        // Logical display: "X days and Y hours" or just "Y hours"
        const timeStr = days > 0 
            ? `**${days} days and ${hrs} hours**` 
            : `**${hrs} hours**`;

        return message.reply(`Be patient! You can claim your weekly in ${timeStr}.`);
      }

      // 3. Initialize missing account row (The custom inline ON CONFLICT check)
      if (!row) {
        universalCreate("amash", authorId);
      }
      
      // 4. Safe fallback for new accounts to prevent crash
      const currentBucks = row?row.bucks:0;
      let streak = row? row.wStreak:0;
      let broken;
      const isBroken = row? (now - row.wTimestamp > 1000 * 60 * 60 * 24 * 14) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0
      } else{
        streak++;
      }
      
      const reward = Math.round(100 + Math.random() * 100 * ((streak - 1 < 0)? 0:(streak - 1)) + 21);
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        wTimestamp: now, 
        wStreak: streak
      });
      
      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} weeks!`:`You're on a ${streak}-week streak!`;
      
      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription(`You receive **${reward} Amash**!\n\n${extra}\nCome back next week!`)
        .setColor('#57F287');

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Weekly Command Error:", err);
      message.reply("A database error occurred while claiming your weekly reward.");
    }
  }
};
