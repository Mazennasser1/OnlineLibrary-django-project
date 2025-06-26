// DOM Elements
const addBookBtn = document.getElementById('add-book-btn');
const bookModalBackdrop = document.getElementById('book-modal-backdrop');
const closeBookModal = document.getElementById('close-book-modal');
const cancelBookBtn = document.getElementById('cancel-book');
const saveBookBtn = document.getElementById('save-book');
const bookForm = document.getElementById('book-form');
const bookModalTitle = document.getElementById('book-modal-title');
const formAlert = document.getElementById('form-alert');
const deleteModalBackdrop = document.getElementById('delete-modal-backdrop');
const closeDeleteModal = document.getElementById('close-delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const deleteBookTitle = document.getElementById('delete-book-title');
const deleteBookId = document.getElementById('delete-book-id');
const adminTabs = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.tab-content');
const coverPreview = document.getElementById('cover-preview');
const bookCoverInput = document.getElementById('book-cover');
const bookSearch = document.getElementById('book-search');

// Sample books data for demonstration
const books = [
    { id: "BK1001", title: "The Silent Echo", author: "Emily Roberts", category: "Fiction", status: "Available", description: "A haunting tale of memories and lost connections.", isbn: "978-1234567890", pages: 342 },
    { id: "BK1002", title: "Midnight Whispers", author: "James Peterson", category: "Mystery", status: "Available", description: "A detective story set in a small coastal town.", isbn: "978-2345678901", pages: 412 },
    { id: "BK1003", title: "The Lost Horizon", author: "Sarah Chen", category: "Sci-Fi", status: "Unavailable", description: "An epic journey through parallel worlds.", isbn: "978-3456789012", pages: 528 },
    { id: "BK1004", title: "Beyond the Stars", author: "Michael Turner", category: "Sci-Fi", status: "Available", description: "Exploration of deep space and human potential.", isbn: "978-4567890123", pages: 386 },
    { id: "BK1005", title: "The Art of Silence", author: "Lisa Wong", category: "Self-Help", status: "Available", description: "Finding peace in a noisy world.", isbn: "978-5678901234", pages: 248 }
];


adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        adminTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

addBookBtn.addEventListener('click', () => {
    resetBookForm();
    bookModalTitle.textContent = 'Add New Book';
    bookModalBackdrop.style.display = 'flex';
});

closeBookModal.addEventListener('click', () => {
    bookModalBackdrop.style.display = 'none';
});

cancelBookBtn.addEventListener('click', () => {
    bookModalBackdrop.style.display = 'none';
});

bookCoverInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            coverPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});


saveBookBtn.addEventListener('click', () => {
    if (!validateBookForm()) {
        return;
    }

    const bookId = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const category = document.getElementById('book-category').value;
    const status = document.getElementById('book-status').value;
    const description = document.getElementById('book-description').value;
    const isbn = document.getElementById('book-isbn').value;
    const pages = document.getElementById('book-pages').value;

    const newBook = {
        id: bookId || `BK${1000 + books.length + 1}`,
        title,
        author,
        category,
        status,
        description,
        isbn,
        pages
    };

    if (bookId) {
        const index = books.findIndex(book => book.id === bookId);
        if (index !== -1) {
            books[index] = newBook;
        }
        showAlert('Book successfully updated!', 'success');
    } else {
        books.push(newBook);
        showAlert('Book successfully added!', 'success');
    }

    updateBooksTable();

    setTimeout(() => {
        bookModalBackdrop.style.display = 'none';
        formAlert.style.display = 'none';
    }, 1500);
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-book-btn')) {
        const bookId = e.target.getAttribute('data-id');
        const book = books.find(b => b.id === bookId);
        if (book) {
            fillBookForm(book);
            bookModalTitle.textContent = 'Edit Book';
            bookModalBackdrop.style.display = 'flex';
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-book-btn')) {
        const bookId = e.target.getAttribute('data-id');
        const book = books.find(b => b.id === bookId);
        if (book) {
            deleteBookId.value = bookId;
            deleteBookTitle.textContent = book.title;
            deleteModalBackdrop.style.display = 'flex';
        }
    }
});

closeDeleteModal.addEventListener('click', () => {
    deleteModalBackdrop.style.display = 'none';
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModalBackdrop.style.display = 'none';
});

confirmDeleteBtn.addEventListener('click', () => {
    const bookId = deleteBookId.value;
    const index = books.findIndex(book => book.id === bookId);

    if (index !== -1) {
        books.splice(index, 1);
        updateBooksTable();
        showAlert('Book successfully deleted!', 'success');
    }

    deleteModalBackdrop.style.display = 'none';
});

bookSearch.addEventListener('input', () => {
    const searchTerm = bookSearch.value.toLowerCase();
    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.id.toLowerCase().includes(searchTerm) ||
        book.category.toLowerCase().includes(searchTerm)
    );

    renderBooks(filteredBooks);
});

function validateBookForm() {
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    const category = document.getElementById('book-category').value;
    const description = document.getElementById('book-description').value;

    if (!title || !author || !category || !description) {
        showAlert('Please fill in all required fields!', 'danger');
        return false;
    }

    return true;
}

function fillBookForm(book) {
    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-category').value = book.category;
    document.getElementById('book-status').value = book.status;
    document.getElementById('book-description').value = book.description;
    document.getElementById('book-isbn').value = book.isbn;
    document.getElementById('book-pages').value = book.pages;
}

function resetBookForm() {
    bookForm.reset();
    document.getElementById('book-id').value = '';
    coverPreview.src = '/api/placeholder/150/200';
}

function showAlert(message, type) {
    formAlert.textContent = message;
    formAlert.className = `alert alert-${type}`;
    formAlert.style.display = 'block';
}

function updateBooksTable() {
    renderBooks(books);
}

function renderBooks(booksArray) {
    const tableBody = document.querySelector('#books-table tbody');
    tableBody.innerHTML = '';

    booksArray.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.id}</td>
            <td><img src="/api/placeholder/50/75" alt="Book Cover" style="width:50px; height:75px; object-fit:cover;"></td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category}</td>
            <td>${book.status}</td>
            <td class="table-actions">
                <button class="btn btn-primary btn-sm edit-book-btn" data-id="${book.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-book-btn" data-id="${book.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateBooksTable();
});