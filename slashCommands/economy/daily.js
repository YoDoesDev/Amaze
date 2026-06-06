const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
// 1. FIXED: Imported your clean matrix storage handlers
const { universalGet, universalSet, universalCreate } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Use this command to receive amash everyday"), 
  category: 'Economy', 
  cooldown: 60,
  
  async execute(interaction) { 
    const authorId = interaction.user.id;
    const now = Date.now();
    const cooldown = 86400000; // 24 hours in ms

    try {
      // =======================================================
      // 1. FETCH DATA VIA MATRIX WRAPPERS
      // =======================================================
      const amashRow = universalGet("amash", authorId);
      
      const lastDaily = amashRow ? amashRow.dTimestamp : null;
      const currentBucks = amashRow?.bucks ?? 0;

      // 2. Cooldown Logic
      if (lastDaily && (now - lastDaily < cooldown)) {
        const remaining = cooldown - (now - lastDaily);
        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        
        const timeLeft = hrs > 0 ? `${hrs}h ${mins}m` : (mins > 0 ? `${mins}m` : "less than a minute");
        return interaction.editReply(`Be patient! You can claim your daily in **${timeLeft}**.`);
      }

      // =======================================================
      // 3. EXECUTION MATRIX MUTATIONS (ON CONFLICT ALTERNATIVE)
      // =======================================================
      // Ensure the account exists if they are completely new to the bot
      if (!amashRow) {
        universalCreate("amash", authorId);
      }

      let streak = amashRow? amashRow.dStreak:0;
      let broken;
      const isBroken = amashRow? (now - amashRow.dTimestamp > 1000 * 60 * 60 * 48) : false;
      
      if(isBroken){
        broken = streak;
        streak = 0
      } else{
        streak++;
      }
      
      const reward = Math.round(40 + Math.random() * 40 * ((streak - 1 <= 0)? 0:((streak - 1) + 13)));
      
      universalSet("amash", authorId, {
        bucks: currentBucks + reward,
        dTimestamp: now, 
        dStreak: streak
      });
      
      const extra = (isBroken)? `Oh no, you lost your streak of ${broken} days!`:`You're on a ${streak}-day streak!`;

      // 4. Success Response
      const embed = new EmbedBuilder()
        .setTitle("Amash collected!")
        .setDescription(`You receive **${reward} Amash**!\n\n${extra}\nCome back tomorrow!`)
        .setColor('#57F287');

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Daily Command Error:", err);
      // Since index.js handles deferReply globally, editReply is safe here
      return interaction.editReply("Something went wrong while claiming your daily reward.");
    }
  }
};
