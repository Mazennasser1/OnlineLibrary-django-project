from django.db import models
from django.contrib.auth.models import User
from datetime import date,timedelta
from django.utils import timezone
from django.db.models import Count, Q



class Borrowing(models.Model):
    book = models.ForeignKey('Book', on_delete=models.CASCADE, related_name='borrow_records')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrow_records')
    borrow_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)

    @classmethod
    def get_borrowing_trends(cls, days=30):
        date_from = timezone.now().date() - timedelta(days=days)
        return cls.objects.filter(
            borrow_date__gte=date_from
        ).values('borrow_date').annotate(
            count=Count('id')
        ).order_by('borrow_date')

    @classmethod
    def get_popular_books(cls, limit=5):
        return Book.objects.annotate(
            borrow_count=Count('borrow_records')
        ).order_by('-borrow_count')[:limit]

    @classmethod
    def get_active_users(cls, limit=5):
        from django.contrib.auth.models import User
        return User.objects.annotate(
            borrow_count=Count('borrow_records')
        ).order_by('-borrow_count')[:limit]


    class Meta:
        ordering = ['-borrow_date']

    def __str__(self):
        return f"{self.user.username} borrowed {self.book.title}"


class Book(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Borrowed', 'Borrowed'),
        ('Overdue', 'Overdue'),
    ]
    title = models.CharField(max_length=200, default="")
    authors = models.CharField(max_length=300, default="")  # joined list of authors
    categories = models.CharField(max_length=300, default="Uncategorized")  # joined list of categories
    description = models.TextField(default="No description")
    page_count = models.PositiveIntegerField(null=True, blank=True)
    thumbnail = models.URLField(max_length=500, null=True, blank=True)  # URL of book cover image
    rating = models.FloatField(blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('Available', 'Available'),
        ('Borrowed', 'Borrowed')
    ], default='Available')

    @classmethod
    def get_category_distribution(cls):
        return cls.objects.values('categories').annotate(count=Count('id')).order_by('-count')

    @classmethod
    def get_status_distribution(cls):
        return cls.objects.values('status').annotate(count=Count('id')).order_by('-count')


    def __str__(self):
        return self.title

    def get_authors(self):
        return self.authors

    def borrow(self, user, return_date):
        if self.status != 'Available':
            raise ValueError("Book is not available for borrowing")
        
        borrow_date = timezone.now().date()
        due_date = return_date
        
        # Create borrowing record
        borrowing = Borrowing.objects.create(
            book=self,
            user=user,
            borrow_date=borrow_date,
            return_date=None,
            due_date=due_date
        )
        
        # Update book status
        self.status = 'Borrowed'
        self.user_id = user.id 
        self.save()
        
        return borrowing
