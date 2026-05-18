const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
  .setName("taxes")
  .setDescription("Get familiar with our tax system!"), 
  category: "Economy", 
  cooldown: 10,
  async execute(interaction){
    const embed = new EmbedBuilder()
  .setTitle("🏛️ Server Tax System Guide")
  .setColor("#FF5555")
  .setDescription(
    "To prevent massive inflation and keep our server economy balanced, a **Daily Tiered Wealth Tax** is automatically applied when you chat or use commands."
  )
  .addFields(
    { 
      name: "📊 Current Tax Brackets (Based on Balance)", 
      value: 
        "• **Below 10,000 bucks:** 0% (Tax Free!)\n" +
        "• **10,001 to 16,000 bucks:** 2% per month\n" +
        "• **16,001 to 21,000 bucks:** 5% per month\n" +
        "• **21,001 to 26,000 bucks:** 7% per month\n" +
        "• **26,001 to 1,00,000 bucks:** 8% per month\n" +
        "• **Over 1,00,000 bucks:** 10% per month"
    },
    {
      name: "🛡️ The 1-Month Offline Safety Cap",
      value: 
        "Taking a break from the bot? **Don't panic!** Taxes do *not* accumulate continuously while you are gone.\n\n" +
        "If you log off for 2 months, 4 months, or even a year, your taxes are **capped at exactly 1 single month's worth of tax** the next time you chat. You will *never* return to a wiped-out balance of 0!"
    }
  )
  .setFooter({ text: "Keep your money moving to beat the tax brackets!" })
  .setTimestamp();
  
  interaction.editReply({embeds: [embed]});
  }
}
