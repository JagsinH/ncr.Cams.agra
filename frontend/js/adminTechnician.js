// frontend/js/technician_dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const welcomeTechnicianMessage = document.getElementById('welcomeTechnicianMessage');
    const assignedComplaintsTableBody = document.querySelector('#assignedComplaintsTable tbody');
    const noAssignedComplaintsMessage = document.getElementById('noAssignedComplaintsMessage');
    const technicianMessageDiv = document.getElementById('technicianMessage');

    // Modal elements
    const technicianComplaintModal = document.getElementById('technicianComplaintModal');
    const closeModalBtn = document.querySelector('#technicianComplaintModal .close-button');
    const modalComplaintId = document.getElementById('modalComplaintId');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const modalSubject = document.getElementById('modalSubject');
    const modalDescription = document.getElementById('modalDescription');
    const modalPhone = document.getElementById('modalPhone');
    const modalProduct = document.getElementById('modalProduct');
    const modalDepartment = document.getElementById('modalDepartment');
    const modalStatus = document.getElementById('modalStatus');
    const modalTechnicianResponseView = document.getElementById('modalTechnicianResponseView');
    const modalSupervisorReviewStatus = document.getElementById('modalSupervisorReviewStatus');
    const modalCreatedAt = document.getElementById('modalCreatedAt');
    const modalUpdatedAt = document.getElementById('modalUpdatedAt');

    // Added: Status dropdown for technician to change status
    const updateStatusSelect = document.getElementById('updateStatus'); // NEW ID for status dropdown
    const technicianResponseInput = document.getElementById('technicianResponseInput');
    const submitResponseBtn = document.getElementById('submitResponseBtn');
    const responseMessageDiv = document.getElementById('responseMessage');
    const modalOverallMessageDiv = document.getElementById('modalOverallMessage');

    let currentComplaintId = null;

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Authentication & Authorization Check ---
    if (!token || !user || !user.role || !['admin', 'supervisor', 'technician'].includes(user.role)) {
        alert('Access Denied. You must be an admin, supervisor, or technician to access this page.');
        window.location.href = '/login.html';
        return;
    }
    // Specific check if they are trying to access technician dashboard as non-technician
    if (user.role === 'user' || user.role === 'supervisor') { // Ensure only technicians and admins for this exact dashboard
        alert('Access Denied. You are not authorized for this dashboard.');
        window.location.href = '/ComplaintsPage.html'; // Redirect non-privileged users or supervisors
        return;
    }


    if (welcomeTechnicianMessage && user.name) {
        welcomeTechnicianMessage.textContent = `Welcome, ${user.name} (${user.role})!`;
    }

    // --- Fetch Assigned Complaints ---
    async function fetchAssignedComplaints() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/technician/complaints`, { // Changed from my-assignments
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const complaints = await response.json();

            if (response.ok) {
                displayAssignedComplaints(complaints);
            } else {
                showMessage('technicianMessage', complaints.message || 'Failed to fetch assigned complaints.', 'error');
                assignedComplaintsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${complaints.message || 'Could not load assigned complaints.'}</td></tr>`;
                noAssignedComplaintsMessage.style.display = 'block';
                noAssignedComplaintsMessage.textContent = `Error: ${complaints.message || 'Could not load assigned complaints.'}`;
            }
        } catch (error) {
            console.error('Error fetching assigned complaints:', error);
            showMessage('technicianMessage', 'Network error. Could not fetch assigned complaints.', 'error');
            assignedComplaintsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Network error. Please ensure the server is running.</td></tr>`;
            noAssignedComplaintsMessage.style.display = 'block';
            noAssignedComplaintsMessage.textContent = `Network error. Please ensure the server is running.`;
        }
    }

    function displayAssignedComplaints(complaints) {
        assignedComplaintsTableBody.innerHTML = '';
        if (complaints.length === 0) {
            noAssignedComplaintsMessage.style.display = 'block';
            noAssignedComplaintsMessage.textContent = "No complaints currently assigned to you.";
        } else {
            noAssignedComplaintsMessage.style.display = 'none';
            complaints.forEach(complaint => {
                const row = assignedComplaintsTableBody.insertRow();
                row.insertCell(0).textContent = `REQ${complaint.id.toString().padStart(6, '0')}`;
                row.insertCell(1).textContent = complaint.user_name || 'N/A';
                row.insertCell(2).textContent = complaint.subject;
                row.insertCell(3).textContent = complaint.status;
                row.insertCell(4).textContent = complaint.supervisor_review_status;
                row.insertCell(5).textContent = new Date(complaint.updated_at || complaint.created_at).toLocaleString();

                const actionsCell = row.insertCell(6);
                actionsCell.className = 'action-buttons';

                const viewEditBtn = document.createElement('button');
                viewEditBtn.textContent = 'View/Respond';
                viewEditBtn.className = 'response-btn';
                viewEditBtn.onclick = () => openComplaintModal(complaint.id);
                actionsCell.appendChild(viewEditBtn);
            });
        }
    }

    // --- Complaint Modal Logic ---
    async function openComplaintModal(id) {
        currentComplaintId = id;
        showMessage('modalOverallMessage', '', ''); // Clear messages
        showMessage('responseMessage', '', '');

        try {
            // Re-fetch ALL assigned complaints and find the specific one.
            // It's more efficient to just refetch the *single* complaint if you have a backend endpoint for it,
            // but for now, this works with your existing 'getTechnicianComplaints' endpoint.
            const response = await fetch(`${API_BASE_URL}/api/technician/complaints`, { // Changed from my-assignments
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const assignedComplaints = await response.json();

            if (!response.ok) {
                showMessage('modalOverallMessage', assignedComplaints.message || 'Failed to load complaint details.', 'error');
                return;
            }

            const complaint = assignedComplaints.find(c => c.id === id);
            if (!complaint) {
                showMessage('modalOverallMessage', 'Complaint details not found in your assignments.', 'error');
                return;
            }

            // Populate modal fields
            modalComplaintId.textContent = `REQ${complaint.id.toString().padStart(6, '0')}`;
            modalUserName.textContent = complaint.user_name || 'N/A';
            modalUserEmail.textContent = complaint.user_email || 'N/A';
            modalSubject.textContent = complaint.subject;
            modalDescription.textContent = complaint.description;
            modalPhone.textContent = complaint.phone || 'N/A';
            modalProduct.textContent = complaint.product || 'N/A';
            modalDepartment.textContent = complaint.department || 'N/A';
            modalCreatedAt.textContent = new Date(complaint.created_at).toLocaleString();
            modalUpdatedAt.textContent = new Date(complaint.updated_at || complaint.created_at).toLocaleString();
            modalStatus.textContent = complaint.status;
            modalTechnicianResponseView.textContent = complaint.technician_response || 'No response submitted yet.';
            modalSupervisorReviewStatus.textContent = complaint.supervisor_review_status;

            // Populate technician response input AND status dropdown
            technicianResponseInput.value = complaint.technician_response || '';
            updateStatusSelect.value = complaint.status; // Set the current status in the dropdown

            technicianComplaintModal.style.display = 'block';

        } catch (error) {
            console.error('Error opening complaint modal:', error);
            showMessage('modalOverallMessage', 'Network error. Could not load complaint details.', 'error');
        }
    }

    closeModalBtn.onclick = () => {
        technicianComplaintModal.style.display = 'none';
        currentComplaintId = null;
    };

    window.onclick = (event) => {
        if (event.target == technicianComplaintModal) {
            technicianComplaintModal.style.display = 'none';
            currentComplaintId = null;
        }
    };

    // --- Submit Technician Response Logic ---
    submitResponseBtn.onclick = async () => {
        if (!currentComplaintId) return;
        const technicianResponse = technicianResponseInput.value.trim();
        const newStatus = updateStatusSelect.value; // Get the selected status from the dropdown

        if (!technicianResponse && !newStatus) { // Require at least one field
            showMessage('responseMessage', 'Please enter your response or update the status.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/technician/complaints/${currentComplaintId}/update`, { // Corrected endpoint to /update
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus, // Send the new status
                    technicianResponse: technicianResponse // Send the technician response
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('responseMessage', data.message, 'success');
                // Refresh data in modal and main table
                await fetchAssignedComplaints();
                // Re-open modal with fresh data, or close it after success
                // await openComplaintModal(currentComplaintId); // Option 1: Re-open modal to show updated data
                setTimeout(() => { // Option 2: Close modal after a delay
                    closeModalBtn.click(); // Simulate closing the modal
                }, 1500);

            } else {
                showMessage('responseMessage', data.message || 'Failed to submit response.', 'error');
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            showMessage('responseMessage', 'Network error. Could not submit response.', 'error');
        }
    };

    // Initial fetch when the technician dashboard loads
    fetchAssignedComplaints();
});