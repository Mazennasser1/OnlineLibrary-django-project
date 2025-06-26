document.getElementById('admin-signup').addEventListener('change', function() {
    const securityContainer = document.getElementById('admin-security-container');
    if (this.checked) {
        securityContainer.style.display = 'block';
    } else {
        securityContainer.style.display = 'none';
        document.getElementById('admin-security-code').value = '';
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('signup-password');
    const strengthMeter = document.querySelector('.strength-meter-fill');
    const strengthText = document.getElementById('password-strength-text');

    function updateStrengthMeter() {
        const password = passwordInput.value;
        let strength = 0;

        if (password.length > 0) {
            if (password.length >= 8) strength += 1;

            if (/[A-Z]/.test(password)) strength += 1;
            if (/[a-z]/.test(password)) strength += 1;
            if (/[0-9]/.test(password)) strength += 1;
            if (/[^A-Za-z0-9]/.test(password)) strength += 1;


            const widthPercentage = (strength / 5) * 100;

            strengthMeter.style.cssText = `width: ${widthPercentage}% !important`;


            if (strength <= 2) {
                strengthMeter.className = 'strength-meter-fill meter-weak';
                strengthText.textContent = 'Weak';
                strengthText.className = 'text-weak';
            } else if (strength <= 4) {
                strengthMeter.className = 'strength-meter-fill meter-medium';
                strengthText.textContent = 'Medium';
                strengthText.className = 'text-medium';
            } else {
                strengthMeter.className = 'strength-meter-fill meter-strong';
                strengthText.textContent = 'Strong';
                strengthText.className = 'text-strong';
            }
        } else {
            strengthMeter.className = 'strength-meter-fill';
            strengthMeter.style.cssText = 'width: 0 !important';
            strengthText.textContent = '';
        }
    }

    passwordInput.addEventListener('input', updateStrengthMeter);
    passwordInput.addEventListener('keyup', updateStrengthMeter);
    passwordInput.addEventListener('change', updateStrengthMeter);

    updateStrengthMeter();
});