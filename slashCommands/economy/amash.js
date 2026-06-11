const { EmbedBuilder, SlashCommandBuilder} = require('discord.js');
const { universalGet } = require('../../utils/database.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("amash")
  .setDescription("Shows your/other's amash balance.")
  .addUserOption(option => {
    return option
    .setName("user")
    .setDescription("The user whose balance you wanna check.");
  }), 
  category: 'Economy', 
  cooldown: 30,
  async execute(interaction) {
    const receive = interaction.options.getUser("user");
    const targetUser = receive || interaction.user;

    try {
      // 1. Fetch the balance row
      const row = universalGet("amash", targetUser.id);
      
      // 2. Logic for uninitialized accounts
      if (!row) {
        return interaction.editReply({
          content:
          targetUser.id === interaction.user.id
          ? "You don't have an amash account yet! Use `!daily` to open one and get your first bucks." 
          : "That user doesn't have an amash account yet!", 
          ephemeral: true
        });
      } 
      
      // 3. Build and Send
      const embed = new EmbedBuilder()
        .setColor('#E6E510')
        .setTitle(`${targetUser.username}'s Balance`)
        .setDescription(`💰 **${targetUser.username}** has **${row.bucks}** Amash.`)
        .setFooter({ text: `Requested By: ${interaction.user.username}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("Amash Balance Error:", err);
      return interaction.editReply({
        content: "A database error occurred while checking the balance.", 
        ephemeral: true
      });
    }
  }
};
