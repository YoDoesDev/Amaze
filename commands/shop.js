const { EmbedBuilder } = require('discord.js');

// These IDs must match the columns in your inventory table exactly
const items = {
    "1": { 
        name: "PR Shield", 
        id: "pr_tp", 
        emoji: "🛡️", 
        price: 300, 
        desc: "Protects you from defamation for 24 hours.",
        isPerm: false 
    },
    "2": { 
        name: "Stock License", 
        id: "stocklic", 
        emoji: "📃", 
        price: 1200, 
        desc: "Unlock the ability to hold more than 20 total stocks.",
        isPerm: true 
    },
    "3": { 
        name: "Philosopher's Stone", 
        id: "pstone", 
        emoji: "💎", 
        price: 5000, 
        desc: "A legendary artifact. (Showcase item)",
        isPerm: true 
    },
    "4": { 
        name: "Vouch Doubler", 
        id: "dblv_tp", 
        emoji: "⏭️", 
        price: 150, 
        desc: "Double the rep and profit you give when vouching (Lasts 12h).",
        isPerm: false 
    },
    "5": { 
        name: "Defame Doubler", 
        id: "ddbl_tp", 
        emoji: "↘️", 
        price: 220, 
        desc: "Double the rep loss and profit damage when defaming (Lasts 12h).",
        isPerm: false 
    }
};

module.exports = {
    name: 'shop',
    description: 'View the items available for purchase in Amaze.',
    category: 'Economy',
    async execute(message, args) {
        const shopEmbed = new EmbedBuilder()
            .setTitle("🏪 Amaze Global Shop")
            .setColor("#FFD700")
            .setDescription("Invest in items to boost your reputation influence or protect your status!\nUse `!buy <code>` to purchase.")
            .setTimestamp();

        Object.keys(items).forEach(code => {
            const item = items[code];
            shopEmbed.addFields({
                name: `${item.emoji} ${item.name} (Code: ${code})`,
                value: `Price: **${item.price} Amash**\n*${item.desc}*`,
                inline: false
            });
        });

        message.reply({ embeds: [shopEmbed] });
    },
    items // Exporting this for buy.js to use
};
