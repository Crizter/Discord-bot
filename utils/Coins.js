import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { pool } from '../database/db.js'


new SlashCommandBuilder()
    .setName('Set coins of user')
    .setDescription('Sets the coins for user')
new SlashCommandBuilder()
    .setName('Reset coins')
    .setDescription('Resets coins of everyone  in the server.')
new SlashCommandBuilder() 
    .setName('Set coins for cam/screen-share')
    .setDescription('Adds bonus coins for the members who are turning the cam on or sharing the screen in voice channel.')


 