/* script/index.js */
document.addEventListener('DOMContentLoaded', () => {
    const papaiBtn = document.getElementById('papai-btn');
    const modal = document.getElementById('password-modal');
    const cancelBtn = document.getElementById('cancel-password');
    const confirmBtn = document.getElementById('confirm-password');
    const passwordInput = document.getElementById('admin-password');
    const errorMsg = document.getElementById('password-error');

    const FIXED_PASSWORD = "420933";

    papaiBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        passwordInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        passwordInput.value = '';
        errorMsg.classList.add('hidden');
    });

    const handleLogin = () => {
        if (passwordInput.value === FIXED_PASSWORD) {
            window.location.href = 'papai.html';
        } else {
            errorMsg.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
            
            // Shake effect
            modal.querySelector('.card').style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                modal.querySelector('.card').style.animation = '';
            }, 400);
        }
    };

    confirmBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});

// Shake animation style
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}
`;
document.head.appendChild(style);
