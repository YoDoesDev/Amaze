const { db } = require('../../utils/database.js');
const { setPrefix } = require('../../utils/prefixManager.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("prefix")
    .setDescription("Sets a new server prefix")
    .addStringOption(option => {
        return option
        .setName("prefix")
        .setDescription("The new prefix for the server")
        .setRequired(true)
    }), 
    category: 'Config',
    aliases: ['prefix'],
    cooldown: 5,

    async execute(interaction) { 
        // 1. Permission Check
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.editReply('You need Administrator permission.');
        }

        const newPrefix = interaction.options.getString("prefix").trim();

        // 2. Validation
        if(!newPrefix || newPrefix.length == 0){
            return interaction.editReply("Please type a new prefix");
        }

        if (newPrefix.length > 5) {
            return interaction.editReply({ 
                content: 'Prefix must be 5 characters or less.', 
                ephemeral: true
            });
        }

        try {
            // 3. Update Logic (Synchronous & Immediate)
            db.prepare(`
                INSERT INTO guild_settings (guildid, prefix)
                VALUES (?, ?)
                ON CONFLICT(guildid)
                DO UPDATE SET prefix = excluded.prefix
            `).run(interaction.guild.id, newPrefix);

            setPrefix(interaction.guild.id, newPrefix);

            interaction.editReply(`Server prefix changed to \`${newPrefix}\``);

        } catch (err) {
            console.error("Prefix Edit Error:", err);
            if(interaction.isDeferred){
                interaction.editReply({
                    content: 'An error occurred while updating the database.'
                });
            } else{
                interaction.reply({
                    content: 'An error occurred while updating the database.'
                });
            }
        }
    }
};
