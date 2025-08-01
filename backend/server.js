// Only load dotenv in development mode
if (process.env.NODE_ENV !== 'production') {
    // Adjust path if your .env is directly in 'backend' folder
    require('dotenv').config({ path: path.resolve(__dirname, '.env') }); 
}

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const { connectDB } = require("./config/db"); // Assuming connectDB is exported

const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const adminUserRoutes = require('./routes/adminUserRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const userRoutes = require('./routes/userRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// --- Middleware ---
// Body parser for JSON
app.use(bodyParser.json());
app.use(express.json()); // express.json() is preferred over bodyParser.json() for newer Express versions
app.use(express.urlencoded({ extended: false }));


// CORS Configuration: VERY IMPORTANT for deployed frontend
const allowedOrigins = [
    'http://localhost:3000', // Common React dev server
    'http://localhost:5173', // Common Vite dev server
    'http://localhost:8000', // Your HTML/JS local dev server if different
    'http://127.0.0.1:3000', // Another common localhost variant
];

// Add the production frontend URL from environment variable
if (process.env.WEB_APP_URL) {
    allowedOrigins.push(process.env.WEB_APP_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl requests)
        // and requests from allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}. WEB_APP_URL: ${process.env.WEB_APP_URL}`;
            console.error(msg); // Log the rejected origin for debugging
            callback(new Error(msg), false);
        }
    },
    // If you are sending cookies or authorization headers (like JWT in Authorization header)
    // you might need to enable credentials.
    credentials: true,
}));


// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/users', userRoutes);

// Catch-all for API routes not found
app.use('/api', (req, res, next) => {
    res.status(404).json({ message: 'API Route Not Found' });
});


// --- Serve Frontend Static Files (CONDITIONAL - ONLY IF YOU ARE NOT USING RENDER STATIC SITE) ---
// If you are deploying frontend as a separate Render Static Site, REMOVE or COMMENT OUT this block.
// If your HTML/CSS/JS frontend is served by this backend, keep this.
// Assuming your 'frontend' folder is one level up from 'backend/server.js'
app.use(express.static(path.join(__dirname, '../frontend'))); 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'login.html')); 
});
// app.get('*', (req, res) => { // Catch-all for frontend routes, send index.html
//     res.sendFile(path.join(__dirname, '../frontend', 'index.html')); 
// });


// --- Error Handling ---
// This middleware should be last among your regular app.use() calls
app.use(errorHandler);

// Generic error handler (should be after all other middleware and routes)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the full stack trace for debugging
    res.status(500).send('Something broke on the server!');
});


// --- Server Startup ---
// Connect to DB and then start the server
const startServer = async () => {
    try {
        await connectDB(); // Ensure DB connection is established first
        const PORT = process.env.PORT || 5000; // Render uses PORT=10000, use 5000 for local dev default
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Failed to start server due to database connection error:', error);
        process.exit(1); // Exit if DB connection fails at startup
    }
};

startServer(); // Call the async function to start the server

// Debugging line for JWT_SECRET
console.log(`[server.js] JWT_SECRET loaded: "${process.env.JWT_SECRET ? 'YES' : 'NO (check Render env or .env file)'}"`);