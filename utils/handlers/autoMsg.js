module.exports = {
  async autoMsg (message, prefix){
    if (!message.content.startsWith(prefix)) {
            const content = message.content.toLowerCase();

            if (['thx', 'thanks', 'thank you', 'tysm'].some(w => content.includes(w))) {
                if (Math.random() < 0.3) {
                    return message.channel.send(`Glad you're happy! Remember, you can use \`${prefix}vouch @user\` to increase their reputation!`);
                }
            }

            if (['fk u', 'fuck you', 'fuck u', 'i hate u'].some(w => content.includes(w))) {
                if (Math.random() < 0.6) {
                    return message.channel.send(`Angry at someone? Use \`${prefix}defame @user\` to decrease their reputation!`);
                }
            }
            return;
        }
  }
}
