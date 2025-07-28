const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');
const getTechnicianComplaints = asyncHandler(async (req, res) => {
    const technicianId = req.user.id; 

     console.log('Fetching complaints for technician ID:', technicianId);

    try {
        const result = await query(
            `SELECT
                c.id,
                c.subject,
                c.description,
                c.status,
                c.priority,
                c.product,
                c.department,
                c.technician_response,
                c.admin_comment,
                c.supervisor_review_status,
                c.created_at,
                c.updated_at,
                u.name AS user_name,
                u.email AS user_email,
                u.phone AS phone 
            FROM
                complaints c
            JOIN
                users u ON c.user_id = u.id
            WHERE
                c.assigned_to = $1
            ORDER BY
                c.created_at DESC;
            `,
            [technicianId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching technician complaints:', error);
        res.status(500);
        throw new Error('Server error: Could not fetch assigned complaints.');
    }
});

const updateComplaintStatusAndResponse = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;
    const { status, technicianResponse } = req.body; 
    const technicianId = req.user.id; 

    
    if (!status && technicianResponse === undefined) {
        res.status(400);
        throw new Error('Status or technician response is required for update.');
    }

    if (status && !['In Progress', 'Resolved', 'Pending Review'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status provided.');
    }

    try {
        const complaintCheck = await query('SELECT assigned_to FROM complaints WHERE id = $1', [complaintId]);
        if (complaintCheck.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found.');
        }
        if (complaintCheck.rows[0].assigned_to !== technicianId) {
            res.status(403); 
            throw new Error('You are not authorized to update this complaint.');
        }

        const updates = [];
        const params = [complaintId];
        let paramIndex = 2; 

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        
        if (technicianResponse !== undefined) {
            updates.push(`technician_response = $${paramIndex++}`);
            params.push(technicianResponse);
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        if (updates.length === 0) {
            res.status(400);
            throw new Error('No valid fields provided for update.');
        }

        const queryString = `UPDATE complaints SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`;

        const result = await query(queryString, params);

        if (result.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found or could not be updated.');
        }

        res.json({
            message: `Complaint REQ${complaintId.toString().padStart(6, '0')} updated successfully!`,
            complaint: result.rows[0]
        });

    } catch (error) {
        console.error('Technician: Error updating complaint:', error);
        if (res.statusCode === 200) { 
            res.status(500);
        }
    
        res.json({ message: error.message || `Server error: Could not update complaint.` });
    }
});


module.exports = {
    getTechnicianComplaints,
    updateComplaintStatusAndResponse
};