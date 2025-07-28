const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');

router.get('/', adminUserController.getAllUsers); 
router.put('/:id/role', adminUserController.updateUserRole); 
router.delete('/:id', adminUserController.deleteUser); 

module.exports = router;