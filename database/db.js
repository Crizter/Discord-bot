import pg from 'pg' ; 

import dotenv from 'dotenv' ; 

// ADD ENV 
dotenv.config() ; 

// SETUP DATABASE 
// FOR PRODUCTION 

const {Pool} = pg ; 
export const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

export const connectDB = async() => {
    try {
        await pool.connect() ;
        console.log('Database connected successfully.');
    } catch (error) {
        console.log(error);
        throw error ; 
    }
}
// GET THE DAILY NUMBER OF HOURS BY USER 
export const getDailyHours = async (serverId, userId) => {
    console.log('getDailyHours', serverId, userId);
    
    if (!serverId || !userId) {
        return null;  // Return null if parameters are missing
    }

    try {
        const result = await pool.query(
            'SELECT daily_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );

        if (result.rows.length === 0) {
            console.log('No data found');
            return null;  // Return null if no data is found
        }
        
        const data = result.rows[0].daily_hours;
        return data;

    } catch (error) {
        console.error('Error in getDailyHours', error);
        throw error;  // Re-throw the error to handle it elsewhere if needed
    }
};



// GET WEEKLY NUMBER OF HOURS BY USER
export const getWeeklyHours = async (serverId, userId) => {
    console.log('weeklyhours', serverId, userId);
    if (!serverId || !userId) {
        return null;  // Return null if parameters are missing
    }

    try {
        const result = await pool.query(
            'SELECT weekly_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );

        if (result.rows.length === 0) {
            console.log('No data found');
            return null;  // Return null if no data is found
        }

        const data = result.rows[0].weekly_hours;
        return data;

    } catch (error) {
        console.error('Error in getWeeklyHours', error);
        throw error;  // Re-throw the error to handle it elsewhere if needed
    }
};

// GET MONTHLY HOURS OF A USER
export const getMonthlyHours = async (serverId, userId) => {
    console.log('monthly hours', serverId, userId);
    if (!serverId || !userId) {
        return null;  // Return null if parameters are missing
    }

    try {
        const result = await pool.query(
            'SELECT monthly_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );

        if (result.rows.length === 0) {
            console.log('No data found');
            return null;  // Return null if no data is found
        }

        const data = result.rows[0].monthly_hours;
        return data;

    } catch (error) {
        console.error('Error in getMonthlyHours', error);
        throw error;  // Re-throw the error to handle it elsewhere if needed
    }
};


// GET ALL TIME HOURS 

export const getAllTimeHours = async (serverId, userId) => {
    console.log('all time hours', serverId, userId);
    if (!serverId || !userId) {
        return null;  // Return null if parameters are missing
    }

    try {
        const result = await pool.query(
            'SELECT all_time_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );

        if (result.rows.length === 0) {
            console.log('No data found');
            return null;  // Return null if no data is found
        }

        const data = result.rows[0].all_time_hours;
        return data;

    } catch (error) {
        console.error('Error in all_time_hours', error);
        throw error;  // Re-throw the error to handle it elsewhere if needed
    }
};

// GET AVERAGE HOURS PER MONTH OF USER 

// GET AVERAGE HOURS PER MONTH OF USER
export const averageHoursPerDay = async (serverId, userId) => {
    console.log('average hours ', serverId, userId);
    if (!serverId || !userId) {
        return null;  // Return null if parameters are missing
    }

    try {
        const { rows: dailyRows } = await pool.query(
            'SELECT daily_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );
        const { rows: monthlyRows } = await pool.query(
            'SELECT monthly_hours FROM timeactivity WHERE server_id = $1 AND user_id = $2',
            [serverId, userId]
        );

        if (dailyRows.length === 0 || monthlyRows.length === 0) {
            console.log('No data found');
            return null;  // Return null if no data is found
        }

        const dailyHours = dailyRows[0].daily_hours;
        const monthlyHours = monthlyRows[0].monthly_hours;

        // Assuming the number of days in the month is 30 
        const averageHours = monthlyHours / 30;

        return averageHours;

    } catch (error) {
        console.error('Error in averageHoursPerDay', error);
        throw error;  // Re-throw the error to handle it elsewhere if needed
    }
};

//  INSERT ACTIVITY DATA 

