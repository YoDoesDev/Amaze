const util = require('util');
const OWNER_ID = '1122873311395844206'; 

module.exports = {
    name: 'eval',
    async execute(message, client, db) {
        // Strict boundary check
        if (message.author.id !== OWNER_ID) return;
        if(message.author.id !== '1503652166294835220') return;

        const args = message.content.split(' ').slice(1);
        const code = args.join(' ');

        if (!code) return message.channel.send("❌ Please provide JavaScript code to evaluate.");

        try {
            // Execute the code string directly within the engine
            let evaled = eval(code);
            
            // Handle unresolved promises smoothly
            if (evaled instanceof Promise) evaled = await evaled;

            // Inspect the object result safely
            let output = util.inspect(evaled, { depth: 0 });

            // Hide your bot token in case you print something like client
            output = output.replace(client.token, '[TOKEN HIDDEN]');

            // Send back the response safely within character limits
            message.channel.send(`\`\`\`js\n${output.slice(0, 1900)}\n\`\`\``);
        } catch (err) {
            message.channel.send(`❌ **Error:** \`\`\`js\n${err}\n\`\`\``);
        }
    }
};
