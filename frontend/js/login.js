// frontend/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const API_BASE_URL = 'https://ncr-cams-agra.onrender.com';

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!email || !password) {
                showMessage('loginMessage', 'Please enter both email and password.', 'error');
                return;
            }

            try {
                // --- CORRECTED API ENDPOINT HERE ---
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json(); // Always try to parse JSON

                if (response.ok) { // Check if response status is 2xx
                    showMessage('loginMessage', data.message || 'Login successful!', 'success');
                    // Store user data and token
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user)); // Store full user object
                    localStorage.setItem('userName', data.user.name); // Store name directly
                    localStorage.setItem('userRole', data.user.role); // Store role directly

                    // Redirect based on the user's role
                    if (data.user.role === 'supervisor') {
                        window.location.href = '../admin/supervisorDashboard.html'; // Create this later
                    } else if (data.user.role === 'technician') {
                        window.location.href = '../admin/technicianDashboard.html'; // Create this later
                    } else {
                        window.location.href = '/ComplaintsPage.html'; // Default for regular users
                    }

                } else {
                    // Handle server-side errors (e.g., 400 Bad Request, 500 Internal Server Error)
                    showMessage('loginMessage', data.message || 'Login failed. Invalid credentials.', 'error');
                }
            } catch (error) {
                console.error('Error during login fetch:', error);
                // Network error (e.g., server down, no internet)
                showMessage('loginMessage', 'Network error during login. Please ensure the server is running and try again.', 'error');
            }
        });
    }
});