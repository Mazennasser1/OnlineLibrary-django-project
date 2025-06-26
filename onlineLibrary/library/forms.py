from django import forms

from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from datetime import datetime, timedelta
from .models import Book, Borrowing

class BorrowingForm(forms.ModelForm):
    return_date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))

    class Meta:
        model = Borrowing
        fields = ['return_date']

    def clean(self):
        cleaned_data = super().clean()
        return_date = cleaned_data.get('return_date')

        if return_date:
            if return_date < timezone.now().date():
                raise forms.ValidationError("Return date cannot be in the past")
            
            # Set due date 2 days after return date
            cleaned_data['due_date'] = return_date + timedelta(days=2)

        return cleaned_data

class RegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']