const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "taxes", 
  description: "Get familiar with our tax system!", 
  category: "Economy", 
  cooldown: 10,
  async execute(message){
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
        "• **Below 7,000 bucks:** 0% (Tax Free!)\n" +
        "• **7,001 to 12,000 bucks:** 2% per day\n" +
        "• **12,001 to 17,000 bucks:** 5% per day\n" +
        "• **17,001 to 100,000 bucks:** 7% per day\n" +
        "• **100,001 to 1,000,000 bucks:** 10% per day\n" +
        "• **Over 1,000,000 bucks:** 25% per day"
    },
    {
      name: "🛡️ The 1-Day Offline Safety Cap",
      value: 
        "Taking a break from the bot? **Don't panic!** Taxes do *not* accumulate continuously while you are gone.\n\n" +
        "If you log off for 2 days, a week, or even a month, your taxes are **capped at exactly 1 single day's worth of tax** the next time you chat. You will *never* return to a wiped-out balance of 0!"
    }
  )
  .setFooter({ text: "Keep your money moving to beat the tax brackets!" })
  .setTimestamp();
  
  message.reply({embeds: [embed]}).catch(console.error);
  }
}
