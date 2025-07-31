// backend/controllers/complaintController.js
const asyncHandler = require('express-async-handler');
const { query } = require('../config/db');

// @desc    Create a new complaint
// @route   POST /api/complaints
// @access  Private (User)
const createComplaint = asyncHandler(async (req, res) => {
    const { subject, description, phone, product, department } = req.body;
    const userId = req.user.id; // User ID from `protect` middleware

    if (!subject || !description || !phone || !product || !department || !userId) {
        res.status(400);
        throw new Error('All complaint fields (subject, description, phone, product, department) are required.');
    }

    try {
        const result = await query(
            `INSERT INTO complaints (user_id, subject, description, phone, product, department, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, subject, description, status, created_at, phone, product, department, admin_comment;`,
            [userId, subject, description, phone, product, department, 'Pending']
        );

        const newComplaint = result.rows[0];
        res.status(201).json({
            message: 'Complaint submitted successfully!',
            complaint: newComplaint,
            complaintId: newComplaint.id
        });
    } catch (error) {
        console.error('DATABASE ERROR during complaint submission:', error);
        res.status(500);
        throw new Error(`Server error: Could not submit complaint. Details: ${error.message}`);
    }
});

// @desc    Get complaints by logged-in user
// @route   GET /api/complaints/my-complaints
// @access  Private (User)

// ... (createComplaint remains the same) ...

// @desc    Get complaints by logged-in user
// @route   GET /api/complaints/my-complaints
// @access  Private (User)
const getUserComplaints = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await query(
            `SELECT
                c.id,
                c.subject,
                c.description,
                c.status,
                c.admin_comment,
                c.phone,
                c.product,
                c.department,
                c.assigned_to,
                t.name AS technician_name, -- Get technician's name
                c.technician_response,
                c.supervisor_review_status,
                c.created_at,
                c.updated_at
            FROM
                complaints c
            LEFT JOIN -- Use LEFT JOIN as it might not be assigned yet
                users t ON c.assigned_to = t.id
            WHERE
                c.user_id = $1
            ORDER BY
                c.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500);
        throw new Error('Server error: Could not retrieve your complaints.');
    }
});

// @desc    Get single complaint by ID (for tracking)
// @route   GET /api/complaints/track/:id
// @access  Public (Can be made private if user should only track their own)


const getComplaintById = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;

    if (!complaintId) {
        res.status(400);
        throw new Error('Complaint ID is required for tracking.');
    }

    try {
        const queryText = `
            SELECT
                c.id,
                c.subject,
                c.description,
                c.status,
                c.admin_comment,
                c.phone,
                c.product,
                c.department,
                c.assigned_to,
                t.name AS technician_name,
                c.technician_response,
                c.supervisor_review_status,
                c.created_at,
                c.updated_at
            FROM
                complaints c
            LEFT JOIN
                users t ON c.assigned_to = t.id
            WHERE
                c.id = $1;
        `;
        const result = await query(queryText, [complaintId]);

        if (result.rows.length === 0) {
            res.status(404);
            throw new Error('Complaint not found.');
        }

        const complaint = result.rows[0];
        res.json({ message: 'Complaint details found.', complaint });

    } catch (error) {
        console.error('Error tracking complaint:', error);
        res.status(500);
        throw new Error(`Server error: Could not track complaint. Details: ${error.message}`);
    }
});

module.exports = {
    createComplaint,
    getUserComplaints,
    getComplaintById
};