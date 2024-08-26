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



