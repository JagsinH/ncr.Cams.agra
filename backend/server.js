
require('dotenv').config(); 

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth"); 
const complaintsRoutes = require("./routes/complaints"); 
const adminUserRoutes = require('./routes/adminUserRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const userRoutes = require('./routes/userRoutes'); 

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({origin:'https://ncr-cams-agra-y7kk.onrender.com'})); 
app.use(bodyParser.json()); 

connectDB();

app.use(express.static(path.join(__dirname, '../frontend')));
app.use("/api/auth", authRoutes); 
app.use("/api/complaints", complaintsRoutes); 
app.use('/api/admin', adminUserRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/users', userRoutes); 
app.use('/api', (req, res, next) => {
    res.status(404).json({ message: 'API Route Not Found' });
});


app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});


app.use(errorHandler);


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'login.html')); 
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log(`[server.js] JWT_SECRET loaded: "${process.env.JWT_SECRET ? 'YES' : 'NO (check .env file)'}"`);