const { AutoPoster } = require('topgg-autoposter');

module.exports = {
  setupIntegrations: (client, app, db) => {
    
    if (process.env.TOPGG_TOKEN) {
      // 1. Top.gg Autoposter
      const ap = AutoPoster(process.env.TOPGG_TOKEN, client);
      ap.on('posted', () => {
        console.log('>>> [TOP.GG] Stats synced successfully!');
      });

      
      // 2. Vote Webhook Route
      app.post('/votereward', (req, res) => {
        res.status(200).send("OK");
        const { userId } = req.body;
        if (!userId) return;

        try {
          db.prepare(`
            INSERT INTO amash (userid, bucks) 
            VALUES(?, 150) 
            ON CONFLICT(userid) 
            DO UPDATE SET bucks = bucks + 150
          `).run(userId);

          console.log(`>>> [VOTE] Reward +150 to ${userId}`);
          
          client.users.fetch(userId)
            .then(user => user.send("Thanks for voting! You've received **150 bucks**. 🚀"))
            .catch(() => {}); 
        } catch (err) {
          console.error(">>> [ERROR] Vote Reward DB Fail:", err.message);
        }
      });

      // 3. Webhook Listener
      app.listen(2186, () => console.log(">>> [WEBHOOK] Listener live on port 2186"));
    }
  }
};
