import { REST, Routes,Events, SlashCommandBuilder } from 'discord.js';
import { clientId, guildId, token } from './config';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'discord.js';
const commands = [] ; 

// New instance of rest module 
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
})
const rest = new REST().setToken(process.env.BOT_TOKEN);
