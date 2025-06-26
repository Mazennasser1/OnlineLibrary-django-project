document.getElementById('login-toggle').addEventListener('change', function() {
    const loginButton = document.getElementById('login-button');
    const loginTitle = document.querySelector('.auth-title');

    if (this.checked) {
        loginButton.textContent = 'Admin Login';
        loginTitle.textContent = 'Admin Login';
    } else {
        loginButton.textContent = 'Log In';
        loginTitle.textContent = 'Welcome Back';
    }
});

document.getElementById('forgot-password-link').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
});

document.getElementById('back-to-login').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});


document.addEventListener('DOMContentLoaded', function() {
    const routes = {
        'home': './main.html',
        'browse': './browserBook.html', // Placeholder for browse page
        'about-us': 'about-us.html',
        'contact': '#', // Placeholder for contact page
        'login': 'login.html',
        'signup': 'signup.html',
        'reset-password': 'restPassword.html'
    };

    const navLinks = document.querySelectorAll('.nav-link, .logo');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            let targetPage;

            if (this.classList.contains('logo')) {
                targetPage = 'home';
            } else {
                const linkText = this.textContent.toLowerCase();

                if (linkText.includes('home')) targetPage = 'home';
                else if (linkText.includes('browse')) targetPage = 'browse';
                else if (linkText.includes('about')) targetPage = 'about-us';
                else if (linkText.includes('contact')) targetPage = 'contact';
                else if (linkText.includes('login')) targetPage = 'login';
            }

            if (targetPage && routes[targetPage]) {
                window.location.href = routes[targetPage];
            }
        });
    });

    document.getElementById('signup-link').addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = routes['signup'];
    });

    const socialButtons = document.querySelectorAll('.social-btn');
    socialButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const provider = this.textContent.trim();
            alert(`${provider} login functionality would be implemented here.`);
        });
    });

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkText = link.textContent.toLowerCase();
        if (currentPage === 'login' && linkText.includes('login')) {
            link.classList.add('active');
        }
    });
});