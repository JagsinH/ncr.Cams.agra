const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');

// @desc    Get complaints assigned to the logged-in technician
// @route   GET /api/technician/complaints
// @access  Private (Technician)
const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');

// @desc    Get complaints assigned to the logged-in technician
// @route   GET /api/technician/complaints
// @access  Private (Technician)
const getTechnicianComplaints = asyncHandler(async (req, res) => {
    // Add logging to verify the user ID
    const technicianId = req.user.id;
    console.log('[getTechnicianComplaints] Attempting to fetch complaints for technician ID:', technicianId);

    // Basic authorization check
    if (!technicianId) {
        console.error('[getTechnicianComplaints] Authorization Error: Technician ID is missing from JWT token.');
        res.status(401);
        throw new Error('Not authorized, technician ID missing.');
    }
    
    try {
        const sqlQuery = `
            SELECT
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
        `;
        
        const result = await query(sqlQuery, [technicianId]);

        console.log('[getTechnicianComplaints] Successfully fetched', result.rows.length, 'complaints.');
        res.status(200).json(result.rows);
    } catch (error) {
        // --- THE KEY FIX IS HERE ---
        // Log the specific database error to the console
        console.error('Error fetching technician complaints:', error.message);
        console.error('Full stack trace:', error.stack);
        // Do NOT re-throw. Send a clear, actionable error message to the frontend.
        res.status(500).json({ message: 'Server error: Could not fetch assigned complaints. Check server logs for details.' });
    }
});


// @desc    Update complaint status and add technician's response
// @route   PUT /api/technician/complaints/:id/update
// @access  Private (Technician)
const updateComplaintStatusAndResponse = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;
    const { status, technicianResponse } = req.body; // Expecting both status and technicianResponse
    const technicianId = req.user.id; // Ensure only the assigned technician can update

    // Input validation
    if (!status && technicianResponse === undefined) { // Check if both are missing/undefined
        res.status(400);
        throw new Error('Status or technician response is required for update.');
    }

    if (status && !['In Progress', 'Resolved', 'Pending Review'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status provided.');
    }

    try {
        // First, check if the complaint is assigned to this technician
        const complaintCheck = await query('SELECT assigned_to FROM complaints WHERE id = $1', [complaintId]);
        if (complaintCheck.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found.');
        }
        if (complaintCheck.rows[0].assigned_to !== technicianId) {
            res.status(403); // Forbidden
            throw new Error('You are not authorized to update this complaint.');
        }

        // Build the update query dynamically based on provided fields
        const updates = [];
        const params = [complaintId];
        let paramIndex = 2; // Start from $2 for dynamic fields, $1 is complaintId

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        // Only update technician_response if it's explicitly provided (can be an empty string)
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
        // Do not overwrite existing status codes like 403 or 404
        if (res.statusCode === 200) { // If no status was set by an earlier throw
            res.status(500);
        }
        // Use the error message from the thrown error
        res.json({ message: error.message || `Server error: Could not update complaint.` });
    }
});


module.exports = {
    getTechnicianComplaints,
    updateComplaintStatusAndResponse
};