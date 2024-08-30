import { pool } from "../database/db.js";
import cron from 'node-cron' ;

// RESET THE DAILY STATS AT MIDNIGHT 

export const scheduleCronJobs = () => { 

    
    cron.schedule('0 0 * * *', async() => { 
        try {
            await pool.query('UPDATE timeactivity SET daily_hours = 0 ') ; 
            console.log('Daily stats updated successfully.');
        } catch (error) {
            console.error(
                'Error resetting the daily stats.', error 
            );
            
        }
    });
    
    // Reset weekly stats at midnight on Monday
    cron.schedule('0 0 * * MON', async () => {
        try {
            await pool.query('UPDATE timeactivity SET weekly_hours = 0');
            console.log('Weekly stats reset successfully.');
        } catch (error) {
            console.error('Error resetting weekly stats:', error);
        }
    });
    
    // Reset monthly stats at midnight on the 1st day of the month
    cron.schedule('0 0 1 * *', async () => {
        try {
            await pool.query('UPDATE timeactivity SET monthly_hours = 0');
            console.log('Monthly stats reset successfully.');
        } catch (error) {
            console.error('Error resetting monthly stats:', error);
        }
    });
}

