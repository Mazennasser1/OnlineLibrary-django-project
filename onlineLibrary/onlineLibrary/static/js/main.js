const userDropdownToggle = document.getElementById('user-dropdown-toggle');
const userDropdown = document.getElementById('user-dropdown');


document.addEventListener('DOMContentLoaded', function () {
    fetchBooks();
    setupEventListeners();
});



function setupEventListeners() {
    // User dropdown toggle
    userDropdownToggle.addEventListener('click', function () {
        userDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    window.addEventListener('click', function (event) {
        if (!event.target.matches('#user-dropdown-toggle') && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('show');
        }
    });

    const categories = document.querySelectorAll('.category-circle')
    categories.forEach(category => {
        category.addEventListener('click', function () {


        });
    })

    // Categories scroll
    const categoriesScroll = document.querySelector('.categories-scroll');
    if (categoriesScroll) {
        categoriesScroll.addEventListener('wheel', (e) => {
            e.preventDefault();
            categoriesScroll.scrollLeft += e.deltaY;
        });
    }
}

function showPage(pageId) {
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

function fetchBooks() {
    fetch('/api/books/?limit=15&random=true')
        .then(response => response.json())
        .then(data => {
            const booksContainers = document.querySelectorAll('.book-grid');

            // Clear all containers first
            booksContainers.forEach(container => {
                container.innerHTML = '';
            });

            // Distribute books across containers (5 per container)
            booksContainers.forEach((container, index) => {
                const startIdx = index * 5;
                const endIdx = startIdx + 5;
                const containerBooks = data.books.slice(startIdx, endIdx);

                containerBooks.forEach(book => {
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

                    // Add click event to each book card
                    bookCard.addEventListener('click', () => {
                        window.location.href = `/preview/?id=${book.id}`;
                    });

                    container.appendChild(bookCard);
                });
            });
        })
        .catch(error => console.error('Error fetching books:', error));
}