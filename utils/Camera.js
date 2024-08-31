import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import { pool } from '../database/db.js';

const userTimers = new Map();

export const cameraCommands = [
    new SlashCommandBuilder()
        .setName('add-cam-channel')
        .setDescription('Add voice channels where you want the mandatory camera on.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The voice channel to add')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        ),
    new SlashCommandBuilder()
        .setName('enable-tracking')
        .setDescription('Enable tracking of camera channel usage'),
    new SlashCommandBuilder()   
        .setName('set-message-channel')
        .setDescription('Set the text channel where the bot will send a message if a user does not have their camera on.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The text channel to send the message')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),
    new SlashCommandBuilder()
        .setName('notify-user')
        .setDescription('Sends a DM to members if the camera is disabled.')
].map(command => command.toJSON());

export async function handleInteraction(interaction) {
    if (!interaction.isCommand()) return;

    const { commandName, member } = interaction;

    // Permission check
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        return;
    }

    if (commandName === 'add-cam-channel') {
        const channel = interaction.options.getChannel('channel');
        const serverId = interaction.guild.id;

        if (channel.type === ChannelType.GuildVoice) {
            try {
                // Store the channel in the database
                await pool.query(
                    'INSERT INTO camera_channels (server_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [serverId, channel.id]
                );
                interaction.reply(`Voice channel ${channel.name} added to mandatory camera list.`);
            } catch (error) {
                console.error('Error adding channel to the database:', error);
                interaction.reply('There was an error adding the channel to the database.');
            }
        } else {
            interaction.reply('Please select a valid voice channel.');
        }
    } else if (commandName === 'enable-tracking') {
        const serverId = interaction.guild.id;
    
        try {
            // Check if the server already exists in the database
            const result = await pool.query('SELECT * FROM server WHERE server_id = $1', [serverId]);
    
            if (result.rows.length > 0) {
                // If the server exists, update the enable_tracking status
                await pool.query('UPDATE server SET enable_tracking = $2 WHERE server_id = $1', [serverId, true]);
            } else {
                // If the server does not exist, insert a new record
                await pool.query('INSERT INTO server (server_id, enable_tracking) VALUES ($1, $2)', [serverId, true]);
            }
    
            interaction.reply('Camera tracking enabled for stored channels.');
        } catch (error) {
            console.error('Error enabling tracking:', error);
            interaction.reply('Failed to enable camera tracking. Please try again later.');
        }
    } else if (commandName === 'set-message-channel') {
        const channel = interaction.options.getChannel('channel');
        const serverId = interaction.guild.id;

        if (channel.type === ChannelType.GuildText) {
            try {
                // Store the message channel in the database
                await pool.query(
                    'INSERT INTO message_channels (server_id, channel_id) VALUES ($1, $2) ON CONFLICT (server_id) DO UPDATE SET channel_id = $2',
                    [serverId, channel.id]
                );
                interaction.reply(`Message channel set to ${channel.name}.`);
            } catch (error) {
                console.error('Error setting message channel in the database:', error);
                interaction.reply('There was an error setting the message channel.');
            }
        } else {
            interaction.reply('Please select a valid text channel.');
        }
    } else if (commandName === 'notify-user') {
        // Your notify-user command logic here
    }
}

export async function handleVoiceStateUpdate(oldState, newState) {
    const serverId = newState.guild.id;

    try {
        // Fetch tracked channels and message channel from the database
        const voiceChannelsResult = await pool.query(
            'SELECT channel_id FROM camera_channels WHERE server_id = $1',
            [serverId]
        );
        const messageChannelResult = await pool.query(
            'SELECT channel_id FROM message_channels WHERE server_id = $1',
            [serverId]
        );

        const voiceChannels = new Set(voiceChannelsResult.rows.map(row => row.channel_id));
        const messageChannelId = messageChannelResult.rows[0]?.channel_id;

        if (oldState.channelId !== newState.channelId) {
            if (oldState.channelId && voiceChannels.has(oldState.channelId)) {
                clearTimeout(userTimers.get(oldState.id));
                userTimers.delete(oldState.id);
            }

            if (newState.channelId && voiceChannels.has(newState.channelId)) {
                const timer = setTimeout(async () => {
                    const member = newState.channel.members.get(newState.id);
                    if (member) {
                        member.voice.disconnect();

                        if (messageChannelId) {
                            const textChannel = newState.guild.channels.cache.get(messageChannelId);
                            if (textChannel && textChannel.isTextBased()) {
                                await textChannel.send(`Hey <@${newState.id}>, please turn on your camera!`);
                            }
                        }
                    }
                }, 10000); // 10 seconds

                userTimers.set(newState.id, timer);
            }
        }
    } catch (error) {
        console.error('Error handling voice state update:', error);
    }
}
