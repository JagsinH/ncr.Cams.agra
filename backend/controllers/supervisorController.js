// backend/controllers/supervisorController.js
const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');
const ExcelJS = require('exceljs');

// @desc    Get all complaints for Supervisor dashboard
// @route   GET /api/supervisor/complaints
// @access  Private (Supervisor, Admin)
const getSupervisorComplaints = asyncHandler(async (req, res) => {
    try {
        const result = await query(`
            SELECT
                c.id,
                c.user_id,
                u.name AS user_name,
                u.email AS user_email,
                c.subject,
                c.description,
                c.phone,
                c.product,
                c.department,
                c.status,
                c.admin_comment,
                c.assigned_to,
                t.name AS technician_name,
                t.email AS technician_email,
                c.technician_response,
                c.supervisor_review_status,
                c.final_status_set_by,
                s.name AS finalizer_name,
                c.created_at,
                c.updated_at
            FROM
                complaints c
            JOIN
                users u ON c.user_id = u.id
            LEFT JOIN -- Use LEFT JOIN to include complaints not yet assigned
                users t ON c.assigned_to = t.id
            LEFT JOIN -- Use LEFT JOIN for the finalizer too
                users s ON c.final_status_set_by = s.id
            ORDER BY
                c.created_at DESC;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Supervisor: Error fetching all complaints:', error);
        res.status(500);
        throw new Error('Server error: Could not retrieve complaints for supervisor.');
    }
});

// @desc    Assign a complaint to a technician
// @route   PUT /api/supervisor/complaints/:id/assign
// @access  Private (Supervisor, Admin)
const assignComplaint = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;
    const { technicianId } = req.body; // ID of the technician to assign to

    if (!technicianId) {
        res.status(400);
        throw new Error('Technician ID is required for assignment.');
    }

    // Optional: Verify technicianId actually belongs to a 'technician' role
    const technicianCheck = await query('SELECT role FROM users WHERE id = $1', [technicianId]);
    if (technicianCheck.rows.length === 0 || technicianCheck.rows[0].role !== 'technician') {
        res.status(400);
        throw new Error('Invalid technician ID or user is not a technician.');
    }

    try {
        const result = await query(
            `UPDATE complaints
             SET assigned_to = $1, status = 'In Progress', supervisor_review_status = 'N/A', updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, assigned_to, status, supervisor_review_status;`,
            [technicianId, complaintId]
        );

        if (result.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found or could not be assigned.');
        }

        res.json({
            message: `Complaint REQ${complaintId.toString().padStart(6, '0')} assigned to technician successfully!`,
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Supervisor: Error assigning complaint:', error);
        res.status(500);
        throw new Error(`Server error: Could not assign complaint. Details: ${error.message}`);
    }
});

// @desc    Review technician response and finalize complaint status
// @route   PUT /api/supervisor/complaints/:id/review
// @access  Private (Supervisor, Admin)
const reviewAndFinalizeComplaint = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;
    const { supervisorReviewStatus, finalStatus, supervisorComment } = req.body; // new review status, final status, optional supervisor comment
    const supervisorId = req.user.id; // ID of the supervisor performing the action

    if (!supervisorReviewStatus || !finalStatus) {
        res.status(400);
        throw new Error('Supervisor review status and final status are required.');
    }
    if (!['Approved', 'Rejected', 'Pending Review'].includes(supervisorReviewStatus)) {
        res.status(400);
        throw new Error('Invalid supervisor review status.');
    }
    if (!['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected'].includes(finalStatus)) {
        res.status(400);
        throw new Error('Invalid final status.');
    }

    try {
        const result = await query(
            `UPDATE complaints
             SET
                status = $1,
                supervisor_review_status = $2,
                admin_comment = COALESCE($3, admin_comment), -- Update admin_comment or keep existing
                final_status_set_by = $4,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING id, status, supervisor_review_status, admin_comment;`,
            [finalStatus, supervisorReviewStatus, supervisorComment, supervisorId, complaintId]
        );

        if (result.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found or could not be finalized.');
        }

        res.json({
            message: `Complaint REQ${complaintId.toString().padStart(6, '0')} review and status finalized successfully!`,
            complaint: result.rows[0]
        });
    } catch (error) {
        console.error('Supervisor: Error reviewing and finalizing complaint:', error);
        res.status(500);
        throw new Error(`Server error: Could not review and finalize complaint. Details: ${error.message}`);
    }
});

// @desc    Get a list of users with 'technician' role
// @route   GET /api/supervisor/technicians
// @access  Private (Supervisor, Admin)
const getTechnicians = asyncHandler(async (req, res) => {
    try {
        const result = await query('SELECT id, name, email FROM users WHERE role = $1 ORDER BY name', ['technician']);
        res.json(result.rows);
    } catch (error) {
        console.error('Supervisor: Error fetching technicians:', error);
        res.status(500);
        throw new Error('Server error: Could not retrieve technicians list.');
    }
});

// @desc    Generate a report of complaints as an Excel file
// @route   GET /api/supervisor/complaints/report/excel
// @access  Private (Admin, Supervisor)
const getComplaintReport = asyncHandler(async (req, res) => {
    try {
        // Fetch all complaints (or filtered complaints based on query params if you add them)
        const result = await query(`
            SELECT
                c.id AS complaint_id,
                c.subject,
                c.description,
                c.status,
                c.priority, -- Make sure this exists in your DB or remove
                c.product,
                c.department,
                c.technician_response,
                c.admin_comment,
                c.supervisor_review_status,
                c.created_at,
                c.updated_at,
                u.name AS user_name,
                u.email AS user_email,
                u.phone AS user_phone, -- Make sure this exists in your DB (users table) or remove/change to c.phone
                t.name AS assigned_technician_name
            FROM
                complaints c
            JOIN
                users u ON c.user_id = u.id
            LEFT JOIN
                users t ON c.assigned_to = t.id -- Join to get technician's name
            ORDER BY
                c.created_at DESC;
        `);

        const complaints = result.rows;

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Complaints Report');

        // Define columns
        worksheet.columns = [
            { header: 'Complaint ID', key: 'complaint_id', width: 15 },
            { header: 'Subject', key: 'subject', width: 30 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Priority', key: 'priority', width: 15 },
            { header: 'Product', key: 'product', width: 20 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Technician Response', key: 'technician_response', width: 40 },
            { header: 'Admin Comment', key: 'admin_comment', width: 40 },
            { header: 'Supervisor Review', key: 'supervisor_review_status', width: 20 },
            { header: 'Created At', key: 'created_at', width: 20 },
            { header: 'Last Updated', key: 'updated_at', width: 20 },
            { header: 'Submitted By', key: 'user_name', width: 25 },
            { header: 'Submitter Email', key: 'user_email', width: 30 },
            { header: 'Submitter Phone', key: 'user_phone', width: 20 },
            { header: 'Assigned Technician', key: 'assigned_technician_name', width: 25 },
        ];

        // Add rows
        worksheet.addRows(complaints);

        // Set response headers for file download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'complaints_report_' + Date.now() + '.xlsx'
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating complaints report:', error);
        res.status(500).json({ message: 'Server error: Could not generate report.' });
    }
});





module.exports = {
    getSupervisorComplaints,
    assignComplaint,
    reviewAndFinalizeComplaint,
    getTechnicians,
     getComplaintReport
};