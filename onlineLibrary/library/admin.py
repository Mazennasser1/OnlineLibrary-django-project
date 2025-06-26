from django.contrib import admin
from django.contrib.auth.models import User
from django.http import JsonResponse

from .models import Book, Borrowing
from django.contrib import admin
from django.urls import path
from django.utils import timezone
from datetime import timedelta





@admin.register(Borrowing)
class BorrowingAdmin(admin.ModelAdmin):
    list_display = ('book', 'user', 'borrow_date', 'due_date', 'return_date', 'is_overdue')
    list_filter = ('borrow_date', 'due_date', 'return_date')
    search_fields = ('book__title', 'user__username')

    def is_overdue(self, obj):
        if obj.return_date is None and obj.due_date < timezone.now().date():
            return True
        return False

    is_overdue.boolean = True
    is_overdue.short_description = 'Overdue'



@admin.register(Book)
class BookAdmin(admin.ModelAdmin):


    list_display = ('id', 'title', 'authors', 'categories', 'status')
    list_display_links = ('id', 'title')
    list_filter = ('status', 'categories')
    search_fields = ('title', 'authors', 'categories', 'description')
    ordering = ('title',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'authors', 'categories', 'status')
        }),
        ('Detailed Information', {
            'fields': ('description', 'page_count', 'thumbnail', 'rating', 'isbn'),
            'classes': ('collapse',)
        }),
        ('Ownership', {
            'fields': ('user',),
            'classes': ('collapse',)
        }),
    )

    actions = ['make_available', 'make_unavailable']

    @classmethod
    def analytics_view(cls, request):
        # Create an instance of BookAdmin
        admin_instance = cls(Book, admin.site)
        # Call the analytics method
        return admin_instance.analytics(request)

    def make_available(self, request, queryset):
        queryset.update(status='Available')

    make_available.short_description = "Mark selected books as Available"

    def make_unavailable(self, request, queryset):
        queryset.update(status='Unavailable')

    make_unavailable.short_description = "Mark selected books as Unavailable"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_site.admin_view(self.analytics), name='book_analytics'),
        ]
        return custom_urls + urls

    def analytics(self, request):
        # Get time period from request (default to 30 days)
        period = request.GET.get('period', 'month')
        days = 30 if period == 'month' else 365

        # Borrowing trends
        borrowing_trends = Borrowing.get_borrowing_trends(days)

        # Category distribution
        category_distribution = Book.get_category_distribution()

        # Popular books
        popular_books = Borrowing.get_popular_books()

        # Active users
        active_users = Borrowing.get_active_users()

        # Stats
        stats = {
            'books': {
                'total': Book.objects.count(),
                'available': Book.objects.filter(status='Available').count(),
                'borrowed': Book.objects.filter(status='Borrowed').count(),
            },
            'users': {
                'total': User.objects.count(),
                'new_month': User.objects.filter(
                    date_joined__gte=timezone.now() - timedelta(days=30)
                ).count(),
            }
        }

        return JsonResponse({
            'trends': {
                'borrow_daily': list(borrowing_trends),
            },
            'categories': [
                {'name': cat['categories'], 'count': cat['count']}
                for cat in category_distribution
            ],
            'popular_books': [
                {
                    'title': book.title,
                    'author': book.authors.split(',')[0] if book.authors else 'Unknown',
                    'borrow_count': book.borrow_count
                } for book in popular_books
            ],
            'active_users': [
                {
                    'username': user.username,
                    'email': user.email,
                    'borrow_count': user.borrow_count
                } for user in active_users
            ],
            'stats': stats
        })