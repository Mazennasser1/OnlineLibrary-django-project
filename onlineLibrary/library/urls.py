from django.urls import path
from . import views
from .admin import BookAdmin
from .views import check_username, check_email, verify_email, get_admin_users, update_user, delete_user
from .views import get_admin_books, add_book, update_book, delete_book, get_book_filters, get_categories


urlpatterns = [
    path('', views.index, name='index'),
    path('verify/<uidb64>/<token>/', verify_email, name='verify_email'),
    path('auth/', views.auth_page, name='auth_page'),
    path('signout/', views.SignoutUser, name='signout'),
    path('check-username/', check_username, name='check_username'),
    path('check-email/', check_email, name='check_email'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('browse/', views.browse_books, name='browse_books'),
    path('api/books/', views.get_books, name='get_books'),
    path('api/book-filters/', get_book_filters, name='book-filters'),
    path('api/categories/', get_categories, name='categories'),
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/<uidb64>/<token>/', views.reset_password_confirm, name='reset_password_confirm'),
    path('api/admin/books/', get_admin_books, name='get_admin_books'),
    path('api/admin/books/add/', add_book, name='add_book'),
    path('api/admin/books/update/', update_book, name='update_book'),
    path('api/admin/books/delete/', delete_book, name='delete_book'),
    path('api/books/<int:book_id>/', views.get_single_book, name='get_single_book'),
    path('preview/', views.preview_book, name='preview_book'),
    path('api/reviews/add/', views.add_review, name='add_review'),
    path('get_reviews/', views.get_reviews, name='get_reviews'),
    path('add_review/', views.add_review, name='add_review'),
    path('user-dashboard/', views.user_dashboard, name='user_dashboard'),
    path('api/reading-history/', views.reading_history, name='reading_history'),
    path('api/user-reviews/', views.user_reviews, name='user_reviews'),
    path('update-profile/', views.update_profile, name='update_profile'),

    path('api/admin/users/', get_admin_users, name='get_admin_users'),
    path('api/admin/users/update/', update_user, name='update_user'),
    path('api/admin/users/delete/', delete_user, name='delete_user'),
    path('api/user/borrowed-books/', views.get_user_borrowed_books, name='user_borrowed_books'),

    path('api/admin/analytics/', BookAdmin.analytics_view, name='book_analytics_api'),

    path('api/admin/analytics/', views.get_analytics_data, name='admin_analytics'),
    path('api/admin/borrow/', views.borrow_book, name='borrow_book'),
    path('api/admin/return/', views.return_book, name='return_book'),
    path('api/admin/borrowings/', views.get_borrowing_records, name='get_borrowing_records'),
    path('api/admin/renew/', views.renew_book, name='renew_book'),
]