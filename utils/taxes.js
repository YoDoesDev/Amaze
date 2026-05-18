const { db } = require("./database.js");
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
  
  const daysUntaxed = Math.floor((now - lastTaxed)/(30 * 24 * 60 * 60 * 1000)) == 0? 0:1;
  
  if(daysUntaxed == 0) return;
  
  const monie = aData?.bucks ?? 0;
  
  let taxPDay = 0
  if(monie < 7000){
    taxPDay = 0;
  } else if(monie < 12000){
    taxPDay = 0.02;
  } else if(monie < 17000){
    taxPDay = 0.05;
  } else if(monie < 100000){
    taxPDay = 0.07;
  } else if(monie < 1000000){
    taxPDay = 0.1;
  } else{
    taxPDay = 0.25;
  }
  
  if(taxPDay == 0) return;
  
  const monieToRemove = Math.round(monie * taxPDay);
  
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
