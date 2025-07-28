const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // Add bcryptjs if you're creating a default admin here
const path = require('path'); // For path.resolve if you use it in dotenv

// --- Centralize and Conditionally Load dotenv ---
if (process.env.NODE_ENV !== 'production') {
    // Make sure this path is correct relative to where db.js is executed.
    // If db.js is in backend/config, and .env is in backend/, it's just '../.env'
    // If .env is in the root of your project, it's '../../.env' if db.js is two levels deep.
    // Given your project structure, let's assume .env is in the 'backend' folder
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); 
    // Or if .env is at the root of your entire project:
    // require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 
}
// For safety, let's just stick to the single path for development loading.
// The primary goal is that dotenv should *not* load any .env in production.

// --- Pool Configuration: Use connectionString ONLY ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render provides this in production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Required for Render
});

const connectDB = async () => {
    try {
        await pool.query('SELECT 1'); // More robust check for connection
        console.log('PostgreSQL Connected successfully!');

        // --- CREATE users table with correct password_hash column ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL, -- CORRECTED: changed 'password' to 'password_hash'
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Users table checked/created.');

        // --- ALTER users table for password reset columns with correct data types ---
        await pool.query(`
            DO $$ BEGIN
                ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE; -- CORRECTED: changed BIGINT to TIMESTAMP WITH TIME ZONE
            END $$;
        `);
        console.log('Password reset columns checked/added to users table.');

        // --- Create complaints table (assuming it's needed) ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS complaints (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Add ON DELETE CASCADE for better integrity
                subject VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Complaints table checked/created.');


        // --- Optional: Create a default admin user if none exists ---
        const adminEmail = 'admin@example.com'; // Use a specific admin email
        const adminExists = await pool.query('SELECT id FROM users WHERE email = $1 AND role = $2', [adminEmail, 'admin']);
        
        if (adminExists.rows.length === 0) {
            const defaultAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMe123!'; // Get from env or use a strong default
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, salt);
            
            await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                ['Default Admin', adminEmail, hashedPassword, 'admin']
            );
            console.log(`Default admin user created: ${adminEmail} (password: ${defaultAdminPassword})`);
            console.warn('IMPORTANT: Change default admin password immediately after first login in production!');
        }


    } catch (err) {
        console.error('Database connection or schema creation error:', err);
        process.exit(1); // Exit process if DB connection or schema creation fails
    }
};

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    connectDB,
};