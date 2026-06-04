const { slashExecute } = require("../handlers/slashExecute.js");
const { taxes } = require("../handlers/taxes.js");

const execSlash = async (interaction, client) => {
    // Return if it comes from a button
    if (interaction.isButton()) return;
    // If not a chat input command return
    if (!interaction.isChatInputCommand()) return;
    // Retrieve the command from the defined collection
    const command = client.slashCommands.get(interaction.commandName);
    // If the command doesn't exist, return
    if (!command) return;
    // The taxes manh the taxes
    await taxes(interaction, interaction.user.id);
    // Execute
    await slashExecute(interaction, command);
}

module.exports = { execSlash };