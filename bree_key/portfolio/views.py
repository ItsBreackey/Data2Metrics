from django.shortcuts import get_object_or_404, render, redirect
from django.http import HttpResponse
from django.core.mail import send_mail
from .models import Project, BlogPost, Testimonial, ContactMessage
from django.contrib import messages


def home(request):
    projects = Project.objects.all()[:3]  # for homepage preview
    posts = BlogPost.objects.all()[:3]
    testimonials = Testimonial.objects.all()

    return render(request, 'index.html', {
        'projects': projects,
        'posts': posts,
        'testimonials': testimonials
    })

#projects
def projects(request):
    projects = Project.objects.all()
    return render(request, 'projects.html', {'projects': projects})

def project_detail(request, slug):
    project = get_object_or_404(Project, slug=slug)
    return render(request, 'project_detail.html', {'project': project})

#blogs
def blog(request):
    posts = BlogPost.objects.all()
    return render(request, 'blog.html', {'posts': posts})


def blog_detail(request, slug):
    post = get_object_or_404(BlogPost, slug=slug)
    recent_posts = BlogPost.objects.exclude(id=post.id).order_by('-date_published')[:4]
    #featured_posts = BlogPost.objects.filter(is_featured=True).exclude(id=post.id)[:4]
    return render(request, 'blog_detail.html', {
        'post': post,
        'recent_posts': recent_posts,
        #'featured_posts': featured_posts
    })

def testimonials(request):
    testimonials = Testimonial.objects.all()
    return render(request, 'testimonials.html', {'testimonials': testimonials})


def contact(request):
    if request.method == 'POST':
        name = request.POST['name']
        email = request.POST['email']
        message = request.POST['message']

        # Save to DB (if you have a model)
        ContactMessage.objects.create(name=name, email=email, message=message)

        # Send email
        send_mail(
            subject='New Contact Message',
            message=f"From: {name} <{email}>\n\n{message}",
            from_email=email,
            recipient_list=['brendaawino41@gmail.com'],
            fail_silently=False,
        )

        # Flash success message
        messages.success(request, "Thanks for reaching out! We'll get back to you shortly.")

        # Redirect to homepage with #contact anchor
        return redirect('/#contact')

