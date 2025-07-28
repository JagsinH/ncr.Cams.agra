// frontend/js/reset_password.js
document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const tokenInput = document.getElementById('token');

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('resetPasswordMessage', 'Invalid or missing password reset token. Please request a new link.', 'error');
        if (resetPasswordForm) resetPasswordForm.style.display = 'none'; // Hide form if no token
        return;
    }
    tokenInput.value = token; // Set the hidden token field

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            showMessage('resetPasswordMessage', '', ''); // Clear previous messages

            if (!newPassword || !confirmPassword) {
                showMessage('resetPasswordMessage', 'Please enter and confirm your new password.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage('resetPasswordMessage', 'Passwords do not match.', 'error');
                return;
            }

            if (newPassword.length < 6) {
                showMessage('resetPasswordMessage', 'Password must be at least 6 characters long.', 'error');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: token, newPassword: newPassword }),
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('resetPasswordMessage', data.message, 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html'; // Redirect to login after successful reset
                    }, 3000);
                } else {
                    showMessage('resetPasswordMessage', data.message || 'Error resetting password.', 'error');
                }
            } catch (error) {
                console.error('Network error during password reset request:', error);
                showMessage('resetPasswordMessage', 'Network error. Please try again.', 'error');
            }
        });
    }
});