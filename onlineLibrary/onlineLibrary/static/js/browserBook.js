const userDropdownToggle = document.getElementById('user-dropdown-toggle');
const userDropdown = document.getElementById('user-dropdown');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const bookGrid = document.getElementById('book-grid');
const bookList = document.getElementById('book-list');

let currentFilters = {
    categories: [],
    minRating: null,
    availability: [],
    minPages: null,
    maxPages: null,
    sortBy: 'relevance'
};

let booksCount = 0;
let currentPage = 1;
const booksPerPage = 30;
let filtersSetup = false; // Flag to prevent duplicate event listeners

// Helper to get query param
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// Get initial search term
let initialSearchTerm = getQueryParam('search');
if (initialSearchTerm) {
    initialSearchTerm = initialSearchTerm.trim();
}



// SINGLE DOMContentLoaded listener
let initialCategory = getQueryParam('category');
if (initialCategory) {
    console.log("Initial category:", initialCategory);
    // currentFilters.categories.push(initialCategory);
    console.log("Current filters after initial category:", currentFilters.categories);
    // Automatically check the category filter if it exists
}

    applyFilters();

// SINGLE DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', function() {
    if (initialSearchTerm) {
        document.querySelector('.search-input').value = initialSearchTerm;
    }

    const initialCategory = getQueryParam('category');
    if (initialCategory) {
        currentFilters.categories.push(initialCategory);
    }

    setupFilterEvents();
    setupViewToggle();
    setupUserDropdown();

    fetchCategories().then(() => {
        if (initialCategory) {
            // Auto-check the corresponding checkbox
            document.querySelectorAll('[data-filter="categories"] .filter-label').forEach(label => {
                if (label.textContent.trim().toLowerCase() === initialCategory.toLowerCase()) {
                    const checkbox = label.previousElementSibling;
                    if (checkbox) checkbox.checked = true;
                }
            });

            applyFilters();  // 👈 THIS TRIGGERS THE FILTERING
        } else if (initialSearchTerm) {
            fetchBooks(1, initialSearchTerm);
        } else {
            fetchBooks();
        }

        updateFilterCounts();
    });
});

// User dropdown functionality
function setupUserDropdown() {
    if (userDropdownToggle && userDropdown) {
        userDropdownToggle.addEventListener('click', function() {
            userDropdown.classList.toggle('show');
        });

        window.addEventListener('click', function(event) {
            if (!event.target.matches('#user-dropdown-toggle') && !userDropdown.contains(event.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }
}

// View toggle functionality
function setupViewToggle() {
    if (gridViewBtn && listViewBtn && bookGrid && bookList) {
        gridViewBtn.addEventListener('click', function() {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            bookGrid.style.display = 'grid';
            bookList.style.display = 'none';
        });

        listViewBtn.addEventListener('click', function() {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            bookList.style.display = 'block';
            bookGrid.style.display = 'none';
        });
    }
}

function fetchBooks(page = 1, searchTerm = null) {
    currentPage = page;
    let url = `/api/books/?page=${page}&per_page=${booksPerPage}`;

    if (searchTerm && searchTerm.length > 0) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            renderBooks(data);
            booksCount = data.pagination.total_books;
            return data;
        })
        .catch(error => {
            console.error('Error fetching books:', error);
            throw error;
        });
}

function setupFilterEvents() {
    if (filtersSetup) return; // Prevent duplicate setup
    filtersSetup = true;

    // Category filter checkboxes (event delegation)
    const categoriesContainer = document.querySelector('[data-filter="categories"] .filter-options');
    if (categoriesContainer) {
        categoriesContainer.addEventListener('change', function(e) {
            if (e.target.classList.contains('filter-checkbox')) {
                const category = e.target.nextElementSibling.textContent.trim();
                if (e.target.checked) {
                    if (!currentFilters.categories.includes(category)) {
                        currentFilters.categories.push(category);
                    }
                } else {
                    currentFilters.categories = currentFilters.categories.filter(c => c !== category);
                }
                // applyFilters();
            }
        });
    }

    // Rating filter checkboxes
    document.querySelectorAll('[data-filter="rating"] .filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const ratingText = this.nextElementSibling.textContent.trim();
            if (this.checked) {
                // Uncheck other rating checkboxes
                document.querySelectorAll('[data-filter="rating"] .filter-checkbox').forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });

                if (ratingText.includes('5')) currentFilters.minRating = 5;
                else if (ratingText.includes('4')) currentFilters.minRating = 4;
                else if (ratingText.includes('3')) currentFilters.minRating = 3;
                else if (ratingText.includes('2')) currentFilters.minRating = 2;
            } else {
                currentFilters.minRating = null;
            }
            // applyFilters();
        });
    });

    // Availability filter checkboxes
    document.querySelectorAll('[data-filter="availability"] .filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const availability = this.nextElementSibling.textContent.trim();
            const availabilityKey = availability.toLowerCase().replace(' ', '_');
            if (this.checked) {
                if (!currentFilters.availability.includes(availabilityKey)) {
                    currentFilters.availability.push(availabilityKey);
                }
            } else {
                currentFilters.availability = currentFilters.availability.filter(a => a !== availabilityKey);
            }
            // applyFilters();
        });
    });

    // Page range inputs
    const pageInputs = document.querySelectorAll('.filter-range input');
    pageInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.getAttribute('placeholder') === 'Min') {
                currentFilters.minPages = this.value || null;
            } else {
                currentFilters.maxPages = this.value || null;
            }
            // applyFilters();
        });
    });

    // Sort dropdown
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentFilters.sortBy = this.value.toLowerCase().replace(/ /g, '_');
            applyFilters();
        });
    }

    // Clear all filters button
    const clearBtn = document.querySelector('.btn.btn-outline');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }

    // Apply filters button
    const applyBtn = document.querySelector('.btn.btn-primary');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }

    // Browse page search functionality
    const browseSearchInput = document.querySelector('.search-input');
    const browseSearchBtn = document.querySelector('.search-btn');

    if (browseSearchInput && browseSearchBtn) {
        browseSearchBtn.addEventListener('click', function() {
            const term = browseSearchInput.value.trim();
            performSearch(term);
        });

        browseSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const term = browseSearchInput.value.trim();
                performSearch(term);
            }
        });
    }
}

function performSearch(term) {
    if (term.length > 0) {
        // Clear existing filters when performing new search
        clearAllFilters(false); // Don't fetch books yet
        fetchBooks(1, term);

        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('search', term);
        window.history.replaceState({}, '', url);
    } else {
        // Clear search parameter if empty
        const url = new URL(window.location.href);
        url.searchParams.delete('search');
        window.history.replaceState({}, '', url);
        fetchBooks(1);
    }
}

function applyFilters() {
    const queryParams = buildQueryParams();
    fetchBooksWithFilters(queryParams);
    updateFilterCounts();
}

function buildQueryParams() {
    let queryParams = `page=${currentPage}&per_page=${booksPerPage}`;

    // Preserve search term if it exists
    const searchInput = document.querySelector('.search-input');
    if (searchInput && searchInput.value.trim()) {
        queryParams += `&search=${encodeURIComponent(searchInput.value.trim())}`;
    }

    if (currentFilters.categories.length > 0) {
        queryParams += `&categories=${currentFilters.categories.join(',')}`;
    }

    if (currentFilters.minRating) {
        queryParams += `&min_rating=${currentFilters.minRating}`;
    }

    if (currentFilters.availability.length > 0) {
        queryParams += `&availability=${currentFilters.availability.join(',')}`;
    }

    if (currentFilters.minPages) {
        queryParams += `&min_pages=${currentFilters.minPages}`;
    }
    if (currentFilters.maxPages) {
        queryParams += `&max_pages=${currentFilters.maxPages}`;
    }

    queryParams += `&sort_by=${currentFilters.sortBy}`;

    return queryParams;
}

function fetchBooksWithFilters(queryParams) {
    fetch(`/api/books/?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            renderBooks(data);
        })
        .catch(error => console.error('Error fetching books:', error));
}

function renderBooks(data) {
    const booksContainer = document.querySelector('.book-grid');
    if (!booksContainer) return;

    booksContainer.innerHTML = '';

    data.books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.innerHTML = `
            <img src="${book.thumbnail}" alt="${book.title}" width="210">
            <div class="book-status">${book.status}</div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.authors}</p>
                <div class="book-rating">
                    <span class="stars">${'★'.repeat(Math.floor(book.rating)) + '☆'.repeat(5 - Math.floor(book.rating))}</span>
                    <span>${book.rating}</span>
                </div>
            </div>
        `;
        bookCard.addEventListener('click', () => {
            window.location.href = `/preview/?id=${book.id}`;
        });

        booksContainer.appendChild(bookCard);
    });

    updatePaginationControls(data.pagination);
    updateResultsCount(data.pagination.total_items);
}

function updateResultsCount(total) {
    const resultsElement = document.querySelector('.books-found');
    if (resultsElement) {
        const start = (currentPage - 1) * booksPerPage + 1;
        const end = Math.min(currentPage * booksPerPage, total);
        resultsElement.innerHTML = `Showing <strong>${start}-${end}</strong> of <strong>${total}</strong> books`;
    }
}

function updatePaginationControls(pagination) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    currentPage = pagination.current_page;

    paginationContainer.innerHTML = `
        <button ${pagination.current_page === 1 ? 'disabled' : ''} 
                onclick="changePage(${pagination.current_page - 1})">
            Previous
        </button>
        
        <span>Page ${pagination.current_page} of ${pagination.total_pages}</span>
        
        <button ${!pagination.has_next ? 'disabled' : ''} 
                onclick="changePage(${pagination.current_page + 1})">
            Next
        </button>
    `;
}

function changePage(page) {
    const queryParams = buildQueryParams().replace(`page=${currentPage}`, `page=${page}`);
    fetchBooksWithFilters(queryParams);
}

function clearAllFilters(shouldFetch = true) {
    // Reset all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Reset page inputs
    document.querySelectorAll('.filter-range input').forEach(input => {
        input.value = '';
    });

    document.querySelectorAll('.search-input').forEach(input => {
        input.value = '';
    });

    // Reset sort dropdown
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.value = 'Relevance';
    }

    // Reset current filters
    currentFilters = {
        categories: [],
        minRating: null,
        availability: [],
        minPages: null,
        maxPages: null,
        sortBy: 'relevance'
    };

    // Fetch books without filters if requested
    if (shouldFetch) {
        const searchInput = document.querySelector('.search-input');
        const searchTerm = searchInput && searchInput.value.trim() ? searchInput.value.trim() : null;
        fetchBooks(1, searchTerm);
        updateFilterCounts();
    }
}


function fetchCategories() {
    return fetch('/api/categories/')
        .then(response => response.json())
        .then(data => {
            const categoriesContainer = document.querySelector('[data-filter="categories"] .filter-options');
            if (!categoriesContainer) return;

            categoriesContainer.innerHTML = '';

            data.categories.forEach(category => {
                const option = document.createElement('label');
                option.className = 'filter-option';
                option.innerHTML = `
                    <input type="checkbox" class="filter-checkbox">
                    <span class="filter-label">${category.name}</span>
                    <span class="filter-count">(${category.count})</span>
                `;
                categoriesContainer.appendChild(option);
            });

            return data;
        })
        .catch(error => {
            console.error('Error fetching categories:', error);
            throw error;
        });
}

function updateFilterCounts() {
    const queryParams = buildQueryParams();
    fetch(`/api/book-filters/?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            // Update category counts
            document.querySelectorAll('[data-filter="categories"] .filter-option').forEach(option => {
                const label = option.querySelector('.filter-label').textContent.trim();
                const countElement = option.querySelector('.filter-count');
                if (data.categories && data.categories[label] !== undefined) {
                    countElement.textContent = `(${data.categories[label]})`;
                }
            });

            // Update rating counts
            document.querySelectorAll('[data-filter="rating"] .filter-option').forEach(option => {
                const label = option.querySelector('.filter-label').textContent.trim();
                const countElement = option.querySelector('.filter-count');
                if (label.includes('5') && data.ratings && data.ratings['5_stars'] !== undefined) {
                    countElement.textContent = `(${data.ratings['5_stars']})`;
                } else if (label.includes('4') && data.ratings && data.ratings['4_stars'] !== undefined) {
                    countElement.textContent = `(${data.ratings['4_stars']})`;
                } else if (label.includes('3') && data.ratings && data.ratings['3_stars'] !== undefined) {
                    countElement.textContent = `(${data.ratings['3_stars']})`;
                } else if (label.includes('2') && data.ratings && data.ratings['2_stars'] !== undefined) {
                    countElement.textContent = `(${data.ratings['2_stars']})`;
                }
            });

            // Update availability counts
            document.querySelectorAll('[data-filter="availability"] .filter-option').forEach(option => {
                const label = option.querySelector('.filter-label').textContent.trim();
                const countElement = option.querySelector('.filter-count');
                if (label.includes('Available Now') && data.availability && data.availability['available'] !== undefined) {
                    countElement.textContent = `(${data.availability['available']})`;
                }
            });

            // Update page counts
            document.querySelectorAll('[data-filter="pages"] .filter-option').forEach(option => {
                const label = option.querySelector('.filter-label').textContent.trim();
                const countElement = option.querySelector('.filter-count');
                if (label.includes('Under 200') && data.pages && data.pages['under_200'] !== undefined) {
                    countElement.textContent = `(${data.pages['under_200']})`;
                } else if (label.includes('200-400') && data.pages && data.pages['200_400'] !== undefined) {
                    countElement.textContent = `(${data.pages['200_400']})`;
                } else if (label.includes('Over 400') && data.pages && data.pages['over_400'] !== undefined) {
                    countElement.textContent = `(${data.pages['over_400']})`;
                }
            });
        })
        .catch(error => console.error('Error fetching filter counts:', error));
}

// Listen for global-search event
window.addEventListener('global-search', function(e) {
    const term = e.detail.term;
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = term;
    }
    performSearch(term);
});