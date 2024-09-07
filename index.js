import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { cameraCommands, handleInteraction, handleVoiceStateUpdate } from './utils/Camera.js';
import { connectDB, pool } from './database/db.js';
import { statsCommands, handleStats } from './utils/TimeActivity.js';
import { handleVoiceTime } from './utils/TimeActivity.js';
import { scheduleCronJobs } from './config/scheduleStats.js';
import { handlePomodoro, pomodoroCommands } from './utils/Pomodoro.js';
import { listenReaction, handleReactions, reactionCommands, registerOldReactions } from './utils/Reactions.js';

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Create a new client instance with necessary intents
export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Register slash commands
async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [...cameraCommands, ...statsCommands, ...pomodoroCommands, ...reactionCommands] });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering application (/) commands:', error);
    }
}

// Event handler for when the client is ready
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Connect to the database and register old reactions
    try {
        await connectDB();
        await registerOldReactions();
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    }
});

// Event handler for interaction events (e.g., slash commands)
client.on(Events.InteractionCreate, async interaction => {
    try {
        await handleInteraction(interaction);
        await handleStats(interaction);
        await handlePomodoro(interaction);
        await handleReactions(interaction);
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

// Event handler for reactions (add and remove)
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    await listenReaction(reaction, user, true);  // Handle reaction added
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    await listenReaction(reaction, user, false); // Handle reaction removed
});

// Event handler for voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const serverId = newState.guild.id;
    const userId = newState.id;

    try {
        console.log('Voice state update for user:', userId);
        await handleVoiceStateUpdate(oldState, newState);
        await handleVoiceTime(serverId, userId, oldState, newState);
    } catch (error) {
        console.error('Error handling voice state update:', error);
    }
});

// Event handler for basic message creation (e.g., "hello" message)
client.on(Events.MessageCreate, msg => {
    if (msg.content.toLowerCase() === 'hello') {
        msg.reply(`Hello, ${msg.author.username}!`);
    }
});

// Start the bot
async function main() {
    try {
        await registerCommands();
        await client.login(TOKEN);
        scheduleCronJobs(); // Schedule jobs after the bot logs in
    } catch (error) {
        console.error('Error during bot startup:', error);
    }
}

main();
