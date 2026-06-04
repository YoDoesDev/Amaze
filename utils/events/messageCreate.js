const { execute } = require("../eval.js");
const { taxes } = require("../handlers/taxes.js");
const { parseCommand } = require("../handlers/cmdParse.js");
const { executeCommand } = require("../handlers/execute.js");
const { handleCooldown } = require('../handlers/cooldowns.js');
const { autoMsg } = require('../handlers/autoMsg.js');
const { getPrefix } = require('../prefixManager.js');


const execPrefix = async message => {
    // Basic Gates
    if (message.author.bot) return;
    // Fetching Prefix
    const prefix = getPrefix(message.guild?.id) || "!";
    // Look for swears
    autoMsg(message, prefix);
    // If doesn't start with prefix return
    if (!message.content.startsWith("!") && !message.content.startsWith(prefix)) return;
    // Command Parsing
    const parsed = parseCommand(message, prefix, client);
    // Taking values from parsed object
    const command = parsed?.command;
    const args = parsed?.args;
    // Checking if it's eval
    if (message.content.startsWith(`!eval`)) return await execute(message, client, db);
    // If no written command exists return
    if (!command) return;
    // Cooldown
    if (handleCooldown(message, command)) return;
    // Tax time
    await taxes(message, message.author.id);
    // Execution
    await executeCommand(command, message, args, prefix);
}

module.exports = { execPrefix };