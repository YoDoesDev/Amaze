function parseCommand(message, prefix, client) {
  // 1. Determine which prefix was used
  const usedPrefix = message.content.startsWith("!") ? "!" : prefix;
  
  // 2. Strict Check: If it doesn't start with either valid prefix, drop out cleanly
  if (!message.content.startsWith("!") && !message.content.startsWith(prefix)) {
    return null; 
  }

  // 3. Slice and parse arguments
  const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  // 4. Resolve aliases and fetch command object
  const trueCommandName = client.aliases.get(commandName) || commandName;
  const command = client.commands.get(trueCommandName);

  // 5. Return everything back as an organized object
  return { command, args };
}

module.exports = { parseCommand };
