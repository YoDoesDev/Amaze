const {
  universalGet, 
  universalSet
} = require("../database.js");

module.exports = {
  async checkXP(authorId){
    const stats = universalGet("characters", authorId);
    const xp = stats.xp;
    const lvl = stats.lvl;
    
    const gp = 40 * Math.pow(1.4, lvl + 1);
    
    if(gp <= xp){
      const nlvl = stats.lvl + 1
      const nhp = stats.hp + Math.round(Math.random() * 30) + 60
      universalSet("characters", authorId, {
        lvl: nlvl, 
        hp: nhp
      });
      
      
      return true;
    }
    
    return false;
  }
}