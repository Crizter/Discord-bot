import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../database/db.js';

// Map to store active timers for each user
const userTimers = new Map();

export const pomodoroCommands = [
    new SlashCommandBuilder()
        .setName('pomodoro-set')
        .setDescription('Set Pomodoro session time, break time, and number of sessions')
        .addIntegerOption(option =>
            option.setName('session-time')
                .setDescription('Time for each Pomodoro session in minutes')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('break-time')
                .setDescription('Time for each break in minutes')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('number-of-sessions')
                .setDescription('Number of sessions to complete')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('session-info')
        .setDescription('Show the current Pomodoro session info'),
    new SlashCommandBuilder()
        .setName('stop-session')
        .setDescription('Stop the current Pomodoro session'),
    new SlashCommandBuilder()
        .setName('pomodoro-edit')
        .setDescription('Edit the Pomodoro session time, break time, or number of sessions')
        .addStringOption(option =>
            option.setName('field')
                .setDescription('The field to edit: session-time, break-time, or number-of-sessions')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('value')
                .setDescription('The new value')
                .setRequired(true)
        ),
    // new SlashCommandBuilder()
    //     .setName('timer')
    //     .setDescription('Start a timer that increments every minute')
].map(command => command.toJSON());

export async function handlePomodoro(interaction) {
    if (!interaction.isCommand()) return;

    const { commandName, user, guild } = interaction;
    const userId = user.id;
    const serverId = guild.id;

    if (commandName === 'pomodoro-set') {
        const sessionTime = interaction.options.getInteger('session-time');
        const breakTime = interaction.options.getInteger('break-time');
        const numberOfSessions = interaction.options.getInteger('number-of-sessions');

        try {
            await pool.query(
                `INSERT INTO pomodoro_sessions (user_id, server_id, session_time, break_time, total_sessions, current_session) 
                 VALUES ($1, $2, $3, $4, $5, 0) 
                 ON CONFLICT (user_id, server_id) DO UPDATE 
                 SET session_time = $3, break_time = $4, total_sessions = $5, current_session = 0`,
                [userId, serverId, sessionTime, breakTime, numberOfSessions]
            );

            const embed = new EmbedBuilder()
                .setTitle('🍅 Pomodoro Session Configured')
                .setDescription(`**Session Time:** \`${sessionTime}\` minutes\n**Break Time:** \`${breakTime}\` minutes\n**Number of Sessions:** \`${numberOfSessions}\``)
                .setColor('#00FF00')
                .setThumbnail('https://i.imgur.com/zVf7eUv.png')
                .addFields(
                    { name: '🔄 Current State', value: 'Idle', inline: true },
                    { name: '⏰ Estimated Completion', value: `<t:${Math.floor((Date.now() + (sessionTime + breakTime) * numberOfSessions * 60 * 1000) / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Stay focused and productive!', iconURL: 'https://i.imgur.com/xRbQVGs.png' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            startPomodoro(userId, serverId, sessionTime, breakTime, numberOfSessions, interaction);

        } catch (error) {
            console.error('Error setting Pomodoro session:', error);
            interaction.reply('Failed to set Pomodoro session. Please try again later.');
        }
    } else if (commandName === 'session-info') {
        try {
            const result = await pool.query(
                'SELECT * FROM pomodoro_sessions WHERE user_id = $1 AND server_id = $2',
                [userId, serverId]
            );

            if (result.rows.length > 0) {
                const session = result.rows[0];
                const progress = (session.current_session / session.total_sessions) * 100;

                const currentTime = Date.now();
                const sessionEndTime = new Date(session.time_remaining).getTime();
                const timeRemaining = sessionEndTime > currentTime 
                    ? Math.floor((sessionEndTime - currentTime) / 1000) 
                    : 0;

                const timeRemainingFormatted = timeRemaining > 0
                    ? `<t:${Math.floor(currentTime / 1000) + timeRemaining}:R>` 
                    : 'No ongoing session';

                const embed = new EmbedBuilder()
                    .setTitle('🍅 Pomodoro Session Info')
                    .setDescription(`**Session Time:** \`${session.session_time}\` minutes\n**Break Time:** \`${session.break_time}\` minutes\n**Total Sessions:** \`${session.total_sessions}\`\n**Current Session:** \`${session.current_session}\`\n**Progress:** \`${progress.toFixed(2)}%\``)
                    .setColor('#0000FF')
                    .setThumbnail('https://i.imgur.com/zVf7eUv.png')
                    .addFields(
                        { name: '🔄 Session State', value: `\`${session.current_state}\``, inline: true },
                        { name: '⏰ Time Remaining', value: timeRemainingFormatted, inline: true }
                    )
                    .setFooter({ text: 'Keep up the good work!', iconURL: 'https://i.imgur.com/xRbQVGs.png' })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else {
                interaction.reply('No Pomodoro session found.');
            }
        } catch (error) {
            console.error('Error fetching Pomodoro session info:', error);
            interaction.reply('Failed to fetch Pomodoro session info. Please try again later.');
        }
    } else if (commandName === 'stop-session') {
        try {
            await pool.query(
                'DELETE FROM pomodoro_sessions WHERE user_id = $1 AND server_id = $2',
                [userId, serverId]
            );

            const embed = new EmbedBuilder()
                .setTitle('⛔ Pomodoro Session Stopped')
                .setDescription('Your Pomodoro session has been stopped, and all related data has been removed. Feel free to start a new session whenever you are ready!')
                .setColor('#FF0000')
                .setThumbnail('https://i.imgur.com/y8d4l6Q.png')
                .setFooter({ text: 'We’ll be here when you’re ready to start again!', iconURL: 'https://i.imgur.com/xRbQVGs.png' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            if (userTimers.has(userId)) {
                clearTimeout(userTimers.get(userId));
                userTimers.delete(userId);
            }
        } catch (error) {
            console.error('Error stopping Pomodoro session:', error);
            interaction.reply('Failed to stop Pomodoro session. Please try again later.');
        }
    } else if (commandName === 'pomodoro-edit') {
        const field = interaction.options.getString('field');
        const value = interaction.options.getInteger('value');

        const fieldsMap = {
            'session-time': 'session_time',
            'break-time': 'break_time',
            'number-of-sessions': 'total_sessions'
        };

        if (!fieldsMap[field]) {
            return interaction.reply('Invalid field. Use session-time, break-time, or number-of-sessions.');
        }

        try {
            await pool.query(
                `UPDATE pomodoro_sessions SET ${fieldsMap[field]} = $3 WHERE user_id = $1 AND server_id = $2`,
                [userId, serverId, value]
            );

            await interaction.reply(`Pomodoro session ${field} updated to ${value} minutes.`);
        } catch (error) {
            console.error('Error updating Pomodoro session:', error);
            interaction.reply('Failed to update Pomodoro session. Please try again later.');
        }
    }
    //  else if (commandName === 'timer') {
    //     startTimer(userId, serverId, interaction);
    // }
}

// Helper function to start the Pomodoro session
async function startPomodoro(userId, serverId, sessionTime, breakTime, numberOfSessions, interaction) {
    let currentSession = 0;

    const sessionTimer = setInterval(async () => {
        currentSession++;

        if (currentSession > numberOfSessions) {
            clearInterval(sessionTimer);
            await pool.query(
                'DELETE FROM pomodoro_sessions WHERE user_id = $1 AND server_id = $2',
                [userId, serverId]
            );
            await interaction.followUp(`<@${userId}>, Pomodoro sessions are over!`);
            return;
        }

        const sessionEndTime = new Date(Date.now() + sessionTime * 60 * 1000);
        await pool.query(
            `UPDATE pomodoro_sessions SET current_session = $3, time_remaining = $4 WHERE user_id = $1 AND server_id = $2`,
            [userId, serverId, currentSession, sessionEndTime]
        );

        await interaction.followUp(`<@${userId}>, Session ${currentSession}/${numberOfSessions} started! Focus!`);

        setTimeout(async () => {
            await interaction.followUp(`<@${userId}>, Session ${currentSession} over! Take a break!`);
        }, sessionTime * 60 * 1000);

    }, (sessionTime + breakTime) * 60 * 1000);

    userTimers.set(userId, sessionTimer);
}

// Helper function to start the simple timer
function startTimer(userId, serverId, interaction) {
    const timer = setInterval(async () => {
        try {
            const currentTime = new Date(Date.now() + 60 * 1000); // Increment every minute
            await pool.query(
                `UPDATE pomodoro_sessions SET time_remaining = $3 WHERE user_id = $1 AND server_id = $2`,
                [userId, serverId, currentTime]
            );
            interaction.followUp(`<@${userId}>, Timer incremented by 1 minute.`);
        } catch (error) {
            console.error('Error updating timer:', error);
        }
    }, 60 * 1000); // 1 minute interval

    userTimers.set(userId, timer);
}
