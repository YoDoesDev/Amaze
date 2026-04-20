const { db } = require('../database.js');

module.exports = {
  name: 'repleaderboard', 
  aliases: 'replb', 'rl', 
  description: 'Shows a leaderboard of members with highest reputation points. ',
  async execute(message) 
}
