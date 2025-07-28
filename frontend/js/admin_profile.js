// frontend/js/admin_profile.js
document.addEventListener('DOMContentLoaded', async () => {
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');

    const user = getUser(); // Get user data from common.js
    if (!user || user.role !== 'admin') {
        showMessage('profileMessage', 'Access denied. Only admins can view this page.', 'error');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500); // Redirect unauthorized
        return;
    }

    // Populate current user data
    nameInput.value = user.name || '';
    emailInput.value = user.email || '';

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('profileMessage', '', ''); // Clear messages

        const updatedName = nameInput.value.trim();
        const updatedEmail = emailInput.value.trim();
        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmNewPassword = confirmNewPasswordInput.value.trim();

        const requestBody = {};
        let passwordChangeAttempted = false;

        // Add name if changed
        if (updatedName && updatedName !== user.name) {
            requestBody.name = updatedName;
        }

        // Add email if changed
        if (updatedEmail && updatedEmail !== user.email) {
            requestBody.email = updatedEmail;
        }

        // Handle password change fields
        if (newPassword || currentPassword || confirmNewPassword) {
            passwordChangeAttempted = true;
            if (!currentPassword) {
                showMessage('profileMessage', 'Current password is required to change password.', 'error');
                return;
            }
            if (!newPassword || !confirmNewPassword) {
                showMessage('profileMessage', 'New password and confirm password are required.', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                showMessage('profileMessage', 'New passwords do not match.', 'error');
                return;
            }
            if (newPassword.length < 6) {
                showMessage('profileMessage', 'New password must be at least 6 characters long.', 'error');
                return;
            }
            requestBody.currentPassword = currentPassword;
            requestBody.newPassword = newPassword;
        }

        // If no changes or only password fields are empty when not changing password
        if (Object.keys(requestBody).length === 0) {
            if (!passwordChangeAttempted) { // If user didn't try to change password either
                showMessage('profileMessage', 'No changes detected to update.', 'success');
            }
            return;
        }

        try {
            // Use authenticatedFetch for this protected route
            const response = await authenticatedFetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PUT',
                body: JSON.stringify(requestBody),
            }, 'profileMessage'); // Pass messageElementId for authenticatedFetch

            const data = await response.json();

            if (response.ok) {
                showMessage('profileMessage', data.message, 'success');
                // Update local storage if email/password/name changed and new token received
                // The backend sends a new token if email or password was changed.
                // If only name changed, the token remains the same, but the user object needs updating.
                let newUserState = { ...user, name: data.name, email: data.email };
                if (data.token) {
                    storeAuthData(data.token, newUserState); // Stores new token and updated user data
                } else {
                    // If no new token, means only name (or no change) occurred, just update user in localStorage
                    localStorage.setItem('user', JSON.stringify(newUserState));
                    localStorage.setItem('userName', newUserState.name);
                    localStorage.setItem('userRole', newUserState.role); // Ensure role is preserved
                }
                
                // Update form fields with potentially new data (e.g. if name changed)
                nameInput.value = data.name;
                emailInput.value = data.email;

                // Clear password fields after successful update
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmNewPasswordInput.value = '';

                // Redirect or reload if email/password was changed
                if (passwordChangeAttempted || (requestBody.email && requestBody.email !== user.email)) {
                     showMessage('profileMessage', 'Profile updated. Redirecting to dashboard...', 'success');
                     setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
                }

            } else {
                showMessage('profileMessage', data.message || 'Error updating profile.', 'error');
            }
        } catch (error) {
            console.error('Error during profile update:', error);
            // authenticatedFetch already handles 401/403, so other errors are network/server
            // showMessage('profileMessage', 'Network error. Please try again.', 'error'); // This is already handled by authenticatedFetch
        }
    });
});