document.addEventListener('DOMContentLoaded', function () {
    // Get book ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');

    if (bookId) {
        fetchBookDetails(bookId);
        // Update the URL to match Django's URL pattern
        fetch(`/get_reviews/?book_id=${bookId}`)
            .then(response => response.json())
            .then(reviews => {
                reviews.forEach(addReviewToList);
            })
            .catch(error => {
                console.error('Error fetching reviews:', error);
            });
    } else {
        // Handle case where no book ID is provided
        console.error('No book ID provided in URL');
    }

    // Existing tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabContents.forEach((content, index) => {
        if (index !== 0) {
            content.style.display = 'none';
        }
    });

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            tabContents[index].style.display = 'block';
        });
    });
    // Review form submission
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const rating = document.getElementById('rating').value;
            const comment = document.getElementById('review-comment').value;
            const bookId = document.getElementById('book-id').value;

            if (!comment) {
                alert('Please provide a comment');
                return;
            }
            if (!rating) {
                alert('Please provide a rating');
                return;
            }

            try {
                // Update the URL to match Django's URL pattern
                const response = await fetch('/add_review/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({
                        book_id: bookId,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to submit review');
                }

                const newReview = await response.json();
                addReviewToList(newReview);
                reviewForm.reset();
                alert('Review submitted successfully!');
            } catch (error) {
                console.error('Error submitting review:', error);
                alert('Failed to submit review. Please try again.');
            }
        });
    }

    // Existing dropdown functionality
    const userDropdownToggle = document.getElementById('user-dropdown-toggle');
    const userDropdown = document.getElementById('user-dropdown');

    userDropdownToggle.addEventListener('click', function () {
        userDropdown.classList.toggle('show');
    });

    window.addEventListener('click', function (event) {
        if (!event.target.matches('#user-dropdown-toggle')) {
            if (userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        }
    });
    const borrowBtn = document.getElementById('borrow-btn');
    console.log('Borrow button element:', borrowBtn); // Check if this logs the button
    if (borrowBtn) {
        borrowBtn.addEventListener('click', handleBorrowClick);
    }
});

function fetchBookDetails(bookId) {
    fetch(`/api/books/${bookId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Book not found');
            }
            return response.json();
        })
        .then(book => {
            // Update the page with book details
            updateBookDetails(book);
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            // You could show an error message to the user here
        });
}

function updateBookDetails(book) {
    // Update main book details
    document.querySelector('.book-cover-large').src = book.thumbnail || '/static/images/default-book.png';
    document.querySelector('.book-title-large').textContent = book.title;
    document.querySelector('.book-author-large').textContent = `By ${book.authors}`;

    // Update rating
    const stars = '★'.repeat(Math.floor(book.rating)) + '☆'.repeat(5 - Math.floor(book.rating));
    document.querySelector('.book-rating-large .stars-large').textContent = stars;
    document.querySelector('.book-rating-large span:last-child').textContent = `${book.rating} (${book.rating_count || 10} ratings)`;

    // Update meta information
    const metaContainer = document.querySelector('.book-meta');
    metaContainer.innerHTML = ''; // Clear existing

    if (book.categories) {
        book.categories.split(',').forEach(category => {
            const span = document.createElement('span');
            span.className = 'meta-item';
            span.textContent = category.trim();
            metaContainer.appendChild(span);
        });
    }

    // Add page count if available
    if (book.page_count) {
        const pageSpan = document.createElement('span');
        pageSpan.className = 'meta-item';
        pageSpan.textContent = `${book.page_count} pages`;
        metaContainer.appendChild(pageSpan);
    }

    // Update description
    const descriptionContainer = document.querySelector('.book-description');
    if (book.description) {
        descriptionContainer.textContent = book.description;
    } else {
        descriptionContainer.textContent = 'No description available.';
    }

    // Update details table
    const detailsTable = document.querySelector('.details-table');
    const rows = [
        ['Title', book.title],
        ['Author', book.authors],
        ['Publisher', book.publisher || 'Not specified'],
        ['Publication Date', book.publication_date || 'Unknown'],
        ['ISBN', book.isbn || 'Not available'],
        ['Language', book.language || 'English'],
        ['Pages', book.page_count || 'Unknown'],
        ['Format', book.format || 'Not specified'],
        ['Genres', book.categories || 'Not specified'],
        ['Available Copies', `${book.available_copies || 0} of ${book.total_copies || 0}`]
    ];

    detailsTable.innerHTML = ''; // Clear existing rows

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');

        td1.textContent = row[0];
        td2.textContent = row[1];

        tr.appendChild(td1);
        tr.appendChild(td2);
        detailsTable.appendChild(tr);
    });

    // Update breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb');
    breadcrumb.innerHTML = `
        <li><a href="/">Home</a></li>
        <li><a href="/browse?categories=${encodeURIComponent(book.categories.split(',')[0])}">
            ${book.categories.split(',')[0]}</a></li>
        <li><a href="#">${book.title}</a></li>
    `;
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function addReviewToList(review) {
    const reviewsTab = document.getElementById('reviews-tab');
    const reviewsList = reviewsTab.querySelector('.reviews-list');
    if (!reviewsTab) return;
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    reviewCard.innerHTML = `
        <div class="review-header">
            <div class="reviewer">${review.username || 'Anonymous'}</div>
            <div class="review-date">${formatDate(review.created_at)}</div>
        </div>
        <div class="review-rating">${renderStars(review.rating)}</div>
        <p>${review.comment}</p>
    `;

    reviewsList.insertBefore(reviewCard, reviewsList.firstChild);
}

function renderStars(rating) {
    rating = Math.round(rating);
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function addReviewToList(review) {
    const reviewsTab = document.getElementById('reviews-tab');
    const reviewsList = reviewsTab.querySelector('.reviews-list');
    if (!reviewsTab) return;
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    reviewCard.innerHTML = `
        <div class="review-header">
            <div class="reviewer">${review.username || 'Anonymous'}</div>
            <div class="review-date">${formatDate(review.created_at)}</div>
        </div>
        <div class="review-rating">${renderStars(review.rating)}</div>
        <p>${review.comment}</p>
    `;

    reviewsList.insertBefore(reviewCard, reviewsList.firstChild);
}

function renderStars(rating) {
    rating = Math.round(rating);
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Add borrow functionality
// Add these functions after the existing code

function handleBorrowClick(e) {
    e.preventDefault();
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

    closeBtn.onclick = function() {
        modal.classList.remove('show');
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    }

    form.onsubmit = async function(e) {
        e.preventDefault();
        const returnDate = returnDateInput.value;
        const bookId = new URLSearchParams(window.location.search).get('id');

        try {
            const response = await fetch('/api/borrow/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    book_id: bookId,
                    return_date: returnDate
                })
            });

            if (!response.ok) {
                throw new Error('Failed to borrow book');
            }

            const result = await response.json();
            alert('Book borrowed successfully!');
            modal.classList.remove('show');
            
            // Disable borrow button and refresh book details
            document.querySelector('.btn.btn-primary').disabled = true;
            fetchBookDetails(bookId);
        } catch (error) {
            console.error('Error borrowing book:', error);
            alert('Failed to borrow book. Please try again.');
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
document.addEventListener('DOMContentLoaded', function() {

});





