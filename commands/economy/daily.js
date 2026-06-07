const { EmbedBuilder } = require('discord.js');
const {
  universalGet, 
  universalSet, 
  universalCreate, 
} = require('../../utils/database.js');

module.exports = {
  name: 'daily', 
  aliases: ['d'], 
  category: 'Economy', 
  description: 'Use this command to gain amash everyday.', 
  cooldown: 60,
  async execute(message) { 
    const authorId = message.author.id;
    const now = Date.now();
    const cooldown = 86400000; // 24 hours in ms

    try {
      // 1. Check current timestamp
      const row = universalGet("amash", authorId);
      // 2. Cooldown Logic
      if (row && (now - row.dTimestamp < cooldown)) {
        const remaining = cooldown - (now - row.dTimestamp);
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        return message.reply(`Be patient! You can claim your daily in **${hrs} hours and ${mins} minutes**.`);
      }

      // 3. Update or Insert Data
      // Since it's synchronous, this runs exactly when the check passes
      
      if(!row) universalCreate("amash", authorId);
      
      const currentBucks = row?row.bucks:0;
      let streak = row? row.dStreak:0;
      let broken;
      const isBroken = row? (now - row.dTimestamp > 1000 * 60 * 60 * 48) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0
      } else{
        streak++;
      }
      
      const reward = Math.round(40 + Math.random() * 40 * ((streak - 1 < 0)? 0:((streak) + 13)));
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        dTimestamp: now, 
        dStreak: streak
      });


      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} days!`:`You're on a ${streak} day streak!`;
      
      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription(`You receive **${reward} Amash**.\n\n${extra}\n Come back tomorrow!`)
        .setColor('#57F287');

      message.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Daily Command Error:", err);
      message.reply("Something went wrong while claiming your daily reward.");
    }
  }
}
