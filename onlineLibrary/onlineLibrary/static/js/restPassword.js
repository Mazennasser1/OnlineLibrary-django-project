
    // Get elements
    const resetForm = document.getElementById('reset-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetSuccess = document.getElementById('reset-success');
    const backToLoginLink = document.getElementById('back-to-login');
    const gotoLoginBtn = document.getElementById('goto-login');

    // Password strength meter
    const passwordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const strengthMeter = document.querySelector('.strength-meter-fill');
    const strengthText = document.getElementById('password-strength-text');

    passwordInput.addEventListener('input', function() {
    const password = this.value;
    let strength = 0;

    if (password.length > 0) {
        if (password.length >= 8) strength += 1;


        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;


        if (strength <= 2) {
        strengthMeter.className = 'strength-meter-fill meter-weak';
        strengthText.className = 'text-weak';
        strengthText.textContent = 'Weak';
        } else if (strength <= 4) {
            strengthMeter.className = 'strength-meter-fill meter-medium';
            strengthText.className = 'text-medium';
            strengthText.textContent = 'Medium';
        } else {
            strengthMeter.className = 'strength-meter-fill meter-strong';
            strengthText.className = 'text-strong';
            strengthText.textContent = 'Strong';
        }
    } else {

        strengthMeter.className = 'strength-meter-fill';
        strengthMeter.style.width = '0';
        strengthText.textContent = '';
    }
});


    confirmPasswordInput.addEventListener('input', function () {
    let feedback = this.parentNode.querySelector('.invalid-feedback');

    if (this.value !== passwordInput.value) {
    this.classList.add('is-invalid');

    if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = 'Passwords do not match';
    this.parentNode.appendChild(feedback);
}
} else {
    this.classList.remove('is-invalid');

    if (feedback) {
    feedback.remove();
}
}
});


    resetForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (passwordInput.value !== confirmPasswordInput.value) {
    alert('Passwords do not match');
    return;
}

    if (passwordInput.value.length < 8) {
    alert('Password must be at least 8 characters long');
    return;
}

    resetPasswordForm.style.display = 'none';
    resetSuccess.style.display = 'block';
});

    backToLoginLink.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Redirecting to login page...');
});

    gotoLoginBtn.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Redirecting to login page...');
});
    const passwordToggles = document.querySelectorAll('.password-toggle');

    passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const eyeOpen = this.querySelector('.eye-open');
        const eyeClosed = this.querySelector('.eye-closed');

        if (input.type === 'password') {
            input.type = 'text';
            input.classList.add('password-visible');
            eyeClosed.style.display = 'none';
            eyeOpen.style.display = 'block';
        } else {
            input.type = 'password';
            input.classList.remove('password-visible');
            eyeClosed.style.display = 'block';
            eyeOpen.style.display = 'none';
        }
    });
});

