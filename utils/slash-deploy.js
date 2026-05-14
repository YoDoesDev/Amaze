const { REST, Routes, SlashCommandBuilder} = require(`discord.js`);

const svrId = '1494944799264870483';
const apId = '1494637741722566656';
const token = process.env.TOKEN;

const rest = new REST().setToken(token);

const slashReg = async () => {
  await rest.put(Routes.applicationGuildCommands(apId, svrId), 
  {
    body: [
      new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Shows bot's latency")
    ]
  }) 
};

slashReg();