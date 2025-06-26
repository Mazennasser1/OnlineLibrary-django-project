
document.addEventListener('DOMContentLoaded', function() {

    const routes = {
        'home': './main.html',
        'browse': '#', // Placeholder for browse page
        'about-us': 'about-us.html',
        'contact': '#', // Placeholder for contact page
        'login': 'login.html',
        'signup': 'signup.html',
        'learn-more': '#' // Placeholder for learn more page
    };

    const navLinks = document.querySelectorAll('.nav-link, .logo, .btn');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            let targetPage;

            if (this.classList.contains('logo')) {
                targetPage = 'home';
            } else if (this.classList.contains('btn')) {
                if (this.textContent.includes('Create an Account')) {
                    targetPage = 'signup';
                } else if (this.textContent.includes('Learn More')) {
                    targetPage = 'learn-more';
                }
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

                document.querySelectorAll('.nav-link').forEach(navItem => {
                    navItem.classList.remove('active');
                    if (navItem.textContent.toLowerCase().includes(targetPage.replace('-', ' '))) {
                        navItem.classList.add('active');
                    }
                });
            }
        });
    });

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.textContent.toLowerCase().includes(currentPage.replace('-', ' '))) {
            link.classList.add('active');
        }
    });
});