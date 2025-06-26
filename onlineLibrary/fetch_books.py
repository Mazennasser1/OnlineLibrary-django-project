# fetch_books.py (place in same directory as manage.py)

import os
import django
import requests
from django.core.files.base import ContentFile
from io import BytesIO

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onlineLibrary.settings')
django.setup()

from library.models import Book  # Make sure your model is named 'Book', not 'book'


def populate_books(category, max_results=40):
    url = "https://www.googleapis.com/books/v1/volumes"
    params = {
        'q': f'subject:{category}',
        'startIndex': 0,
        'maxResults': max_results,
        'printType': 'books'
    }
    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Failed to fetch data: {response.status_code} — {response.text}")
        return

    data = response.json().get('items', [])

    for item in data:
        info = item.get('volumeInfo', {})
        title = info.get('title', 'No Title')
        authors = ', '.join(info.get('authors', ['Unknown Author']))
        categories = ', '.join(info.get('categories', [category]))
        description = info.get('description', 'No description')[:1000]
        page_count = info.get('pageCount', 0)
        image_url = info.get('imageLinks', {}).get('thumbnail', '')

        book = Book(
            title=title,
            authors=authors,
            categories="History",
            description=description,
            page_count=page_count,
            thumbnail=image_url,
        )

        if image_url:
            try:
                img_resp = requests.get(image_url)
                if img_resp.status_code == 200:
                    file_name = image_url.split("/")[-1].split("?")[0]
                    book.image.save(file_name, ContentFile(img_resp.content), save=False)
            except:
                print(f"Could not download image for: {title}")

        book.save()
        print(f"Saved: {title}")


# Example use
populate_books("History")

