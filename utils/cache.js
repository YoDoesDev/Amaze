const reputation = new Map();
const vouch_history = new Map();
const amash = new Map();
const investments = new Map();
const inventory = new Map();
const portfolio = new Map();

const clearCache = caches => {
  const now = Date.now();
  caches.forEach(cache => {
    for(const [key, value] of cache.entries()){
      if((now - value.timestamp) > 1000 * 60 * 10){
        cache.delete(key);
      }
    }
  })
};

module.exports = {
  reputation, 
  vouch_history, 
  amash, 
  investments, 
  inventory, 
  portfolio, 
  clearCache
};