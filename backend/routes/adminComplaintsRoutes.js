
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
router.get('/', protect(['supervisor']), async (req, res) => {
    console.log('Admin Backend: Fetching all complaints for supervisor.');
    try {
        const queryText = `
            SELECT
                c.id, c.subject, c.description, c.status, c.admin_comment,
                c.created_at, c.updated_at, c.phone, c.product, c.department,
                u.name AS user_name,
                t.name AS assigned_technician_name,
                c.user_id, c.assigned_to
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users t ON c.assigned_to = t.id -- LEFT JOIN for assigned technician (can be null)
            ORDER BY c.created_at DESC;
        `;
        const result = await pool.query(queryText);
        console.log('Admin Backend: Fetched', result.rows.length, 'complaints.');
        res.json(result.rows);
    } catch (error) {
        console.error('Admin Backend: Error fetching all complaints:', error.message);
        res.status(500).json({ message: 'Server error: Could not fetch complaints.' });
    }
});

router.get('/assignedToMe', protect(['technician']), async (req, res) => {
    console.log(`Admin Backend: Fetching complaints assigned to technician ${req.userId}.`);
    try {
        const queryText = `
            SELECT
                c.id, c.subject, c.description, c.status, c.admin_comment,
                c.created_at, c.updated_at, c.phone, c.product, c.department,
                u.name AS user_name,
                t.name AS assigned_technician_name
            FROM complaints c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users t ON c.assigned_to = t.id
            WHERE c.assigned_to = $1
            ORDER BY c.created_at DESC;
        `;
        const result = await pool.query(queryText, [req.userId]);
        console.log('Admin Backend: Fetched', result.rows.length, 'assigned complaints.');
        res.json(result.rows);
    } catch (error) {
        console.error('Admin Backend: Error fetching assigned complaints:', error.message);
        res.status(500).json({ message: 'Server error: Could not fetch assigned complaints.' });
    }
});


router.get('/technicians', protect(['supervisor']), async (req, res) => {
    console.log('Admin Backend: Fetching list of technicians.');
    try {
        const result = await pool.query(`SELECT id, name FROM users WHERE role = 'technician' ORDER BY name ASC;`);
        console.log('Admin Backend: Found', result.rows.length, 'technicians.');
        res.json(result.rows);
    } catch (error) {
        console.error('Admin Backend: Error fetching technicians:', error.message);
        res.status(500).json({ message: 'Server error: Could not fetch technicians.' });
    }
});


router.put('/:id/status', protect(['supervisor', 'technician']), async (req, res) => {
    const complaintId = req.params.id;
    const { status, adminComment } = req.body; 
    const userId = req.userId;
    const userRole = req.userRole;
    console.log(`Admin Backend: User ${userId} (Role: ${userRole}) attempting to update complaint ${complaintId}.`);
    console.log(`New Status: ${status}, New Comment: ${adminComment}`);

    if (!status) {
        return res.status(400).json({ message: 'Status is required.' });
    }

    const allowedStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
    }

    try {
        let queryText;
        let queryValues;

        if (userRole === 'technician') {
        
            queryText = `
                UPDATE complaints
                SET status = $1, admin_comment = $2, updated_at = NOW()
                WHERE id = $3 AND assigned_to = $4
                RETURNING id, status, admin_comment, updated_at;
            `;
            queryValues = [status, adminComment, complaintId, userId];
        } else if (userRole === 'supervisor') {
            
            queryText = `
                UPDATE complaints
                SET status = $1, admin_comment = $2, updated_at = NOW()
                WHERE id = $3
                RETURNING id, status, admin_comment, updated_at;
            `;
            queryValues = [status, adminComment, complaintId];
        } else {
            return res.status(403).json({ message: 'Forbidden: Your role cannot update complaint status.' });
        }

        const result = await pool.query(queryText, queryValues);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found or not authorized to update.' });
        }
        console.log('Admin Backend: Complaint status updated successfully:', result.rows[0]);
        res.json({ message: 'Complaint status updated successfully!', complaint: result.rows[0] });

    } catch (error) {
        console.error('Admin Backend: Error updating complaint status:', error.message);
        res.status(500).json({ message: `Server error: Could not update complaint status. Details: ${error.message}` });
    }
});


router.put('/:id/assign', protect(['supervisor']), async (req, res) => {
    const complaintId = req.params.id;
    const { technicianId } = req.body;
    console.log(`Admin Backend: Assigning complaint ${complaintId} to technician ${technicianId}.`);

    if (!technicianId) {
        return res.status(400).json({ message: 'Technician ID is required for assignment.' });
    }

    try {
        
        const techCheck = await pool.query(`SELECT id FROM users WHERE id = $1 AND role = 'technician'`, [technicianId]);
        if (techCheck.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid technician ID or user is not a technician.' });
        }

        const queryText = `
            UPDATE complaints
            SET assigned_to = $1, status = 'Assigned', updated_at = NOW()
            WHERE id = $2
            RETURNING id, assigned_to, status, updated_at;
        `;
        const result = await pool.query(queryText, [technicianId, complaintId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }
        console.log('Admin Backend: Complaint assigned successfully:', result.rows[0]);
        res.json({ message: 'Complaint assigned successfully!', complaint: result.rows[0] });

    } catch (error) {
        console.error('Admin Backend: Error assigning complaint:', error.message);
        res.status(500).json({ message: `Server error: Could not assign complaint. Details: ${error.message}` });
    }
});

module.exports = router;