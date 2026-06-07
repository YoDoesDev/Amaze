const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Imported your clean matrix storage handlers
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Receive your weekly allowance of 100 amash"), 
  category: 'Economy', 
  cooldown: 5, 
  
  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();
    const cooldownTime = 604800000; // 7 days in milliseconds

    try {
      // =======================================================
      // 2. FETCH DATA VIA MATRIX WRAPPERS
      // =======================================================
      const amashRow = universalGet("amash", authorId);
      
      const lastWeekly = amashRow ? amashRow.wTimestamp : null;
      const currentBucks = amashRow?.bucks ?? 0;

      // 3. Cooldown Logic
      if (lastWeekly && (now - lastWeekly < cooldownTime)) {
        const remaining = cooldownTime - (now - lastWeekly);
        const days = Math.floor(remaining / 86400000);
        const hrs = Math.floor((remaining % 86400000) / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        let timeStr;
        if (days > 0) {
          timeStr = `**${days}d and ${hrs}h**`;
        } else if (hrs > 0) {
          timeStr = `**${hrs}h and ${mins}m**`;
        } else {
          timeStr = `**${mins}m**`;
        }

        return interaction.editReply(`Be patient! Your weekly reward is available in ${timeStr}.`);
      }

      // =======================================================
      // 4. EXECUTION MATRIX MUTATIONS (SEQUENTIAL & SAFE)
      // =======================================================
      // Ensure the account profile row exists if they are completely new to the bot
      if (!amashRow) {
        universalCreate("amash", authorId);
      }
      
      let streak = amashRow? amashRow.wStreak:0;
      let broken;
      const isBroken = amashRow? (now - amashRow.wTimestamp > 1000 * 60 * 60 * 24 * 14) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0;
      } else{
        streak++;
      }
      
      const reward = Math.round(100 + Math.random() * 100 * ((streak - 1 < 0)? 0:((streak) + 21)));
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        wTimestamp: now, 
        wStreak: streak
      });
      
      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} weeks!`:`You're on a ${streak}-week streak!`;

      // 5. Success Response Embed
      const embed = new EmbedBuilder()
        .setTitle("Weekly Reward Claimed!")
        .setDescription(`You received **${reward} Amash**!\n\n${extra}\nSee you again in 7 days.`) 
        .setColor('#57F287')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Weekly Command Error:", err);
      return interaction.editReply("Something went wrong while claiming your weekly reward.");
    }
  }
};
