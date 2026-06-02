const slashExecute = (interaction, command) => {
  try {
        await interaction.deferReply();
        
        await taxes(interaction, interaction.user.id);
        // if (handleSlashCd(interaction, command)) return;
        
        await command.execute(interaction); 

    } catch (error) {
        console.error(`[ERROR] Execution failed for /${interaction.commandName}:`, error);

        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

module.exports = { slashExecute };