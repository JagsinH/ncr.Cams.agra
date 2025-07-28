const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getTechnicianComplaints,
    updateComplaintStatusAndResponse 
} = require('../controllers/technicianController');


router.route('/complaints')
    .get(protect, authorize('technician'), getTechnicianComplaints);


router.route('/complaints/:id/update') 
    .put(protect, authorize('technician'), updateComplaintStatusAndResponse);

module.exports = router;