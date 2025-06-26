const routes = {
    main: "/WEBBY-3LEK/onlineLibrary/templates/main.html",
    aboutUs: "/WEBBY-3LEK/mezo-version/aboutUs.html",
    admin: "/WEBBY-3LEK/mezo-version/admin.html",
    // browser: "/browserBook.html",
    login: "/WEBBY-3LEK/mezo-version/Login-SignUp.html",
    preview: "/WEBBY-3LEK/mezo-version/previewBook.html",
    resetPassword: "/WEBBY-3LEK/mezo-version/restPassword.html",
    signup: "/WEBBY-3LEK/mezo-version/Login-SignUp.html",
    userDashboard: "/WEBBY-3LEK/mezo-version/userDashboard.html",
    err: "/WEBBY-3LEK/mezo-version/404.html",
};

function goToPage(route, query = "") {
    if (routes[route]) {
        const fullUrl = window.location.origin + routes[route] + query;
        console.log("goToPage " + fullUrl);
        window.location.href = fullUrl;
    } else {
        console.error("Page not found!");
        window.location.href = window.location.origin + routes["err"];
    }
}

function setupGlobalSearch() {
    // Find all search bars (in navs, main, etc.)
    const searchInputs = document.querySelectorAll('.search-input');
    const searchBtns = document.querySelectorAll('.search-btn');
    function doSearch(input) {
        const term = input.value.trim();
        if (term.length > 0) {
            // Always redirect to browse page with search param
            window.location.href = '/browse/?search=' + encodeURIComponent(term);
        }
    }
    searchBtns.forEach((btn, i) => {
        // Try to pair each button with its input (by DOM proximity)
        let input = btn.closest('.search-container')?.querySelector('.search-input') || searchInputs[i] || searchInputs[0];
        if (!input) return;
        btn.addEventListener('click', function() { doSearch(input); });
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(input); });
    });
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalSearch);
} else {
    setupGlobalSearch();
}