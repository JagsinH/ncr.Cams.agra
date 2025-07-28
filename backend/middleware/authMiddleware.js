
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');


const protect = asyncHandler(async (req, res, next) => {
    let token;
    console.log('\n--- PROTECT Middleware STARTED ---'); 

    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            
            token = req.headers.authorization.split(' ')[1];
            console.log('  1. Token extracted from header:', token ? 'YES' : 'NO');
            

            
            console.log('  2. JWT_SECRET (partial):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 8) + '...' : 'UNDEFINED!');

            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('  3. Token SUCCESSFULLY DECODED. Payload ID:', decoded.id); 

            
            const userResult = await query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
            const user = userResult.rows[0];

            if (!user) {
                console.error('  4. ERROR: User not found in DB for decoded ID:', decoded.id);
                
                return res.status(401).json({ message: 'Not authorized, user data not found in database for this token.' });
            }

            
            req.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            console.log(`  5. User attached to request: ${req.user.name} (Role: ${req.user.role})`);

            next(); 

        } catch (error) {
            
            console.error('--- PROTECT Middleware CATCH BLOCK ERROR ---');
            console.error('  ERROR Type:', error.name); 
            console.error('  ERROR Message:', error.message); 
            console.error('  ERROR Stack:', error.stack); 

            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired.' }); 
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, invalid token (signature mismatch or malformed token).' }); 
            } else {
                return res.status(401).json({ message: 'Not authorized, token verification failed.' }); 
            }
        }
    } else {
    
        console.warn('--- PROTECT Middleware WARNING: No "Bearer" token in Authorization header. ---');
    
        return res.status(401).json({ message: 'Not authorized, no token provided in header.' });
    }
    console.log('--- PROTECT Middleware END ---'); 
});


const authorize = (...roles) => { 
    return (req, res, next) => {
        console.log('\n--- AUTHORIZE Middleware STARTED ---');
        const userRole = req.user ? String(req.user.role).trim() : 'N/A'; 

        const allowedRoles = roles.flat().map(role => String(role).trim()); 

        console.log('  Auth Check: Required roles for this route:', allowedRoles);
        console.log('  Auth Check: User role from req.user (trimmed):', userRole);


        console.log('  Type of userRole:', typeof userRole, 'Value:', `'${userRole}'`);
        console.log('  Type of allowedRoles:', typeof allowedRoles, 'Value:', allowedRoles); 
        console.log('  Does allowedRoles include userRole?', allowedRoles.includes(userRole));

        if (!req.user || !req.user.role || !allowedRoles.includes(userRole)) {
            console.warn(`  AUTHORIZE FAILED: User role '${userRole}' is not authorized for required roles: ${allowedRoles.join(', ')}.`);
            return res.status(403).json({ message: 'Not authorized to access this route. Insufficient permissions.' });
        }
        console.log('  Authorization successful. User role matches required roles.');
        next();
        console.log('--- AUTHORIZE Middleware END ---');
    };
};

module.exports = { protect, authorize };