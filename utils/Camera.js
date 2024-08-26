import { SlashCommandBuilder, ChannelType, GatewayIntentBits } from 'discord.js';

const channelStorage = new Map(); // Stores the voice channel IDs per server
const userTimers = new Map(); // Stores timers for users
const messageChannelStorage = new Map(); // Stores text channel IDs for sending messages

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
        .setName('notify-user')  // Renamed to follow proper naming conventions
        .setDescription('Sends a DM to members if the camera is disabled.')
].map(command => command.toJSON());

export function handleInteraction(interaction) {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'add-cam-channel') {
        const channel = interaction.options.getChannel('channel');

        if (channel.type === ChannelType.GuildVoice) {
            const serverId = interaction.guild.id;

            if (!channelStorage.has(serverId)) {
                channelStorage.set(serverId, new Set());
            }

            const channels = channelStorage.get(serverId);
            channels.add(channel.id);
            channelStorage.set(serverId, channels);

            interaction.reply(`Voice channel ${channel.name} added to mandatory camera list.`);
        } else {
            interaction.reply('Please select a valid voice channel.');
        }
    } else if (commandName === 'enable-tracking') {
        interaction.reply('Camera tracking enabled for stored channels.');
    } else if (commandName === 'set-message-channel') {
        const channel = interaction.options.getChannel('channel');

        if (channel.type === ChannelType.GuildText) {
            const serverId = interaction.guild.id;
            messageChannelStorage.set(serverId, channel.id);
            interaction.reply(`Message channel set to ${channel.name}.`);
        } else {
            interaction.reply('Please select a valid text channel.');
        }
    }
}

export function handleVoiceStateUpdate(oldState, newState) {
    const serverId = newState.guild.id;
    const voiceChannels = channelStorage.get(serverId) || new Set();
    // const messageChannelId = messageChannelStorage.get(serverId);
    const messageChannelId = "1114596454623883287"

    if (oldState.channelId !== newState.channelId) {
        if (oldState.channelId && voiceChannels.has(oldState.channelId)) {
            // User left a tracked voice channel
            clearTimeout(userTimers.get(oldState.id));
            userTimers.delete(oldState.id);
        }

        if (newState.channelId && voiceChannels.has(newState.channelId)) {
            // User joined a tracked voice channel
            const timer = setTimeout(() => {
                const member = newState.channel.members.get(newState.id);
                if (member) {
                    member.voice.disconnect();
                    
                    // Sending a message to the text channel
                    const textChannel = newState.guild.channels.cache.get(messageChannelId);
                    if (textChannel && textChannel.isTextBased()) {
                        textChannel.send(`Hey <@${newState.id}>, please turn on your camera!`);
                    } else {
                        console.error('Text channel not found or not valid.');
                    }
                } else {
                    console.error('User not found in the voice channel.');
                }
            }, 60000); // 1 minute

            userTimers.set(newState.id, timer);
        }
    }
}
