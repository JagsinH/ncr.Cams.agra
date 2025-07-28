
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, email, role) => {
    return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
        expiresIn: '1h', 
    });
};


const getUserProfile = async (req, res) => {
    try {
        
        const userResult = await pool.query(
            'SELECT id, name, email, role FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};


const updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, email, currentPassword, newPassword } = req.body;

    try {
        const userResult = await pool.query(
            'SELECT id, name, email, password, role FROM users WHERE id = $1',
            [userId]
        );
        let user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let query = 'UPDATE users SET ';
        const params = [];
        let paramIndex = 1;
        const updates = [];
        let newEmail = user.email; 
        let newName = user.name; 

        
        if (name && name !== user.name) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
            newName = name;
        }

        
        if (email && email !== user.email) {
            
            const emailExists = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, userId]);
            if (emailExists.rows.length > 0) {
                return res.status(400).json({ message: 'This email is already registered by another user.' });
            }
            updates.push(`email = $${paramIndex++}`);
            params.push(email);
            newEmail = email;
        }

        
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password.' });
            }

            
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Incorrect current password.' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
            }

            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            updates.push(`password = $${paramIndex++}`);
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(200).json({ message: 'No changes detected to update.' });
        }

        query += updates.join(', ');
        query += ` WHERE id = $${paramIndex++} RETURNING id, name, email, role`;
        params.push(userId);

        const updatedUserResult = await pool.query(query, params);
        const updatedUser = updatedUserResult.rows[0];

       
        let token = null;
        if (newPassword || (email && email !== user.email)) {
             token = generateToken(updatedUser.id, updatedUser.email, updatedUser.role);
        }

        res.status(200).json({
            message: 'Profile updated successfully!',
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            token: token 
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
};