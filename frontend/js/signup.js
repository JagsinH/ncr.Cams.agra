// frontend/js/signup.js
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!name || !email || !password) {
                showMessage('signupMessage', 'Please enter all fields.', 'error');
                return;
            }

            try {
                // --- CORRECTED API ENDPOINT HERE ---
                const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json(); // Always try to parse JSON

                if (response.ok) { // Check if response status is 2xx
                    showMessage('signupMessage', data.message || 'Registration successful!', 'success');
                    // Store user data and token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user)); // Store full user object
                    localStorage.setItem('userName', data.user.name); // Store name directly
                    localStorage.setItem('userRole', data.user.role); // Store role directly

                    // Redirect based on the registered user's role
                    if (data.user.role === 'supervisor') {
                        window.location.href = '../admin/supervisorDashboard.html'; // Create this later
                    } else if (data.user.role === 'technician') {
                        window.location.href = '../admin/technicianDashboard.html'; // Create this later
                    } else {
                        window.location.href = '/ComplaintsPage.html'; // Default for regular users
                    }

                } else {
                    // Handle server-side errors (e.g., 400 Bad Request, 500 Internal Server Error)
                    showMessage('signupMessage', data.message || 'Registration failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error during registration fetch:', error);
                // Network error (e.g., server down, no internet)
                showMessage('signupMessage', 'Network error during registration. Please ensure the server is running and try again.', 'error');
            }
        });
    }
});