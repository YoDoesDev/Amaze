const executeCommand = async (command, message, args, prefix) => {
  try {
        await command.execute(message, args);

        // Rare chance for a vote reminder (Social Proof)
        if (Math.random() < 0.07) {
            message.reply(`Having fun? Use \`${prefix}vote\` to support Amaze!`);
        }
    } catch (error) {
        console.error(`>>> [ERROR] Command Execution: ${error.message}`);
        message.reply("There was an error executing that command!");
    } 
}

module.exports = { executeCommand };