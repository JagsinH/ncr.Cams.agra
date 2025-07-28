// frontend/js/statusTracking.js

document.addEventListener('DOMContentLoaded', () => {
    const trackingForm = document.getElementById('trackingForm');
    const complaintIdInput = document.getElementById('complaintId');
    const trackingMessageDiv = document.getElementById('trackingMessage');
    const complaintDetailsDiv = document.getElementById('complaintDetails');

    // Display elements
    const displayComplaintId = document.getElementById('displayComplaintId');
    const displaySubject = document.getElementById('displaySubject');
    const displayDescription = document.getElementById('displayDescription');
    const displayPhone = document.getElementById('displayPhone');
    const displayProduct = document.getElementById('displayProduct');
    const displayDepartment = document.getElementById('displayDepartment');
    const displayStatus = document.getElementById('displayStatus');
    const displayUpdatedAt = document.getElementById('displayUpdatedAt');
    const displayAdminComment = document.getElementById('displayAdminComment');

    const showMessage = (message, type) => {
        trackingMessageDiv.textContent = message;
        trackingMessageDiv.className = `message ${type}`;
        trackingMessageDiv.style.display = 'block';
    };

    const hideMessage = () => {
        trackingMessageDiv.style.display = 'none';
    };

    const hideDetails = () => {
        complaintDetailsDiv.style.display = 'none';
    };

    if (trackingForm) {
        trackingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideMessage();
            hideDetails();

            const complaintId = complaintIdInput.value.trim();

            if (!complaintId) {
                showMessage('Please enter a Complaint ID.', 'error');
                return;
            }

            try {
                // Ensure API_BASE_URL is defined in common.js or directly here
                const response = await fetch(`${API_BASE_URL}/api/complaints/track/${complaintId}`);
                const data = await response.json();

                if (response.ok) {
                    if (data.complaint) {
                        const complaint = data.complaint;
                        displayComplaintId.textContent = complaint.id;
                        displaySubject.textContent = complaint.subject;
                        displayDescription.textContent = complaint.description;
                        displayPhone.textContent = complaint.phone;
                        displayProduct.textContent = complaint.product;
                        displayDepartment.textContent = complaint.department;
                        
                        displayStatus.textContent = complaint.status;
                        displayStatus.className = `status-badge status-${complaint.status.toLowerCase().replace(/\s/g, '-')}`; // Apply dynamic class
                        
                        displayUpdatedAt.textContent = new Date(complaint.updated_at).toLocaleString();
                        displayAdminComment.textContent = complaint.admin_comment || 'No updates yet.';

                        complaintDetailsDiv.style.display = 'block';
                        showMessage('Complaint details fetched successfully.', 'info');
                    } else {
                        showMessage('Complaint not found or invalid ID.', 'error');
                    }
                } else {
                    showMessage(data.message || 'Failed to fetch complaint details. Please try again.', 'error');
                }

            } catch (error) {
                console.error('Error tracking complaint:', error);
                showMessage('Network error or server unavailable. Please try again.', 'error');
            }
        });
    }
});