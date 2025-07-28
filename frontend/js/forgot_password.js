// frontend/js/forgot_password.js
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordMessage = document.getElementById('forgotPasswordMessage');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();

            if (!email) {
                showMessage(forgotPasswordMessage, 'Please enter your email address.', 'error');
                return;
            }

            try {
                // --- CORRECTED API ENDPOINT HERE ---
                const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage(forgotPasswordMessage, data.message || 'If a matching account is found, a password reset link has been sent to your email.', 'success');
                } else {
                    showMessage(forgotPasswordMessage, data.message || 'Failed to send password reset link. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error during forgot password request:', error);
                showMessage(forgotPasswordMessage, 'Network error. Please ensure the server is running and try again.', 'error');
            }
        });
    }
});