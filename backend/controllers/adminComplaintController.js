
const pool = require('../config/db'); 

exports.getAllComplaints = async (req, res) => {
    console.log('Backend (Admin): Admin trying to fetch all complaints.');
    try {
        const result = await pool.query(`
            SELECT
                c.id,
                c.subject,          -- Corrected: Use 'subject'
                c.description,
                c.status,
                c.admin_comment,
                c.created_at,
                c.phone,            -- Added new field
                c.product,          -- Added new field
                c.department,       -- Added new field
                u.name AS user_name,
                u.email AS user_email
            FROM
                complaints c
            JOIN
                users u ON c.user_id = u.id
            ORDER BY
                c.created_at DESC
        `);
        console.log('Backend (Admin): Fetched complaints for admin:', result.rows.length, 'complaints.');
        res.json(result.rows);
    } catch (error) {
        console.error('Backend (Admin): DATABASE ERROR fetching all complaints for admin:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve complaints for admin dashboard.' });
    }
};


exports.updateComplaintStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required.' });
    }

    try {
        const result = await pool.query(
            'UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }
        res.json({ message: 'Complaint status updated successfully!', complaint: result.rows[0] });
    } catch (error) {
        console.error('Error updating complaint status:', error);
        res.status(500).json({ message: 'Server Error: Could not update complaint status.' });
    }
};


exports.addAdminComment = async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    if (typeof comment !== 'string' && comment !== null) {
        return res.status(400).json({ message: 'Comment must be a string or null.' });
    }

    try {
        const result = await pool.query(
            'UPDATE complaints SET admin_comment = $1 WHERE id = $2 RETURNING *',
            [comment, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }
        res.json({ message: 'Admin comment updated successfully!', complaint: result.rows[0] });
    } catch (error) {
        console.error('Error adding admin comment:', error);
        res.status(500).json({ message: 'Server Error: Could not update admin comment.' });
    }
};


exports.deleteComplaint = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM complaints WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }
        res.json({ message: `Complaint with ID ${id} deleted successfully!` });
    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ message: 'Server Error: Could not delete complaint.' });
    }
};