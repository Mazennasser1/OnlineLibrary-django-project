document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    const switchToSignupLink = document.getElementById('switch-to-signup');
    const switchToLoginLink2 = document.getElementById('switch-to-login-2');
    const adminSecurityContainer = document.getElementById('admin-security-container');
    const signupFormElement = document.getElementById('signup-form-element');
    const usernameInput = document.getElementById('id_username');
    const emailInput = document.getElementById('id_email');
    const password1Input = document.getElementById('id_password1');
    const password2Input = document.getElementById('id_password2');
    const strengthMeter = document.getElementById('password-strength-meter');
    const strengthText = document.getElementById('password-strength-text');
    const loginToggle = document.getElementById('login-toggle');
    const adminSecurityCode = document.getElementById('admin-security-code');

    // State variables
    let usernameValid = false;
    let emailValid = false;

    // Form display functions
    function showLoginForm() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        forgotPasswordForm.style.display = 'none';
    }

    function showSignupForm() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
        forgotPasswordForm.style.display = 'none';
    }

    function showForgotPasswordForm() {
        loginForm.style.display = 'none';
        signupForm.style.display = 'none';
        forgotPasswordForm.style.display = 'block';
        loginTab.classList.remove('active');
        signupTab.classList.remove('active');
    }

    // Utility functions
    function debounce(func, timeout = 500) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    function toggleValidationState(inputElement, isValid) {
        if (isValid) {
            inputElement.classList.remove('is-invalid');
            inputElement.classList.add('is-valid');
        } else {
            inputElement.classList.remove('is-valid');
            inputElement.classList.add('is-invalid');
        }
    }

    // Validation functions
    function validateUsername() {
        const isValid = usernameInput.checkValidity();
        toggleValidationState(usernameInput, isValid);
        return isValid;
    }

    function validateEmail() {
        const isValid = emailInput.checkValidity();
        toggleValidationState(emailInput, isValid);
        return isValid;
    }

    function validatePassword1() {
        const password = password1Input.value;
        const username = usernameInput.value.toLowerCase();

        const rules = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            username: !username || !password.toLowerCase().includes(username)
        };

        // Update UI for each rule
        for (let rule in rules) {
            const element = document.getElementById(`rule-${rule}`);
            if (element) {
                if (rules[rule]) {
                    element.classList.remove('text-danger');
                    element.classList.add('text-success');
                } else {
                    element.classList.remove('text-success');
                    element.classList.add('text-danger');
                }
            }
        }

        // Final result
        const isValid = Object.values(rules).every(Boolean);
        toggleValidationState(password1Input, isValid);

        // Also validate password2 when password1 changes
        if (password2Input.value) {
            validatePassword2();
        }

        return isValid;
    }

    function validatePassword2() {
        const password1 = password1Input.value;
        const password2 = password2Input.value;
        const isValid = password2 && password1 === password2;
        toggleValidationState(password2Input, isValid);
        return isValid;
    }

    function checkPasswordStrength() {
        const password = password1Input.value;
        const username = usernameInput.value.toLowerCase();
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (username && password.toLowerCase().includes(username)) {
            strength = Math.max(0, strength - 2);
            if (strengthText) {
                strengthText.textContent = 'Weak (contains username)';
            }
            if (strengthMeter) {
                strengthMeter.style.width = '20%';
                strengthMeter.style.backgroundColor = '#dc3545';
            }
            return;
        }

        const strengthPercent = Math.min(100, strength * 20);
        if (strengthMeter) {
            strengthMeter.style.width = strengthPercent + '%';
        }

        if (strengthText) {
            if (strength <= 2) {
                if (strengthMeter) strengthMeter.style.backgroundColor = '#dc3545';
                strengthText.textContent = 'Weak';
            } else if (strength <= 4) {
                if (strengthMeter) strengthMeter.style.backgroundColor = '#ffc107';
                strengthText.textContent = 'Medium';
            } else {
                if (strengthMeter) strengthMeter.style.backgroundColor = '#28a745';
                strengthText.textContent = 'Strong';
            }
        }
    }

    function validateForm() {
        return validateUsername() &&
               validateEmail() &&
               validatePassword1() &&
               validatePassword2();
    }

    // Availability check functions
    function showUsernameAvailable() {
        const feedbackEl = document.querySelector('.username-feedback');
        const takenEl = document.querySelector('.username-taken');
        const availableEl = document.querySelector('.username-available');

        if (feedbackEl) feedbackEl.style.display = 'none';
        if (takenEl) takenEl.style.display = 'none';
        if (availableEl) availableEl.style.display = 'block';

        usernameInput.classList.remove('is-invalid');
        usernameInput.classList.add('is-valid');
    }

    function showUsernameTaken() {
        const feedbackEl = document.querySelector('.username-feedback');
        const availableEl = document.querySelector('.username-available');
        const takenEl = document.querySelector('.username-taken');

        if (feedbackEl) feedbackEl.style.display = 'none';
        if (availableEl) availableEl.style.display = 'none';
        if (takenEl) takenEl.style.display = 'block';

        usernameInput.classList.remove('is-valid');
        usernameInput.classList.add('is-invalid');
    }

    function showEmailAvailable() {
        const feedbackEl = document.querySelector('.email-feedback');
        const takenEl = document.querySelector('.email-taken');
        const availableEl = document.querySelector('.email-available');

        if (feedbackEl) feedbackEl.style.display = 'none';
        if (takenEl) takenEl.style.display = 'none';
        if (availableEl) availableEl.style.display = 'block';

        emailInput.classList.remove('is-invalid');
        emailInput.classList.add('is-valid');
    }

    function showEmailTaken() {
        const feedbackEl = document.querySelector('.email-feedback');
        const availableEl = document.querySelector('.email-available');
        const takenEl = document.querySelector('.email-taken');

        if (feedbackEl) feedbackEl.style.display = 'none';
        if (availableEl) availableEl.style.display = 'none';
        if (takenEl) takenEl.style.display = 'block';

        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
    }

    function toggleAdminMode(isAdmin) {
        if (isAdmin) {
            document.body.classList.add('admin-mode');
            if (adminSecurityContainer) {
                adminSecurityContainer.style.display = 'block';
            }
        } else {
            document.body.classList.remove('admin-mode');
            if (adminSecurityContainer) {
                adminSecurityContainer.style.display = 'none';
            }
        }
    }

    // Event listeners
    if (loginTab) loginTab.addEventListener('click', showLoginForm);
    if (signupTab) signupTab.addEventListener('click', showSignupForm);

    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    if (switchToSignupLink) {
        switchToSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupForm();
        });
    }

    if (switchToLoginLink2) {
        switchToLoginLink2.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginForm();
        });
    }

    if (loginToggle) {
        loginToggle.addEventListener('change', function() {
            toggleAdminMode(this.checked);
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', debounce(function() {
            const username = usernameInput.value.trim();
            if (username.length >= 4 && /^[a-zA-Z0-9_]+$/.test(username)) {
                fetch(`/check-username/?username=${encodeURIComponent(username)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.exists) {
                            showUsernameTaken();
                            usernameValid = false;
                        } else {
                            showUsernameAvailable();
                            usernameValid = true;
                        }
                    })
                    .catch(error => {
                        console.error('Error checking username:', error);
                    });
            }
            // Re-validate password when username changes (for username inclusion rule)
            if (password1Input && password1Input.value) {
                validatePassword1();
                checkPasswordStrength();
            }
        }));
    }

    if (emailInput) {
        emailInput.addEventListener('input', debounce(function() {
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(email)) {
                fetch(`/check-email/?email=${encodeURIComponent(email)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.exists) {
                            showEmailTaken();
                            emailValid = false;
                        } else {
                            showEmailAvailable();
                            emailValid = true;
                        }
                    })
                    .catch(error => {
                        console.error('Error checking email:', error);
                    });
            }
            validateEmail();
        }));
    }

    if (password1Input) {
        password1Input.addEventListener('input', function() {
            validatePassword1();
            checkPasswordStrength();
        });
    }

    if (password2Input) {
        password2Input.addEventListener('input', validatePassword2);
    }

    if (signupFormElement) {
        signupFormElement.addEventListener('submit', function(event) {
            if (!validateForm() || !usernameValid || !emailValid) {
                event.preventDefault();
                event.stopPropagation();
                if (!usernameValid || !emailValid) {
                    alert('Please ensure both username and email are available before submitting');
                }
                return;
            }

            if (loginToggle && loginToggle.checked) {
                const securityCode = adminSecurityCode ? adminSecurityCode.value : '';
                if (securityCode !== "1235") {
                    event.preventDefault();
                    alert('Invalid admin security code');
                    return;
                }
            }
            signupFormElement.classList.add('was-validated');
        });
    }

    // Check URL for action parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'signup') {
        showSignupForm();
    }

    // Initialize password validation on page load if there's already content
    if (password1Input && password1Input.value) {
        validatePassword1();
        checkPasswordStrength();
    }
});