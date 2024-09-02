import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { cameraCommands, handleInteraction, handleVoiceStateUpdate } from './utils/Camera.js';
import { connectDB, pool } from './database/db.js';
import { statsCommands, handleStats } from './utils/TimeActivity.js';
import { handleVoiceTime } from './utils/TimeActivity.js';
import { scheduleCronJobs } from './config/scheduleStats.js';
import { handlePomodoro } from './utils/Pomodoro.js';
import { pomodoroCommands } from './utils/Pomodoro.js';

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Create a new client instance with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [...cameraCommands, ...statsCommands, ...pomodoroCommands] });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering application (/) commands:', error);
    }
}

// Event handler for when the client is ready
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Connect to the database
    try {
        await connectDB();
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    }
});

// Event handler for interaction events (e.g., slash commands)
client.on(Events.InteractionCreate, async interaction => {
    try {
        await handleInteraction(interaction);
        await handleStats(interaction);
        await handlePomodoro(interaction) ;
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

// Event handler for voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const serverId = newState.guild.id;
    const userId = newState.id;
   
    
    try {
      console.log('voice state udate', userId);
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

// Log in to Discord and start the bot
async function main() {
    try {
        await registerCommands();
        await client.login(TOKEN);
    } catch (error) {
        console.error('Error during bot startup:', error);
    }
}
scheduleCronJobs() ; 
main();
