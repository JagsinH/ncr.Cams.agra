
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getSupervisorComplaints,
    assignComplaint,
    reviewAndFinalizeComplaint,
    getTechnicians,
    getComplaintReport
} = require('../controllers/supervisorController');

router.route('/complaints')
    .get(protect, authorize('admin', 'supervisor'), getSupervisorComplaints); 

router.route('/complaints/:id/assign')
    .put(protect, authorize('admin', 'supervisor'), assignComplaint); 

router.route('/complaints/:id/review')
    .put(protect, authorize('admin', 'supervisor'), reviewAndFinalizeComplaint); 

router.route('/technicians')
    .get(protect, authorize('admin', 'supervisor'), getTechnicians); 


router.get('/complaints/report/excel', protect, authorize(['admin', 'supervisor']), getComplaintReport);    
module.exports = router;