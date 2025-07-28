const { Pool } = require('pg');
require('dotenv').config();

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: './backend/.env' }); 
}





const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    connectionString: process.env.DATABASE_URL,
    ssl:process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const connectDB = async () => {
    try {
        await pool.connect();
        console.log('PostgreSQL connected...');

          
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
    
        await pool.query(`
            DO $$ BEGIN
                ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires BIGINT;
            END $$;
        `);
        console.log('Database schema checked/updated.');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1); 
    }
};

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    connectDB,
};