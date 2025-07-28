// public/js/adminDashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const logoutButton = document.getElementById('logoutButton');
    const loadingMessage = document.getElementById('loadingMessage');
    const complaintsTableContainer = document.getElementById('complaintsTableContainer');
    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const noComplaintsMessage = document.getElementById('noComplaintsMessage');
    const errorMessage = document.getElementById('errorMessage');

    // --- 1. Authentication & Authorization Check ---
    if (!token || userRole !== 'admin') {
        alert('Access Denied: You must be logged in as an administrator to view this page.');
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = '../login.html';
        return;
    }

    // --- 2. Fetch Complaints from Backend ---
    async function fetchAllComplaints() {
        loadingMessage.style.display = 'block';
        complaintsTableContainer.style.display = 'none';
        noComplaintsMessage.style.display = 'none';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/complaints`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (response.ok) {
                const complaints = await response.json();
                console.log('Fetched admin complaints:', complaints);
                displayComplaints(complaints);
            } else {
                const errorData = await response.json();
                console.error('Failed to fetch complaints:', errorData);
                errorMessage.textContent = `Error: ${errorData.message || 'Could not fetch complaints.'}`;
                errorMessage.style.display = 'block';

                if (response.status === 401 || response.status === 403) {
                     alert('Session expired or unauthorized. Please log in again.');
                     localStorage.removeItem('token');
                     localStorage.removeItem('userRole');
                     window.location.href = '../login.html';
                }
            }
        } catch (error) {
            console.error('Network or fetch error:', error);
            errorMessage.textContent = 'Network error. Could not connect to the server.';
            errorMessage.style.display = 'block';
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    // --- 3. Display Complaints in Table ---
    function displayComplaints(complaints) {
        const complaintsTableBody = document.getElementById('complaintsTableBody');
        complaintsTableBody.innerHTML = '';

        if (complaints.length === 0) {
            noComplaintsMessage.style.display = 'block';
        } else {
            complaintsTableContainer.style.display = 'block';
            complaints.forEach(complaint => {
                const row = complaintsTableBody.insertRow();

                row.insertCell().textContent = complaint.id;
                row.insertCell().textContent = complaint.title;
                row.insertCell().textContent = complaint.description;

                const statusCell = row.insertCell();
                statusCell.textContent = complaint.status;
                statusCell.className = `status-${complaint.status.toLowerCase().replace(/\s/g, '-')}`;

                row.insertCell().textContent = complaint.user_name || 'N/A'; // User's name from JOIN

                row.insertCell().textContent = complaint.phone || 'N/A';
                    row.insertCell().textContent = complaint.product || 'N/A';
                    row.insertCell().textContent = complaint.department || 'N/A';

                row.insertCell().textContent = complaint.admin_comment || 'N/A';
                row.insertCell().textContent = new Date(complaint.created_at).toLocaleString();

                const actionsCell = row.insertCell();
                // Add action buttons here later
            });
        }
    }

    // --- 4. Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            alert('You have been logged out.');
            window.location.href = '../index.html';
        });
    }

    // Initial fetch when the page loads
    fetchAllComplaints();
});