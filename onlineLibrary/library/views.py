import random
from pathlib import Path

from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import AuthenticationForm
from django.core.paginator import Paginator
from django.db.models import Q, Count

from .forms import RegistrationForm
from django.http import HttpResponseRedirect
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from .models import Book, Borrowing
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.contrib.sites.shortcuts import get_current_site
from django.http import JsonResponse
from django.db.models.functions import TruncMonth, TruncDay

from django.views.decorators.http import require_http_methods
import json
from datetime import date, timedelta
from django.utils import timezone
import logging


logger = logging.getLogger(__name__)



# Create your views here.

def index(request):
    return render(request, 'main.html')


def is_admin(user):
    return user.is_authenticated and user.is_superuser

@login_required
def user_dashboard(request):
    if request.user.is_staff or request.user.is_superuser:
        return redirect('admin_dashboard')  # replace 'admin_dashboard' with your admin URL name
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Get user's current borrowings
    current_borrowings = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=True
    ).count()

    # Get books due this week
    week_end = today + timedelta(days=7)
    due_this_week = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=True,
        due_date__lte=week_end
    ).count()

    # Get user's reading history
    books_read = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=False
    ).count()

    # Get books read this month
    books_read_this_month = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=False,
        return_date__gte=month_start
    ).count()

    # Get next due date
    next_due = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=True
    ).order_by('due_date').first()

    # Calculate days until next due date
    days_until_due = (next_due.due_date - today).days if next_due else None

    context = {
        'username': request.user.username,
        'stats': {
            'current_borrowings': current_borrowings,
            'due_this_week': due_this_week,
            'books_read': books_read,
            'books_read_this_month': books_read_this_month,
            'next_due_date': next_due.due_date.strftime("%b %d") if next_due else None,
            'days_until_due': days_until_due
        }
    }
    return render(request, 'userDashboard.html', context)


@login_required
def admin_dashboard_stats(request):
    today = date.today()
    month_start = today.replace(day=1)

    data = {
        'books': {
            'total': Book.objects.count(),
            'monthly': Book.objects.filter(borrow_date__gte=month_start).count()
        },
        'users': {
            'total': User.objects.count(),
            'monthly': User.objects.filter(date_joined__gte=month_start).count()
        },
        'borrowed': {
            'total': Book.objects.filter(status='Borrowed').count(),
            'monthly': Book.objects.filter(status='Borrowed', borrow_date__gte=month_start).count()
        },
        'overdue': {
            'total': Book.objects.filter(status='Borrowed', due_date__lt=today).count(),
            'monthly': 0  # Implement if needed
        }
    }
    return JsonResponse(data)


@login_required
@user_passes_test(is_admin)
def get_admin_users(request):
    try:
        # Pagination parameters
        page_number = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))

        users = User.objects.all().order_by('date_joined')
        search_term = request.GET.get('search', '').strip()
        if search_term:
            users = users.filter(
                Q(username__icontains=search_term) |
                Q(email__icontains=search_term)
            )
        paginator = Paginator(users, per_page)

        try:
            current_page = paginator.page(page_number)
        except:
            current_page = paginator.page(1)

        users_data = [{
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'date_joined': user.date_joined.strftime("%Y-%m-%d"),
            'last_login': user.last_login.strftime("%Y-%m-%d") if user.last_login else 'Never'
        } for user in current_page]

        return JsonResponse({
            'users': users_data,
            'pagination': {
                'total_pages': paginator.num_pages,
                'current_page': current_page.number,
                'has_next': current_page.has_next(),
                'has_previous': current_page.has_previous(),
                'total_items': paginator.count
            }
        })
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def update_user(request):
    try:
        data = json.loads(request.body)
        user = User.objects.get(id=data.get('id'))

        # Update basic fields
        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        user.is_active = data.get('is_active', user.is_active)
        user.is_staff = data.get('is_staff', user.is_staff)

        # Only update password if provided
        if 'password' in data and data['password']:
            user.set_password(data['password'])

        user.save()
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@user_passes_test(is_admin)
def get_analytics_data(request):
    try:
        logger.info("Fetching analytics data...")

        # Date ranges
        end_date = timezone.now()
        start_date_month = end_date - timedelta(days=30)

        # Basic counts
        total_books = Book.objects.count()
        available_books = Book.objects.filter(status='Available').count()
        borrowed_books = Book.objects.filter(status='Borrowed').count()
        total_users = User.objects.count()

        logger.info(f"Basic counts - Books: {total_books}, Users: {total_users}")

        # Return minimal data first for testing
        return JsonResponse({
            'stats': {
                'books': {
                    'total': total_books,
                    'available': available_books,
                    'borrowed': borrowed_books,
                },
                'users': {
                    'total': total_users,
                    'new_month': User.objects.filter(
                        date_joined__gte=start_date_month
                    ).count(),
                }
            },
            'trends': {
                'borrow_daily': []
            },
            'categories': [],
            'popular_books': [],
            'active_users': []
        })

    except Exception as e:
        logger.error(f"Error in get_analytics_data: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def delete_user(request):
    try:
        data = json.loads(request.body)
        user = User.objects.get(id=data.get('id'))

        # Prevent deleting yourself
        if user == request.user:
            return JsonResponse({
                'success': False,
                'error': 'You cannot delete your own account'
            }, status=400)

        user.delete()
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)





@login_required
@user_passes_test(is_admin)
def get_admin_books(request):
    try:
        # Pagination parameters
        page_number = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
        search_term = request.GET.get('search', '').strip()

        # Base query
        books = Book.objects.all()

        # Apply search if search term exists
        if search_term:
            books = books.filter(
                Q(title__icontains=search_term) |
                Q(authors__icontains=search_term) |
                Q(categories__icontains=search_term) |
                Q(id__icontains=search_term)
            )

        # Order by id
        books = books.order_by('id')

        # Apply pagination
        paginator = Paginator(books, per_page)
        try:
            current_page = paginator.page(page_number)
        except:
            current_page = paginator.page(1)

        books_data = [{
            'id': book.id,
            'title': book.title,
            'authors': book.authors,
            'categories': book.categories,
            'description': book.description,
            'status': book.status,
            'rating': book.rating,
            'thumbnail': book.thumbnail or '/static/images/default-book.png',
        } for book in current_page]

        return JsonResponse({
            'books': books_data,
            'pagination': {
                'total_pages': paginator.num_pages,
                'current_page': current_page.number,
                'has_next': current_page.has_next(),
                'has_previous': current_page.has_previous(),
                'total_items': paginator.count
            }
        })

    except Exception as e:
        logger.error(f"Error fetching books: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def add_book(request):
    try:
        data = json.loads(request.body)
        book = Book(
            title=data.get('title'),
            authors=data.get('authors'),
            categories=data.get('categories'),
            description=data.get('description'),
            page_count=data.get('page_count'),
            thumbnail=data.get('thumbnail'),
            status=data.get('status', 'Available'),
            rating=data.get('rating')
        )
        book.save()
        return JsonResponse({'success': True, 'id': book.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def update_book(request):
    try:
        data = json.loads(request.body)
        book = Book.objects.get(id=data.get('id'))
        book.title = data.get('title', book.title)
        book.authors = data.get('authors', book.authors)
        book.categories = data.get('categories', book.categories)
        book.description = data.get('description', book.description)
        book.page_count = data.get('page_count', book.page_count)
        book.thumbnail = data.get('thumbnail', book.thumbnail)
        book.status = data.get('status', book.status)
        book.rating = data.get('rating', book.rating)
        book.save()
        return JsonResponse({'success': True})
    except Book.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Book not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def delete_book(request):
    try:
        data = json.loads(request.body)
        book = Book.objects.get(id=data.get('id'))
        book.delete()
        return JsonResponse({'success': True})
    except Book.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Book not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# Update the admin_dashboard view to pass book data
@login_required
@user_passes_test(is_admin)
def admin_dashboard(request):
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Book Statistics
    total_books = Book.objects.count()
    available_books = Book.objects.filter(status='Available').count()
    borrowed_books = Book.objects.filter(status='Borrowed').count()

    # User Statistics
    total_users = User.objects.count()
    new_users_this_month = User.objects.filter(
        date_joined__gte=month_start
    ).count()

    # Borrowing Statistics
    current_borrowings = Borrowing.objects.filter(
        return_date__isnull=True
    ).count()

    new_borrowings = Borrowing.objects.filter(
        borrow_date__gte=month_start
    ).count()

    # Overdue Statistics
    overdue_books = Borrowing.objects.filter(
        return_date__isnull=True,
        due_date__lt=today
    ).count()

    context = {
        'stats': {
            'total_books': total_books,
            'book_activity': new_borrowings,
            'total_users': total_users,
            'new_users': new_users_this_month,
            'borrowed_books': borrowed_books,
            'new_borrowings': new_borrowings,
            'overdue_books': overdue_books,
        },
        'last_updated': timezone.now().strftime("%B %d, %Y, %I:%M %p")
    }
    return render(request, 'admin.html', context)

    # total_books = Book.objects.count()
    # total_users = User.objects.count()
    # borrowed_books = Book.objects.filter(status='Unavailable').count()
    # overdue_books = 0  # You'll need to implement this based on your borrowing logic
    #
    # context = {
    #     'total_books': total_books,
    #     'total_users': total_users,
    #     'borrowed_books': borrowed_books,
    #     'overdue_books': overdue_books,
    # }
    # return render(request, 'admin.html', context)

def SignoutUser(request):
    logout(request)
    return redirect('index')

# def forgot_password(request):

@login_required
@require_http_methods(["POST"])
def borrow_book(request):
    # if request.method == 'POST':
        try:
            data = json.loads(request.body)
            book_id = data.get('book_id')
            return_date = data.get('return_date')

            if not book_id or not return_date:
                return JsonResponse({'status': 'error', 'message': 'Missing required fields'}, status=400)

            # Convert return_date string to date object
            return_date = datetime.strptime(return_date, '%Y-%m-%d').date()

            # Get the book
            book = Book.objects.get(id=book_id)

            # Check if book is available
            if book.status != 'Available':
                return JsonResponse({'status': 'error', 'message': 'Book is not available'}, status=400)

            # Try to borrow the book
            borrowing = book.borrow(request.user, return_date)

            return JsonResponse({
                'status': 'success',
                'message': 'Book borrowed successfully',
                'borrowing_id': borrowing.id
            })

        except Book.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Book not found'}, status=404)
        except ValueError as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    # return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@login_required
@require_http_methods(["POST"])
def return_book(request):
    try:
        data = json.loads(request.body)
        borrowing_id = data.get('borrowing_id')
        book_id = data.get('book_id')

        if not borrowing_id or not book_id:
            return JsonResponse({'status': 'error', 'message': 'Borrowing ID and Book ID are required'}, status=400)

        # Get the borrowing record
        borrowing = Borrowing.objects.filter(
            id=borrowing_id,
            book_id=book_id,
            # user=request.user,
            return_date__isnull=True
        ).first()

        if not borrowing:
            return JsonResponse({'status': 'error', 'message': 'No active borrowing found for this book'}, status=404)

        borrowing_qs = Borrowing.objects.filter(
            id=borrowing_id,
            book_id=book_id,
            return_date__isnull=True
        )
        if not request.user.is_superuser and not request.user.is_staff:
            borrowing_qs = borrowing_qs.filter(user=request.user)
        borrowing = borrowing_qs.first()

        # Update the borrowing record with return date
        borrowing.return_date = timezone.now().date()
        borrowing.save()

        # Update book status and remove user_id
        book = borrowing.book
        book.status = 'Available'
        book.user_id = None
        book.save()

        return JsonResponse({
            'status': 'success',
            'message': 'Book returned successfully'
        })

    except Exception as e:
        logger.error(f"Error in return_book: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


def auth_page(request):
    # Determine which form was submitted
    if request.method == 'POST':
        if 'login-submit' in request.POST:
            # Handle login form submission
            login_form = AuthenticationForm(request, data=request.POST)
            signup_form = RegistrationForm()

            if login_form.is_valid():
                user = login_form.get_user()
                if not user.is_active:
                    messages.error(request, 'Your account is not active. Please verify your email first.')
                    return redirect('auth_page')
                login(request, user)
                if user.is_staff or user.is_superuser:
                    return redirect('admin_dashboard')
                return redirect('index')
            else:
                messages.error(request, 'Invalid username or password. Please try again.')
                return redirect('auth_page')

        elif 'signup-submit' in request.POST:
            # Handle signup form submission
            signup_form = RegistrationForm(request.POST)
            login_form = AuthenticationForm()

            if signup_form.is_valid():
                user = signup_form.save(commit=False)
                user.is_active = False

                # Check if admin registration - Fix is here:
                is_admin = request.POST.get('is_admin') == 'on'
                security_code = request.POST.get('security_code', '')

                if is_admin:
                    # Verify security code
                    if security_code == "1235":  # Store this in settings/environment variables
                        user.is_staff = True
                        user.is_superuser = True
                    else:
                        signup_form.add_error(None, 'Invalid admin security code')
                        return render(request, 'Login-Signup.html', {
                            'login_form': login_form,
                            'signup_form': signup_form,
                        })

                user.save()

                # login(request, user)
                send_verification_email(request, user)

                messages.info(request, f'Verification email sent to {user.email}. Please check your inbox.')
                # Redirect to admin dashboard if admin
                return redirect('auth_page')

    else:
        # Initial page load - show both empty forms
        login_form = AuthenticationForm()
        signup_form = RegistrationForm()

    return render(request, 'Login-Signup.html', {
        'login_form': login_form,
        'signup_form': signup_form,
    })


from django.http import JsonResponse
from django.contrib.auth.models import User

def check_username(request):
    username = request.GET.get('username', '')
    exists = User.objects.filter(username__iexact=username).exists()
    return JsonResponse({'exists': exists})

def check_email(request):
    email = request.GET.get('email', '')
    exists = User.objects.filter(email__iexact=email).exists()
    return JsonResponse({'exists': exists})


def browse_books(request):
    return render(request, 'browserBook.html')


def get_categories(request):
    categories = Book.objects.values('categories').annotate(
        count=Count('id')
    ).order_by('categories')

    return JsonResponse({
        'categories': [
            {'name': c['categories'], 'count': c['count']}
            for c in categories if c['categories']
        ]
    })


def get_book_filters(request):
    # Get current filter state from request
    current_filters = {
        'category': request.GET.get('categories', None),
        'min_rating': request.GET.get('min_rating', None),
        'availability': request.GET.get('availability', None),
        'min_pages': request.GET.get('min_pages', None),
        'max_pages': request.GET.get('max_pages', None)
    }

    # Base queryset with current filters applied
    books = Book.objects.all()

    if current_filters['category']:
        books = books.filter(categories__in=current_filters['category'].split(','))

    if current_filters['min_rating']:
        books = books.filter(rating__gte=current_filters['min_rating'])

    if current_filters['availability']:
        availability_filters = current_filters['availability'].split(',')
        if 'available_now' in availability_filters:
            books = books.filter(status='Available')

    if current_filters['min_pages']:
        books = books.filter(page_count__gte=current_filters['min_pages'])
    if current_filters['max_pages']:
        books = books.filter(page_count__lte=current_filters['max_pages'])

    # Get filter counts
    categories = Book.objects.values('categories').annotate(
        count=Count('id', filter=Q(id__in=books.values('id')))
    ).order_by('categories')

    rating_counts = {
        '5_stars': books.filter(rating__gte=5).count(),
        '4_stars': books.filter(rating__gte=4).count(),
        '3_stars': books.filter(rating__gte=3).count(),
        '2_stars': books.filter(rating__gte=2).count()
    }

    availability_counts = {
        'available': Book.objects.filter(status='Available').count(),
    }

    page_counts = {
        'under_200': Book.objects.filter(page_count__lt=200).count(),
        '200_400': Book.objects.filter(page_count__range=(200, 400)).count(),
        'over_400': Book.objects.filter(page_count__gt=400).count()
    }

    return JsonResponse({
        'categories': {c['categories']: c['count'] for c in categories if c['categories']},
        'ratings': rating_counts,
        'availability': availability_counts,
        'pages': page_counts
    })


@login_required
def update_profile(request):
    if request.method == 'POST':
        user = request.user
        user.username = request.POST.get('username', user.username)
        user.first_name = request.POST.get('first_name', user.first_name)
        user.last_name = request.POST.get('last_name', user.last_name)
        user.email = request.POST.get('email', user.email)
        user.save()
        messages.success(request, 'Your profile has been updated successfully!')
        return redirect('user_dashboard')

    return redirect('user_dashboard')


def get_books(request):
    # Pagination parameters
    page_number = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 30))

    # Random parameter
    random_param = request.GET.get('random', '').lower() == 'true'

    # Search parameter
    search_query = request.GET.get('search', '').strip()

    # Filter parameters
    categories = request.GET.get('categories', '').split(',') if request.GET.get('categories') else []
    min_rating = request.GET.get('min_rating')
    availability = request.GET.get('availability', '').split(',') if request.GET.get('availability') else []
    min_pages = request.GET.get('min_pages')
    max_pages = request.GET.get('max_pages')
    sort_by = request.GET.get('sort_by', 'relevance')

    # Base queryset
    books_queryset = Book.objects.all()

    # Apply search filter if query exists
    if search_query:
        books_queryset = books_queryset.filter(
            Q(title__icontains=search_query) |
            Q(authors__icontains=search_query) |
            Q(categories__icontains=search_query) |
            Q(id__icontains=search_query)
        )

    # Apply other filters
    if categories:
        books_queryset = books_queryset.filter(categories__in=categories)

    if min_rating:
        books_queryset = books_queryset.filter(rating__gte=float(min_rating))

    if 'available_now' in availability:
        books_queryset = books_queryset.filter(status='Available')

    if min_pages:
        books_queryset = books_queryset.filter(page_count__gte=int(min_pages))
    if max_pages:
        books_queryset = books_queryset.filter(page_count__lte=int(max_pages))

    # Apply sorting or randomization
    if random_param:
        books_queryset = books_queryset.order_by('?')  # Random ordering
    else:
        if sort_by == 'newest_arrivals':
            books_queryset = books_queryset.order_by('-created_at')
        elif sort_by == 'rating:_high_to_low':
            books_queryset = books_queryset.order_by('-rating')
        elif sort_by == 'title:_a_to_z':
            books_queryset = books_queryset.order_by('title')
        elif sort_by == 'title:_z_to_a':
            books_queryset = books_queryset.order_by('-title')
        else:  # relevance
            books_queryset = books_queryset  # Default ordering

    # Pagination
    paginator = Paginator(books_queryset, per_page)

    try:
        current_page = paginator.page(page_number)
    except:
        current_page = paginator.page(1)

    # Prepare response data
    books_data = [{
        'id': book.id,
        'title': book.title,
        'authors': book.authors,
        'thumbnail': book.thumbnail if book.thumbnail else '',
        'status': book.status,
        'rating': book.rating,
        'page_count': book.page_count,
        'category': book.categories
    } for book in current_page]

    return JsonResponse({
        'books': books_data,
        'pagination': {
            'total_pages': paginator.num_pages,
            'current_page': current_page.number,
            'has_next': current_page.has_next(),
            'has_previous': current_page.has_previous(),
            'total_items': paginator.count,
            'total_books': Book.objects.all().count()
        },
        'random': random_param,
    })


def reading_history(request):
    # Load reviews data from JSON file
    reviews_path = get_reviews_file_path()
    with open(reviews_path, 'r', encoding='utf-8') as f:
        reviews_data = json.load(f)

    # Get all reviews for the current user
    user_reviews = {
        review['book_id']: review['rating']
        for review in reviews_data['reviews']
        if review['user_id'] == request.user.id
    }

    history_records = Borrowing.objects.filter(
        user=request.user,
        return_date__isnull=False
    ).select_related('book').order_by('-return_date')[:50]  # Limit to 50 most recent

    history_data = []
    for record in history_records:
        # Get the user's rating for this book (if exists)
        rating = user_reviews.get(str(record.book.id), 0)

        history_data.append({
            'book': {
                'id': record.book.id,
                'title': record.book.title,
                'author': record.book.authors,
                'cover_url': record.book.thumbnail
            },
            'borrow_date': record.borrow_date.isoformat(),
            'return_date': record.return_date,
            'rating': rating,
        })

    return JsonResponse({'history': history_data})

def user_reviews(request):
    # Load reviews data from JSON file
    reviews_path = get_reviews_file_path()
    with open(reviews_path, 'r', encoding='utf-8') as f:
        reviews_data = json.load(f)

    # Get all reviews for the current user with book details
    user_reviews = []
    for review in reviews_data['reviews']:
        if review['user_id'] == request.user.id:
            try:
                book = Book.objects.get(id=review['book_id'])
                user_reviews.append({
                    'book_id': review['book_id'],
                    'book_title': book.title,
                    'book_author': book.authors,
                    'rating': review['rating'],
                    'comment': review['comment'],
                    'created_at': review['created_at']
                })
            except Book.DoesNotExist:
                continue

    return JsonResponse({'reviews': user_reviews})


def preview_book(request):
    book_id = request.GET.get('id')
    if book_id:
        book = get_object_or_404(Book, id=book_id)

        # Get similar books from the same category
        similar_books = Book.objects.filter(
            categories__icontains=book.categories
        ).exclude(id=book.id)[:4]  # Get up to 4 similar books

        # Get recommended books (books with high ratings)
        recommended_books = Book.objects.filter(
            rating__isnull=False
        ).order_by('-rating').exclude(id=book.id)[:4]  # Get up to 4 recommended books

        context = {
            'book': book,
            'similar_books': similar_books,
            'recommended_books': recommended_books
        }

        return render(request, 'previewBook.html', context)
    return redirect('index')  # Redirect to home if no ID provided
def get_single_book(request, book_id):
    try:
        book = Book.objects.get(id=book_id)
        book_data = {
            'id': book.id,
            'title': book.title,
            'authors': book.authors,
            'categories': book.categories,
            'description': book.description,
            'page_count': book.page_count,
            'thumbnail': book.thumbnail if book.thumbnail else '',
            'status': book.status,
            'rating': book.rating
        }
        return JsonResponse(book_data)
    except Book.DoesNotExist:
        return JsonResponse({'error': 'Book not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
def send_verification_email(request, user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    current_site = get_current_site(request)
    mail_subject = 'Activate your BookHaven account'
    message = render_to_string('verification_email.html', {
        'user': user,
        'domain': current_site.domain,
        'uid': uid,
        'token': token,
    })
    send_mail(mail_subject, message, settings.DEFAULT_FROM_EMAIL, [user.email],fail_silently=False)

from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.contrib.auth import login as auth_login

def verify_email(request, uidb64, token):
    User = get_user_model()
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        auth_login(request, user)

        if user.is_superuser or user.is_staff:
            messages.success(request, 'Email verification complete! Welcome to your admin dashboard.')
            return redirect('admin_dashboard')
        else:
            messages.success(request, 'Your email has been verified and you are now logged in!')
            return redirect('index')
    else:
        messages.error(request, 'The verification link is invalid or has expired.')
        return redirect('auth_page')


def forgot_password(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(email=email)
            # Generate token and send email
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            current_site = get_current_site(request)
            mail_subject = 'Reset Your BookHaven Password'
            message = render_to_string('password_reset_email.html', {
                'user': user,
                'domain': current_site.domain,
                'uid': uid,
                'token': token,
                'protocol': 'https' if request.is_secure() else 'http',
            })

            try:
                send_mail(
                    mail_subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )
                messages.success(request, 'Password reset link has been sent to your email.')
                return redirect('auth_page')
            except Exception as e:
                messages.error(request, f'Failed to send email. Error: {str(e)}')
                return render(request, 'restPassword.html', {'show_reset_form': False})

        except User.DoesNotExist:
            messages.error(request, 'No account found with that email address.')
            return render(request, 'restPassword.html', {'show_reset_form': False})

    return render(request, 'restPassword.html', {'show_reset_form': False})


def reset_password_confirm(request, uidb64, token):
    User = get_user_model()
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    # Store if token is valid
    is_valid_token = user is not None and default_token_generator.check_token(user, token)

    if is_valid_token:
        if request.method == 'POST':
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')

            if new_password == confirm_password:
                user.set_password(new_password)
                user.save()
                auth_login(request, user)  # Log the user in after password reset
                messages.success(request, 'Your password has been reset successfully!')
                return redirect('index')
            else:
                messages.error(request, 'Passwords do not match.')
                # Pass the context data back to render the form again
                return render(request, 'restPassword.html', {
                    'show_reset_form': True,
                    'uidb64': uidb64,
                    'token': token,
                })

        # GET request with valid token
        return render(request, 'restPassword.html', {
            'show_reset_form': True,
            'uidb64': uidb64,
            'token': token,
        })
    else:
        # Invalid token or user
        messages.error(request, 'The reset link is invalid or has expired.')
        return redirect('forgot_password')  # Redirect to forgot password page instead

import json
from datetime import datetime
from django.conf import settings
import os

def get_reviews_file_path():
    return os.path.join(settings.BASE_DIR, 'library', 'reviews.json')

def load_reviews():
    file_path = get_reviews_file_path()
    if not os.path.exists(file_path):
        return {"reviews": []}
    with open(file_path, 'r') as f:
        return json.load(f)

def save_review(book_id, user_id, username, rating, comment):
    reviews = load_reviews()
    now = datetime.now().isoformat()
    new_review = {
        "id": len(reviews["reviews"]) + 1,
        "book_id": book_id,
        "user_id": user_id,
        "username": username,
        "rating": rating,
        "comment": comment,
        "created_at": now,
        "updated_at": now
    }
    reviews["reviews"].append(new_review)
    with open(get_reviews_file_path(), 'w') as f:
        json.dump(reviews, f, indent=4)
    return new_review

def get_reviews(request):
    book_id = request.GET.get('book_id')
    if not book_id:
        return JsonResponse([], safe=False)
    reviews = get_book_reviews(book_id)
    return JsonResponse(reviews, safe=False)

def get_book_reviews(book_id):
    reviews = load_reviews()
    return [r for r in reviews["reviews"] if r["book_id"] == book_id]


from django.http import JsonResponse

def add_review(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    data = json.loads(request.body)
    book_id = data.get('book_id')
    rating = data.get('rating')
    comment = data.get('comment')
    if not all([book_id, rating, comment]):
        return JsonResponse({'error': 'Missing required fields'}, status=400)
    user = request.user
    new_review = save_review(
        book_id=book_id,
        user_id=user.id,
        username=user.username if user.is_authenticated else "Anonymous",
        rating=rating,
        comment=comment
    )
    return JsonResponse(new_review)


@login_required
def get_borrowing_records(request):
    """API endpoint to get borrowing records for admin dashboard"""
    try:
        # Get query parameters
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 20))
        status = request.GET.get('status', None)  # 'active', 'returned', 'overdue', or None for all

        # Base query
        query = Borrowing.objects.select_related('book', 'user').all()

        # Apply filters
        today = timezone.now().date()
        if status == 'active':
            query = query.filter(return_date__isnull=True, due_date__gte=today)
        elif status == 'returned':
            query = query.filter(return_date__isnull=False)
        elif status == 'overdue':
            query = query.filter(return_date__isnull=True, due_date__lt=today)

        # Get total count for pagination
        total_records = query.count()

        # Calculate offset
        offset = (page - 1) * per_page

        # Get paginated results
        borrowings = query.order_by('-borrow_date')[offset:offset + per_page]

        # Format the results
        results = []
        for borrowing in borrowings:
            # Calculate status safely
            if borrowing.return_date:
                status = 'Returned'
            elif borrowing.due_date and borrowing.due_date < today:
                status = 'Overdue'
            elif borrowing.due_date and borrowing.due_date == today:
                status = 'Due Today'
            else:
                status = 'Active'

            results.append({
                'id': borrowing.id,
                'book_id': borrowing.book.id,
                'book_title': borrowing.book.title,
                'user_id': borrowing.user.id,
                'username': borrowing.user.username,
                'borrow_date': borrowing.borrow_date.strftime('%Y-%m-%d'),
                'due_date': borrowing.due_date.strftime('%Y-%m-%d') if borrowing.due_date else "None",
                'return_date': borrowing.return_date.strftime('%Y-%m-%d') if borrowing.return_date else "None",
                'status': status,
                'days_remaining': (borrowing.due_date - today).days if borrowing.due_date and not borrowing.return_date else 0
            })

        return JsonResponse({
            'status': 'success',
            'borrowings': results,
            'total': total_records,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_records + per_page - 1) // per_page
        })

    except Exception as e:
        logger.error(f"Error in get_borrowing_records: {str(e)}", exc_info=True)
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)



@login_required
def get_user_borrowed_books(request):
    try:
        # Get all active borrowings for the current user
        borrowings = Borrowing.objects.filter(
            user=request.user,
            return_date__isnull=True
        ).select_related('book').order_by('due_date')

        books_data = []
        for borrowing in borrowings:
            books_data.append({
                'id': borrowing.book.id,
                'borrowing_id': borrowing.id,
                'title': borrowing.book.title,
                'authors': borrowing.book.authors,
                'thumbnail': borrowing.book.thumbnail or '/static/images/default-book.png',
                'borrow_date': borrowing.borrow_date.strftime('%Y-%m-%d'),
                'due_date': borrowing.due_date.strftime('%Y-%m-%d'),
                'status': 'Active'
            })

        return JsonResponse({
            'status': 'success',
            'books': books_data
        })

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)



def get_reviews_file_path():
    return os.path.join(settings.BASE_DIR, 'library', 'reviews.json')

def load_reviews():
    file_path = get_reviews_file_path()
    if not os.path.exists(file_path):
        return {"reviews": []}
    with open(file_path, 'r') as f:
        return json.load(f)

def save_review(book_id, user_id, username, rating, comment):
    reviews = load_reviews()
    now = datetime.now().isoformat()
    new_review = {
        "id": len(reviews["reviews"]) + 1,
        "book_id": book_id,
        "user_id": user_id,
        "username": username,
        "rating": rating,
        "comment": comment,
        "created_at": now,
        "updated_at": now
    }
    reviews["reviews"].append(new_review)
    with open(get_reviews_file_path(), 'w') as f:
        json.dump(reviews, f, indent=4)
    return new_review

def get_reviews(request):
    book_id = request.GET.get('book_id')
    if not book_id:
        return JsonResponse([], safe=False)
    reviews = get_book_reviews(book_id)
    return JsonResponse(reviews, safe=False)

def get_book_reviews(book_id):
    reviews = load_reviews()
    return [r for r in reviews["reviews"] if r["book_id"] == book_id]


from django.http import JsonResponse

def add_review(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    data = json.loads(request.body)
    book_id = data.get('book_id')
    rating = data.get('rating')
    comment = data.get('comment')
    if not all([book_id, rating, comment]):
        return JsonResponse({'error': 'Missing required fields'}, status=400)
    user = request.user
    new_review = save_review(
        book_id=book_id,
        user_id=user.id,
        username=user.username if user.is_authenticated else "Anonymous",
        rating=rating,
        comment=comment
    )
    return JsonResponse(new_review)


@login_required
@require_http_methods(["POST"])
def renew_book(request):
    try:
        data = json.loads(request.body)
        book_id = data.get('book_id')
        borrowing_id = data.get('borrowing_id')

        if not book_id or not borrowing_id:
            return JsonResponse({'status': 'error', 'message': 'Book ID and Borrowing ID are required'}, status=400)

        # Get the borrowing record
        borrowing = Borrowing.objects.filter(
            id=borrowing_id,
            book_id=book_id,
            user=request.user,
            return_date__isnull=True
        ).first()

        if not borrowing:
            return JsonResponse({'status': 'error', 'message': 'No active borrowing found for this book'}, status=404)

        # Calculate new due date (extend by 14 days from current due date)
        new_due_date = borrowing.due_date + timedelta(days=14)

        # Update the borrowing record
        borrowing.due_date = new_due_date
        borrowing.save()

        return JsonResponse({
            'status': 'success',
            'message': 'Book renewed successfully',
            'new_due_date': new_due_date.strftime('%Y-%m-%d')
        })

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)