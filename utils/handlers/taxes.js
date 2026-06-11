const { db } = require("../database.js");
const { EmbedBuilder } = require("discord.js");

const taxes = async (medium, author) => {
  const self = author;
  const aData = db.prepare(`SELECT bucks, last_taxed_at FROM amash WHERE userid = ?`).get(self);
  const lastTaxed = aData?.last_taxed_at ?? 0;
  const now = medium.createdTimestamp;
  if(lastTaxed == 0){
    return db.prepare(`INSERT INTO amash (userid, bucks, last_taxed_at) VALUES(?, ?, ?)
    ON CONFLICT (userid) DO UPDATE SET last_taxed_at = excluded.last_taxed_at`).run(self, 0, now);
  }
  
  const mthsUntaxed = Math.floor((now - lastTaxed)/(30 * 24 * 60 * 60 * 1000)) == 0? 0:1;
  
  if(mthsUntaxed == 0) return;
  
  const monie = aData?.bucks ?? 0;
  
  let taxPM = 0;
  if(monie < 10000){
    taxPM = 0;
  } else if(monie < 16000){
    taxPM = 0.02;
  } else if(monie < 21000){
    taxPM = 0.05;
  } else if(monie < 26000){
    taxPM = 0.07;
  } else if(monie < 100000){
    taxPM = 0.08;
  } else{
    taxPM = 0.1;
  }
  
  if(taxPM == 0) return;
  
  const monieToRemove = Math.round(monie * taxPM);
  
  let channel;
  
  if(!medium.author){
    channel = await medium.client.channels.fetch(medium.channelId);
  } else{
    channel = medium.channel;
  }
  
  db.prepare(`UPDATE amash SET bucks = bucks - ?, last_taxed_at = ? WHERE userid = ?`).run(monieToRemove, now, self);
  
  const embed = new EmbedBuilder()
  .setTitle("Tax Time!")
  .setDescription(`<@${self}>, your balance has been deducted by ${monieToRemove}.\nTo know how taxes work, use the \`!taxes\` command.`)
  .setTimestamp();
  
  channel.send({embeds: [embed]}).catch(console.error);
  
  
}

module.exports = { taxes };
