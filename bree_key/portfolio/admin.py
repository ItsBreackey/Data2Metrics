from django.contrib import admin
from .models import Project, BlogPost, Testimonial, ContactMessage, Technology

admin.site.register(Technology)
admin.site.register(Project)
admin.site.register(BlogPost)
admin.site.register(Testimonial)
admin.site.register(ContactMessage)
