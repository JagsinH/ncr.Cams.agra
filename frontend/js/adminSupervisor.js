// frontend/js/supervisor_dashboard.js

// Define API_BASE_URL at the very top of the file, outside any functions.
// IMPORTANT: Based on your previous screenshots, your backend appears to be running on localhost:3000.
// Verify this port matches your actual backend server's port.
// <--- ADD THIS LINE!
const API_BASE_URL = 'https://ncr-cams-agra-bwrq.onrender.com'; // Update this if your backend URL changes

// Define the showMessage helper function (already present and correct)
function showMessage(elementId, message, type) {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = 'message'; // Reset classes
        if (type) {
            messageDiv.classList.add(type);
        }
        messageDiv.style.display = message ? 'block' : 'none'; // Show if message, hide if empty
        if (type !== 'error' && message) {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
                messageDiv.style.display = 'none';
            }, 5000); // Hide after 5 seconds for non-error messages
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const welcomeSupervisorMessage = document.getElementById('welcomeSupervisorMessage');
    const supervisorComplaintsTableBody = document.querySelector('#supervisorComplaintsTable tbody');
    const noSupervisorComplaintsMessage = document.getElementById('noSupervisorComplaintsMessage');
    const supervisorMessageDiv = document.getElementById('supervisorMessage');

    // Modal elements
    const supervisorComplaintModal = document.getElementById('supervisorComplaintModal');
    const closeModalBtn = document.querySelector('#supervisorComplaintModal .close-button');
    const modalComplaintId = document.getElementById('modalComplaintId');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const modalSubject = document.getElementById('modalSubject');
    const modalDescription = document.getElementById('modalDescription');
    const modalPhone = document.getElementById('modalPhone');
    const modalProduct = document.getElementById('modalProduct');
    const modalDepartment = document.getElementById('modalDepartment');
    const modalCurrentStatus = document.getElementById('modalCurrentStatus');
    const modalAssignedTo = document.getElementById('modalAssignedTo');
    const modalTechnicianResponse = document.getElementById('modalTechnicianResponse');
    const modalSupervisorReviewStatus = document.getElementById('modalSupervisorReviewStatus');
    const modalCreatedAt = document.getElementById('modalCreatedAt');
    const modalUpdatedAt = document.getElementById('modalUpdatedAt');

    // Assignment section
    const assignTechnicianSelect = document.getElementById('assignTechnicianSelect');
    const assignComplaintBtn = document.getElementById('assignComplaintBtn');
    const assignMessageDiv = document.getElementById('assignMessage');

    // Review & Finalize section
    const supervisorReviewStatusSelect = document.getElementById('supervisorReviewStatusSelect');
    const updateStatusSelect = document.getElementById('updateStatusSelect');
    const supervisorCommentInput = document.getElementById('supervisorCommentInput');
    const finalizeComplaintBtn = document.getElementById('finalizeComplaintBtn');
    const finalizeMessageDiv = document.getElementById('finalizeMessage');
    const modalOverallMessageDiv = document.getElementById('modalOverallMessage');


    let currentComplaintId = null; // Stores the ID of the complaint currently open in modal

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Authentication & Authorization Check ---
    if (!token || !user || !user.role || !['admin', 'supervisor'].includes(user.role)) {
        alert('Access Denied. You must be an admin or supervisor to access this page.');
        window.location.href = '/login.html';
        return;
    }

    if (welcomeSupervisorMessage && user.name) {
        welcomeSupervisorMessage.textContent = `Welcome, ${user.name} (${user.role})!`;
    }

    // --- Fetch All Complaints for Supervisor ---
    async function fetchSupervisorComplaints() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/supervisor/complaints`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const complaints = await response.json();

            if (response.ok) {
                displaySupervisorComplaints(complaints);
            } else {
                showMessage('supervisorMessage', complaints.message || 'Failed to fetch complaints.', 'error');
                supervisorComplaintsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error: ${complaints.message || 'Could not load complaints.'}</td></tr>`;
                noSupervisorComplaintsMessage.style.display = 'block';
                noSupervisorComplaintsMessage.textContent = `Error: ${complaints.message || 'Could not load complaints.'}`;
            }
        } catch (error) {
            console.error('Error fetching supervisor complaints:', error);
            showMessage('supervisorMessage', 'Network error. Could not fetch complaints.', 'error');
            supervisorComplaintsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Network error. Please ensure the server is running.</td></tr>`;
            noSupervisorComplaintsMessage.style.display = 'block';
            noSupervisorComplaintsMessage.textContent = `Network error. Please ensure the server is running.`;
        }
    }

    function displaySupervisorComplaints(complaints) {
        supervisorComplaintsTableBody.innerHTML = ''; // Clear previous entries
        if (complaints.length === 0) {
            noSupervisorComplaintsMessage.style.display = 'block';
            noSupervisorComplaintsMessage.textContent = "No complaints found in the system.";
        } else {
            noSupervisorComplaintsMessage.style.display = 'none';
            complaints.forEach(complaint => {
                const row = supervisorComplaintsTableBody.insertRow();
                row.insertCell(0).textContent = `REQ${complaint.id.toString().padStart(6, '0')}`;
                row.insertCell(1).textContent = complaint.user_name || 'N/A';
                row.insertCell(2).textContent = complaint.subject;
                row.insertCell(3).textContent = complaint.status;
                row.insertCell(4).textContent = complaint.technician_name || 'Unassigned';
                row.insertCell(5).textContent = complaint.supervisor_review_status;
                row.insertCell(6).textContent = new Date(complaint.updated_at || complaint.created_at).toLocaleString();

                const actionsCell = row.insertCell(7);
                actionsCell.className = 'action-buttons';

                const viewEditBtn = document.createElement('button');
                viewEditBtn.textContent = 'Details / Actions';
                viewEditBtn.className = 'details-btn';
                viewEditBtn.onclick = () => openComplaintModal(complaint.id);
                actionsCell.appendChild(viewEditBtn);

                // Add assign/review quick buttons if needed, or rely on modal
            });
        }
    }

    // --- Fetch Technicians for Assignment Select Box ---
    async function fetchTechnicians() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/supervisor/technicians`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const technicians = await response.json();

            if (response.ok) {
                assignTechnicianSelect.innerHTML = '<option value="">-- Select Technician --</option>'; // Reset
                technicians.forEach(tech => {
                    const option = document.createElement('option');
                    option.value = tech.id;
                    option.textContent = tech.name;
                    assignTechnicianSelect.appendChild(option);
                });
            } else {
                console.error('Failed to fetch technicians:', technicians.message);
                showMessage('assignMessage', 'Could not load technicians for assignment.', 'error');
            }
        } catch (error) {
            console.error('Network error fetching technicians:', error);
            showMessage('assignMessage', 'Network error loading technicians.', 'error');
        }
    }

    // --- Complaint Modal Logic ---
    async function openComplaintModal(id) {
        currentComplaintId = id;
        showMessage('modalOverallMessage', '', ''); // Clear messages
        showMessage('assignMessage', '', '');
        showMessage('finalizeMessage', '', '');

        // Fetch complaint details
        try {
            // Your backend might need a specific endpoint like /api/supervisor/complaints/:id
            // If /api/supervisor/complaints?id=${id} doesn't work, ensure your backend handles this query param
            // or modify to fetch all and then filter as you are currently doing.
            const response = await fetch(`${API_BASE_URL}/api/supervisor/complaints?id=${id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allComplaints = await response.json(); // It returns all, we find the one

            if (!response.ok) {
                showMessage('modalOverallMessage', allComplaints.message || 'Failed to load complaint details.', 'error');
                return;
            }

            const complaint = allComplaints.find(c => c.id === id); // Find the specific complaint
            if (!complaint) {
                showMessage('modalOverallMessage', 'Complaint details not found.', 'error');
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

            modalCurrentStatus.textContent = complaint.status;
            modalAssignedTo.textContent = complaint.technician_name || 'Unassigned';
            modalTechnicianResponse.textContent = complaint.technician_response || 'No response yet.';
            modalSupervisorReviewStatus.textContent = complaint.supervisor_review_status;

            // Populate assignment and review form fields
            assignTechnicianSelect.value = complaint.assigned_to || ''; // Set selected technician
            supervisorReviewStatusSelect.value = complaint.supervisor_review_status;
            updateStatusSelect.value = complaint.status;
            supervisorCommentInput.value = complaint.admin_comment || ''; // Assuming supervisorComment updates admin_comment

            // Fetch technicians list every time modal opens to ensure it's fresh
            await fetchTechnicians();

            supervisorComplaintModal.style.display = 'block';

        } catch (error) {
            console.error('Error opening complaint modal:', error);
            showMessage('modalOverallMessage', 'Network error. Could not load complaint details.', 'error');
        }
    }

    closeModalBtn.onclick = () => {
        supervisorComplaintModal.style.display = 'none';
        currentComplaintId = null;
    };

    window.onclick = (event) => {
        if (event.target == supervisorComplaintModal) {
            supervisorComplaintModal.style.display = 'none';
            currentComplaintId = null;
        }
    };

    // --- Assign Complaint Logic ---
    assignComplaintBtn.onclick = async () => {
        if (!currentComplaintId) return;
        const technicianId = assignTechnicianSelect.value;

        if (!technicianId) {
            showMessage('assignMessage', 'Please select a technician.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/supervisor/complaints/${currentComplaintId}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ technicianId })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('assignMessage', data.message, 'success');
                // Refresh data in modal and main table
                await fetchSupervisorComplaints();
                await openComplaintModal(currentComplaintId); // Re-open to refresh data
            } else {
                showMessage('assignMessage', data.message || 'Failed to assign complaint.', 'error');
            }
        } catch (error) {
            console.error('Error assigning complaint:', error);
            showMessage('assignMessage', 'Network error. Could not assign complaint.', 'error');
        }
    };

    // --- Review & Finalize Logic ---
    finalizeComplaintBtn.onclick = async () => {
        if (!currentComplaintId) return;

        const supervisorReviewStatus = supervisorReviewStatusSelect.value;
        const finalStatus = updateStatusSelect.value;
        const supervisorComment = supervisorCommentInput.value.trim();

        if (!supervisorReviewStatus || !finalStatus) {
            showMessage('finalizeMessage', 'Please select both review status and final status.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/supervisor/complaints/${currentComplaintId}/review`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    supervisorReviewStatus,
                    finalStatus,
                    supervisorComment: supervisorComment || null // Send null if empty
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('finalizeMessage', data.message, 'success');
                // Refresh data in modal and main table
                await fetchSupervisorComplaints();
                await openComplaintModal(currentComplaintId); // Re-open to refresh data
            } else {
                showMessage('finalizeMessage', data.message || 'Failed to finalize complaint.', 'error');
            }
        } catch (error) {
            console.error('Error finalizing complaint:', error);
            showMessage('finalizeMessage', 'Network error. Could not finalize complaint.', 'error');
        }
    };

    // --- Report Generation Button Logic ---
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        console.log('Report Generation Button Listener Activated.');
        generateReportBtn.addEventListener('click', async () => {
            console.log('Generate Report button clicked!');

            if (!token || !user || !user.role || !['admin', 'supervisor'].includes(user.role)) {
                showMessage('supervisorMessage', 'Access Denied. You are not authorized to generate this report.', 'error');
                return;
            }

            try {
                const downloadUrl = `${API_BASE_URL}/api/supervisor/complaints/report/excel`;
                console.log('Attempting to download report from:', downloadUrl);

                // --- CHANGE STARTS HERE: Use fetch with headers for report download ---
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}` // Send the token with the request
                    }
                });

                if (!response.ok) {
                    // If the response is not OK, try to parse error message from backend
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred.' }));
                    console.error('Error response from report API:', errorData);
                    showMessage('supervisorMessage', errorData.message || 'Failed to generate report. Check server logs.', 'error');
                    return; // Stop execution if response not OK
                }

                // Get the blob (file data) from the response
                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'complaints_report.xlsx'; // Default filename
                if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
                    // Extract filename from Content-Disposition header
                    const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8''|)([a-zA-Z0-9._%-]+)['"]?/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = decodeURIComponent(filenameMatch[1]);
                    }
                }

                // Create a URL for the blob and trigger download
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename; // Set the filename for download
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url); // Clean up the URL
                a.remove(); // Clean up the element

                showMessage('supervisorMessage', 'Report generation initiated. Your download should start shortly.', 'info');

            } catch (error) {
                console.error('Error initiating report download:', error);
                showMessage('supervisorMessage', `Network error during report generation: ${error.message}. Please try again.`, 'error');
            }
        });
    } else {
        console.error('ERROR: Generate Report button (ID: generateReportBtn) not found in the DOM.');
        showMessage('supervisorMessage', 'Error: Report button (ID: generateReportBtn) not found on page. Check HTML.', 'error');
    }

    // Initial fetch when the supervisor dashboard loads
    fetchSupervisorComplaints();
});