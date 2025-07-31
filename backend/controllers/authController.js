// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { pool, query } = require('../config/db');
const crypto = require('crypto');

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY); // Correct Resend initialization

// Generate JWT token
const generateToken = (id, role, name) => {
    return jwt.sign({ id, role, name }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please enter all fields: name, email, and password.');
    }

    // Check if user exists
    const userExists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
        res.status(400);
        throw new Error('User with this email already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in DB
    const result = await query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        [name, email, hashedPassword, 'user'] // Default role 'user'
    );
    const newUser = result.rows[0];

    if (newUser) {
        res.status(201).json({
            message: 'User registered successfully!',
            token: generateToken(newUser.id, newUser.role, newUser.name),
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        res.status(400);
        throw new Error('Please enter both email and password.');
    }

    // Check for user email
    const userResult = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (user && (await bcrypt.compare(password, user.password_hash))) {
        res.json({
            message: 'Logged in successfully!',
            token: generateToken(user.id, user.role, user.name),
            user: { // Send back user object
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } else {
        res.status(400);
        throw new Error('Invalid credentials.');
    }
});

// @desc    Request password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    // Added logs for debugging as discussed previously
    console.log(`[requestPasswordReset] Received request for email: ${email}`); 

    if (!email) {
        console.log('[requestPasswordReset] Email is missing.'); 
        return res.status(400).json({ message: 'Please provide an email address' });
    }

    try {
        console.log('[requestPasswordReset] Querying database for user...'); 
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        // Always send a 200 OK response for security reasons, even if user not found.
        // This prevents email enumeration attacks.
        if (!user) {
            console.log(`[requestPasswordReset] User not found for email: ${email}. Sending generic success message.`); 
            return res.status(200).json({ message: 'If a matching account is found, a password reset link will be sent to your email.' });
        }

        console.log(`[requestPasswordReset] User found: ${user.email}. Generating token...`); 

        // Generate a reset token (using Node's crypto for stronger tokens)
        const resetToken = crypto.randomBytes(32).toString('hex');
        // --- FIX Applied here already in previous step ---
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now, converted to Date object
        console.log(`[requestPasswordReset] Reset token expires at (Date object): ${resetExpires}`);
        // --- End FIX ---

        // Save token and expiry to user in DB
        console.log('[requestPasswordReset] Updating user with reset token in DB...'); 
        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
            [resetToken, resetExpires, user.id] // Pass the Date object
        );
        console.log('[requestPasswordReset] User updated with reset token.'); 

        // Construct reset URL for frontend
        const resetUrl = `${process.env.WEB_APP_URL}/reset-password.html?token=${resetToken}`;
        console.log(`[requestPasswordReset] Reset URL generated: ${resetUrl}`); 

        // --- CORRECTED EMAIL SENDING WITH RESEND ---
        console.log(`[requestPasswordReset] Attempting to send email to: ${user.email} from: ${process.env.EMAIL_SENDER_ADDRESS}`); 
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_SENDER_ADDRESS, // Use the verified sender address for Resend
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <p>This link is valid for 1 hour.</p>
            `,
        });

        if (error) {
            console.error('[requestPasswordReset] Error sending email with Resend:', error); 
            return res.status(200).json({
                message: 'If a matching account is found, a password reset link has been sent to your email (email sending failed internally).'
            });
        }

        console.log('[requestPasswordReset] Password reset email sent successfully via Resend:', data); 

        res.status(200).json({ message: 'If a matching account is found, a password reset link has been sent to your email.' });

    } catch (error) {
        console.error('Error in requestPasswordReset:', error);
        res.status(500).json({ message: 'Server error during password reset request.' });
    }
};

// @desc    Reset user password
// @route   POST /api/auth/reset-password
// @access  Public

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    console.log(`[resetPassword] Received request to reset password.`); // LOG 1
    console.log(`[resetPassword] Token received: ${token ? 'Present' : 'Missing'}`); // LOG 2
    console.log(`[resetPassword] New password received: ${newPassword ? 'Present' : 'Missing'} (length: ${newPassword ? newPassword.length : 'N/A'})`); // LOG 3


    if (!token || !newPassword) {
        console.log('[resetPassword] Missing token or new password.'); // LOG 4
        return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
        console.log('[resetPassword] New password too short.'); // LOG 5
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        // Find user by reset token and check expiry
        console.log('[resetPassword] Querying database for user with token...'); // LOG 6
        const userResult = await pool.query(
            'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2',
            [token, new Date()] // Pass current time as a Date object for comparison
        );
        const user = userResult.rows[0];

        if (!user) {
            console.log('[resetPassword] User not found or token expired/invalid.'); // LOG 7
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        console.log(`[resetPassword] User found: ${user.email}. Hashing new password...`); // LOG 8

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log('[resetPassword] New password hashed successfully.'); // LOG 9

        // Update password and clear reset token fields
        console.log('[resetPassword] Updating user password in DB...'); // LOG 10
        await pool.query(
            'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );
        console.log('[resetPassword] Password updated and token cleared successfully.'); // LOG 11


        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error in resetPassword:', error); // LOG 12 - Catch-all error
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    requestPasswordReset,
    resetPassword,
};