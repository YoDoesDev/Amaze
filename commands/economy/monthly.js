const { EmbedBuilder } = require('discord.js');
// 1. FIXED: Imported your matrix utility functions
const {
  universalGet, 
  universalSet, 
  universalCreate, 
} = require('../../utils/database.js');

module.exports = {
  name: 'monthly', 
  aliases: ['m'], 
  category: 'Economy', 
  cooldown: 60,
  description: 'Use this command to gain amash every month.', 
  async execute(message) { 
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 2592000000; // 30 days in ms

    try {
      // 1. Check current timestamp using your matrix wrapper
      const row = universalGet("amash", authorId);
      
      // 2. Cooldown Logic
      if (row && row.mTimestamp && (now - row.mTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.mTimestamp);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        
        // Logical string building for better UX
        const timeStr = days > 0 
            ? `**${days} days and ${hrs} hours**` 
            : `**${hrs} hours**`;

        return message.reply(`Be patient! You can claim your monthly in ${timeStr}.`);
      }

      // 3. Initialize missing account row (Your custom ON CONFLICT alternative)
      if (!row) {
        universalCreate("amash", authorId);
      }
      
      // 4. Safe fallback for new accounts to prevent crash
      const currentBucks = row?row.bucks:0;
      let streak = row? row.mStreak:0;
      let broken;
      const isBroken = row? (now - row.mTimestamp > 1000 * 60 * 60 * 24 * 61) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0
      } else{
        streak++;
      }
      
      const reward = Math.round(400 + Math.random() * 400 * ((streak - 1 <= 0)? 0:((streak) + 82)));
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        mTimestamp: now, 
        mStreak: streak
      });
      
      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} months!`:`You're on a ${streak}-month streak!`;

      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription(`You receive **${reward} Amash**!\n\n${extra}\n Come back next month!`)
        .setColor('#57F287');

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Monthly Command Error:", err);
      message.reply("A database error occurred while claiming your monthly reward.");
    }
  }
};
