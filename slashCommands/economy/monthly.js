const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Imported your clean matrix storage handlers
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("monthly")
    .setDescription("Use this command to receive 400 amash every month"), 
  category: 'Economy', 
  cooldown: 5, // Internal command cooldown
  
  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();
    const cooldownTime = 2592000000; // 30 days in milliseconds

    try {
      // =======================================================
      // 2. FETCH DATA VIA MATRIX WRAPPERS
      // =======================================================
      const amashRow = universalGet("amash", authorId);
      
      const lastMonthly = amashRow ? amashRow.mTimestamp : null;
      const currentBucks = amashRow?.bucks ?? 0;
      
      // 3. Cooldown Logic
      if (lastMonthly && (now - lastMonthly < cooldownTime)) {
        const remaining = cooldownTime - (now - lastMonthly);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        let timeStr;
        if (days > 0) {
          timeStr = `**${days} days and ${hrs} hours**`;
        } else if (hrs > 0) {
          timeStr = `**${hrs} hours and ${mins} minutes**`;
        } else {
          timeStr = `**${mins} minutes**`;
        }

        return interaction.editReply(`Be patient! You can claim your monthly in ${timeStr}.`);
      }

      // =======================================================
      // 4. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & SAFE)
      // =======================================================
      // Ensure the row exists if they are completely brand new to the system
      if (!amashRow) {
        universalCreate("amash", authorId);
      }

      let streak = amashRow? amashRow.mStreak:0;
      let broken;
      const isBroken = amashRow? (now - amashRow.mTimestamp > 1000 * 60 * 60 * 24 * 61) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0
      } else{
        streak++;
      }
      
      const reward = Math.round(400 + Math.random() * 400 * ((streak - 1 < 0)? 0:(streak - 1)) + 82);
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        mTimestamp: now, 
        mStreak: streak
      });
      
      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} months!`:`You're on a ${streak}-month streak!`;
      
      // 5. Success Response Embed
      const embed = new EmbedBuilder()
        .setTitle("Monthly Amash Collected!")
        .setDescription(`You received **${reward} Amash**!\n\n${extra}\nCome back in 30 days.`)
        .setColor('#57F287')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Monthly Command Error:", err);
      return interaction.editReply("Something went wrong while claiming your monthly reward.");
    }
  }
};
