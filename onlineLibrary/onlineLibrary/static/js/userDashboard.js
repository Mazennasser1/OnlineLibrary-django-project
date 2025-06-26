const userDropdownToggle = document.getElementById('user-dropdown-toggle');
const userDropdown = document.getElementById('user-dropdown');

userDropdownToggle.addEventListener('click', function () {
    userDropdown.classList.toggle('show');
});

window.addEventListener('click', function (event) {
    if (!event.target.matches('#user-dropdown-toggle') && !userDropdown.contains(event.target)) {
        userDropdown.classList.remove('show');
    }
});


const tabs = document.querySelectorAll('.user-tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', function () {

        tabs.forEach(t => t.classList.remove('active'));

        this.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));

        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // Create AJAX request
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/content/${tabId}`, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    tabContents.forEach(content => content.classList.remove('active'));


                    document.getElementById(tabId).innerHTML = xhr.responseText;
                    document.getElementById(tabId).classList.add('active');
                } else {
                    console.error('Error loading tab content');
                }
            }
        };

        xhr.send();
    });
});

const viewBookBtns = document.querySelectorAll('.view-book-btn');
const bookModal = document.getElementById('book-modal');
const closeModal = document.getElementById('close-modal');
const closeModalBtn = document.getElementById('close-modal-btn');


function viewBook(bookId) {
    window.location.href = `/preview/?id=${bookId}`;
}


closeModal.addEventListener('click', function () {
    bookModal.style.display = 'none';
});

closeModalBtn.addEventListener('click', function () {
    bookModal.style.display = 'none';
});

window.addEventListener('click', function (event) {
    if (event.target === bookModal) {
        bookModal.style.display = 'none';
    }
});
document.addEventListener('DOMContentLoaded', function () {
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(bookCard => {
        bookCard.addEventListener('click', function () {

            const bookId = this.getAttribute('data-book-id');
            window.location.href = `previewBook.html`


        });
    })

})

document.addEventListener('DOMContentLoaded', function () {
    loadBorrowedBooks()
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(bookCard => {
        bookCard.addEventListener('click', function () {

            const bookId = this.getAttribute('data-book-id');
            window.location.href = `previewBook.html`


        });
    })
})

async function loadBorrowedBooks() {
    console.log('Loading borrowed books...');
    try {
        const response = await fetch('/api/user/borrowed-books/');
        if (!response.ok) throw new Error('Failed to fetch books');

        const data = await response.json();
        displayBorrowedBooks(data.books);
    } catch (error) {
        console.error('Error loading borrowed books:', error);
    }
}

function displayBorrowedBooks(books) {
    const container = document.querySelector('#current-books .table-responsive tbody');
    if (!container) return;


    container.innerHTML = books.map(book => `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    <img src="${book.thumbnail || '/static/images/default-book.png'}" alt="${book.title}" alt="Book Cover"
                        style="width:50px; height:75px; object-fit:cover; margin-right: 1rem;">
                    <div>
                        <div style="font-weight: 600;">${book.title}</div>
                        <div style="font-size: 0.9rem; color: var(--gray);">${book.authors}</div>
                    </div>
                </div>
            </td>
            <td>${book.borrow_date}</td>
            <td><span class="status-badge status-active">${book.due_date}</span></td>
<!--            <td>-->
<!--                <div class="progress-container">-->
<!--                    <div class="progress-bar" style="width: 75%;"></div>-->
<!--                </div>-->
<!--                <div class="progress-text">75% completed</div>-->
<!--            </td>-->
            <td>
                <button class="btn btn-primary btn-sm view-book-btn" onclick="viewBook(${book.id})" data-id="1">View</button>
                <button class="btn btn-primary btn-sm" onclick="returnBook(${book.id}, ${book.borrowing_id})">Return</button>
            </td>
        </tr>
    `).join('');
}


async function returnBook(bookId, borrowingId) {
    try {
        const response = await fetch('/api/admin/return/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                book_id: bookId,
                borrowing_id: borrowingId,
                action: 'return'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to return book');
        }

        alert('Book returned successfully!');
        loadBorrowedBooks(); // Reload the list
    } catch (error) {
        console.error('Error returning book:', error);
        alert(error.message || 'Failed to return book. Please try again.');
    }
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}


document.addEventListener('DOMContentLoaded', function () {
    fetchBooks()
    fetchUserReviews()
    const profileForm = document.getElementById('profile-form');

    if (profileForm) {
        profileForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(profileForm);

            fetch(profileForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': profileForm.querySelector('[name=csrfmiddlewaretoken]').value,
                }
            })
                .then(response => {
                    if (response.ok) {
                        // Show success message
                        alert('Profile updated successfully!');
                        // You can reload the page or update the UI as needed
                        window.location.reload();
                    } else {
                        throw new Error('Failed to update profile');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while updating your profile.');
                });
        });
    }
    loadBorrowedBooks()

});


function fetchBooks() {
    fetch('/api/books/?limit=4&random=true')
        .then(response => response.json())
        .then(data => {
            const booksContainers = document.querySelectorAll('.book-grid');

            // Clear all containers first
            booksContainers.forEach(container => {
                container.innerHTML = '';
            });

            // Distribute books across containers (4 per container)
            booksContainers.forEach((container, index) => {
                const startIdx = index * 4;
                const endIdx = startIdx + 4;
                const containerBooks = data.books.slice(startIdx, endIdx);

                containerBooks.forEach(book => {
                    const bookCard = document.createElement('div');
                    bookCard.className = 'book-card';
                    bookCard.innerHTML = `
                        <img src="${book.thumbnail}" alt="${book.title}" width="210">
                  
                        <div class="book-info">
                            <h3 class="book-title">${book.title}</h3>
                            <p class="book-author">${book.authors}</p>
                            <div class="book-category">${book.category}</div>
                            <div class="book-actions">
                                    <button class="btn btn-primary btn-sm">Borrow</button>
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

function handleHistoryTab() {
    fetch('/api/reading-history/')
        .then(response => response.json())
        .then(data => {
            const historyTable = document.querySelector('#history tbody');
            historyTable.innerHTML = '';

            data.history.forEach(record => {
                const row = document.createElement('tr');

                // Create rating stars HTML
                let starsHtml = '';
                const rating = record.rating || 0;
                for (let i = 1; i <= 5; i++) {
                    starsHtml += `<span class="rating-star ${i <= rating ? 'filled' : ''}">★</span>`;
                }

                row.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center;">
                            <img src="${record.book.cover_url}" alt="Book Cover"
                                style="width:50px; height:75px; object-fit:cover; margin-right: 1rem;">
                            <div>
                                <div style="font-weight: 600;">${record.book.title}</div>
                                <div style="font-size: 0.9rem; color: var(--gray);">${record.book.author}</div>
                            </div>
                        </div>
                    </td>
                    <td>${new Date(record.borrow_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                })}</td>
                    <td>${new Date(record.return_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                })}</td>
                    <td>
                        <div class="rating">
                            ${starsHtml}
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-primary btn-sm borrow-again-btn" data-book-id="${record.book.id}">Borrow Again</button>
                        <button class="btn btn-secondary btn-sm write-review-btn" data-book-id="${record.book.id}">Write Review</button>
                    </td>
                `;
                const reviewBtn = row.querySelector('.write-review-btn');

                reviewBtn.addEventListener('click', function () {
                    writeReview(record.book.id);
                });

                historyTable.appendChild(row);

            });
            document.addEventListener('click', function (e) {
                if (e.target && e.target.classList.contains('borrow-again-btn')) {
                    const bookId = e.target.dataset.bookId;
                    handleBorrowClick(bookId);
                }
            });
        })
        .catch(error => console.error('Error fetching reading history:', error));
}


function writeReview(bookId) {
    window.location.href = `/preview/?id=${bookId}`;
}

function handleBorrowClick(bookId) {  // Add bookId parameter
    console.log("Borrow button clicked");
    const modal = document.getElementById('borrow-modal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('borrow-form');
    const returnDateInput = document.getElementById('return-date');

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    returnDateInput.min = tomorrow.toISOString().split('T')[0];

    modal.classList.add('show');

    closeBtn.onclick = function () {
        modal.classList.remove('show');
    }

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    }

    form.onsubmit = async function (e) {
        e.preventDefault();
        const returnDate = returnDateInput.value;
        // Use the bookId parameter instead of URL search params
        try {
            const response = await fetch('/api/admin/borrow/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    book_id: bookId,  // Use the passed bookId
                    return_date: returnDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to borrow book');
            }

            const result = await response.json();
            alert('Book borrowed successfully!');
            modal.classList.remove('show');

            // Refresh the borrowed books list instead
            loadBorrowedBooks();
        } catch (error) {
            console.error('Error borrowing book:', error);
            alert(error.message);
        }
    }
}

// Add this helper function if not already present
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Add click event listener to borrow button


function fetchUserReviews() {
    fetch('/api/user-reviews/')
        .then(response => response.json())
        .then(data => {
            const reviewsContainer = document.querySelector('#history .review-container');
            if (!reviewsContainer) return;

            reviewsContainer.innerHTML = '';

            data.reviews.forEach(review => {
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += `<span class="rating-star ${i <= review.rating ? 'filled' : ''}">★</span>`;
                }

                const reviewElement = document.createElement('div');
                reviewElement.className = 'review-card';
                reviewElement.innerHTML = `
                    <div class="review-header">
                        <div class="review-book">${review.book_title} by ${review.book_author}</div>
                        <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="rating mb-2">
                        ${starsHtml}
                    </div>
                    <p>${review.comment || 'No comment provided'}</p>
                `;

                reviewsContainer.appendChild(reviewElement);
            });
        });
}

// Update the tab click handler to include history tab
tabs.forEach(tab => {
    tab.addEventListener('click', function () {
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        async function loadBorrowedBooks() {
            console.log('Loading borrowed books...');
            try {
                const response = await fetch('/api/user/borrowed-books/');
                if (!response.ok) throw new Error('Failed to fetch books');

                const data = await response.json();
                displayBorrowedBooks(data.books);
            } catch (error) {
                console.error('Error loading borrowed books:', error);
            }
        }

        function displayBorrowedBooks(books) {
            const container = document.querySelector('#current-books .table-responsive tbody');
            if (!container) return;


            container.innerHTML = books.map(book => `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    <img src="${book.thumbnail || '/static/images/default-book.png'}" alt="${book.title}" alt="Book Cover"
                        style="width:50px; height:75px; object-fit:cover; margin-right: 1rem;">
                    <div>
                        <div style="font-weight: 600;">${book.title}</div>
                        <div style="font-size: 0.9rem; color: var(--gray);">${book.authors}</div>
                    </div>
                </div>
            </td>
            <td>${book.borrow_date}</td>
            <td><span class="status-badge status-active">${book.due_date}</span></td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar" style="width: 75%;"></div>
                </div>
                <div class="progress-text">75% completed</div>
            </td>
            <td>
                <button class="btn btn-primary btn-sm view-book-btn" onclick="viewBook(${book.id})" data-id="1">View</button>
                <button class="btn btn-secondary btn-sm renew-book-btn"
                    data-id="1">Renew</button>
                    <button class="btn btn-primary btn-sm" onclick="returnBook(${book.id})">Return</button>
            </td>
        </tr>
    `).join('');
        }

        function returnBook(bookId) {
            try {
                const response = fetch('/api/return-book/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({book_id: bookId})
                });

                if (!response.ok) throw new Error('Failed to return book');

                // Reload the borrowed books list
                loadBorrowedBooks();
            } catch (error) {
                console.error('Error returning book:', error);
            }
        }

// Helper function to get CSRF token
        function getCsrfToken() {
            return document.querySelector('[name=csrfmiddlewaretoken]').value;
        }

        // Handle specific tab content loading
        if (tabId === 'history') {
            handleHistoryTab();
        } else if (tabId === 'recommendations') {
            fetchBooks();
        }
    });
});
