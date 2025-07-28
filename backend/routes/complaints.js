
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createComplaint, getUserComplaints, getComplaintById } = require('../controllers/complaintsController');


router.post('/', protect, createComplaint); 
router.get('/my-complaints', protect, getUserComplaints); 


router.get('/track/:id', getComplaintById);

module.exports = router;