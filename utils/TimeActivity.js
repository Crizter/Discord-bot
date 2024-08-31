import { EmbedBuilder, Events, SlashCommandBuilder } from "discord.js";
import { pool } from "../database/db.js";  // Make sure this path is correct
import { getDailyHours, getWeeklyHours, getMonthlyHours, getAllTimeHours, averageHoursPerDay } from "../database/db.js"
import moment from 'moment'; // For date manipulation
// CREATE EMBED
const createTimeActivityEmbed = async (serverId, userId) => {
    const dailyHours = await getDailyHours(serverId, userId) || 0;
    const weeklyHours = await getWeeklyHours(serverId, userId) || 0;
    const monthlyHours = await getMonthlyHours(serverId, userId) || 0;
    const allTimeHours = await getAllTimeHours(serverId, userId) || 0;
    const avgHoursPerDay = await averageHoursPerDay(serverId, userId) || 0;

    const dailyHoursToPrecision = `${dailyHours.toPrecision(2)}h`;
    const weeklyHoursToPrecision = `${weeklyHours.toPrecision(2)}h`;
    const monthlyHoursToPrecision = `${monthlyHours.toPrecision(2)}h`;
    const allTimeHoursToPrecision = `${allTimeHours.toPrecision(2)}h`;
    const avgHoursPerDayToPrecision = `${avgHoursPerDay.toPrecision(2)}h`;


    return new EmbedBuilder()
    .setColor('#5865F2') // A vibrant color for the embed
    .setTitle('📊 Personal Study Statistics')
    .setDescription('Here is a summary of your study activity:')
    .addFields(
        { name: '🗓️ Daily', value: `**${dailyHoursToPrecision}**`, inline: true },
        { name: '📅 Weekly', value: `**${weeklyHoursToPrecision}**`, inline: true },
        { name: '📆 Monthly', value: `**${monthlyHoursToPrecision}**`, inline: true },
        { name: '🏅 All-time', value: `**${allTimeHoursToPrecision}**`, inline: true },
        { name: '\u200B', value: '\u200B' }, // Empty line for spacing
        { name: '⏳ Avg. Time (Monthly)', value: `**${avgHoursPerDayToPrecision}**`, inline: true },
        { name: '🔥 Longest Streak', value: '**N/A**', inline: true },
        { name: '✨ Current Streak', value: '**N/A**', inline: true },
    )
    .setThumbnail('https://your-thumbnail-url.png') // Replace with a relevant thumbnail image
    .setFooter({ text: 'Enrico Server', iconURL: 'https://discord.gg/enricostudyfamily' })
    .setTimestamp();

};


// COMMAND BUILDER
export const statsCommands = [
    new SlashCommandBuilder()
        .setName('study-stats')
        .setDescription('Shows your personal study statistics'),
    new SlashCommandBuilder()
        .setName('study-stats-of-user')
        .setDescription('Shows the study stats of another member.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('Select the member')
                .setRequired(true))
].map(command => command.toJSON());


// HANDLE STATS COMMAND 
export async function handleStats(interaction) {
    if (!interaction.isCommand()) return;

    const { commandName, guildId } = interaction;
    
    if (commandName === 'study-stats') {
        const userId = interaction.user.id;  // Correctly extract the user ID
        const embed = await createTimeActivityEmbed(guildId, userId);  // Pass the correct user ID
        await interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'study-stats-of-user') {
        const targetUser = interaction.options.getUser('target');
        const targetUserId = targetUser.id;
        const embed = await createTimeActivityEmbed(guildId, targetUserId);
        await interaction.reply({ embeds: [embed] });
    }
}

// HANDLE VOICE TIME 
export async function handleVoiceTime(serverId, userId, oldState, newState) {
    if (!serverId || !userId) return;

    try {
        console.log('handlevoice time ', userId);
        
        // User joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            const joinTime = new Date();

            // Insert or update the join time
            await pool.query(
                `INSERT INTO timeActivity (server_id, user_id, join_time) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (server_id, user_id) 
                 DO UPDATE SET join_time = EXCLUDED.join_time`,
                [serverId, userId, joinTime]
            );

        // User left a voice channel
        } else if (oldState.channelId && !newState.channelId) {
            const leaveTime = new Date();

            // Retrieve join time
            const result = await pool.query(
                `SELECT join_time FROM timeActivity 
                 WHERE server_id = $1 AND user_id = $2`,
                [serverId, userId]
            );

            const joinTime = result.rows[0]?.join_time;
            if (joinTime) {
                const timeSpent = (leaveTime - new Date(joinTime)) / (1000 * 60 * 60); // Time in hours

                // Calculate daily, weekly, monthly, and all-time times
                const currentDate = moment().format('YYYY-MM-DD');
                const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
                const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');

                // Update the total times in the database
                await pool.query(
                    `WITH updated AS (
                        UPDATE timeActivity
                        SET leave_time = $1,
                            daily_hours = COALESCE(daily_hours, 0) + $2,
                            weekly_hours = COALESCE(weekly_hours, 0) + $2,
                            monthly_hours = COALESCE(monthly_hours, 0) + $2,
                            all_time_hours = COALESCE(all_time_hours, 0) + $2
                        WHERE server_id = $3 AND user_id = $4
                        RETURNING *
                    )
                    INSERT INTO timeActivity (server_id, user_id, daily_hours, weekly_hours, monthly_hours, all_time_hours)
                    SELECT $3, $4, $2, $2, $2, $2
                    WHERE NOT EXISTS (SELECT 1 FROM updated)`,
                    [leaveTime, timeSpent, serverId, userId]
                );
            }
        }
    } catch (error) {
        console.error('Error handling voice time:', error);
    }
}
// // EVENT HANDLER FOR VOICE STATE UPDATE
// client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
//     const serverId = newState.guild.id;
//     const userId = newState.id;

//     try {
//         await handleVoiceTime(serverId, userId, oldState, newState);
//     } catch (error) {
//         console.error('Error handling voice state update:', error);
//     }
// });
