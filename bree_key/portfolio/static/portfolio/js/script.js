// script.js - navbar hide/show, smooth scroll, scroll-to-top, Swiper init + animations
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const navbar = document.querySelector('.navbar');
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');

  // -------------------------
  // Ensure navbar visible initially
  // -------------------------
  if (navbar) {
    navbar.classList.remove('hidden');
    navbar.classList.add('visible');
  }

  // -------------------------
  // Smooth scroll for anchors
  // -------------------------
  const anchorSelector = '.nav-links a[href^="#"], .dot-nav a[href^="#"], a[href^="#"]';
  document.querySelectorAll(anchorSelector).forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // -------------------------
  // Navbar hide while scrolling, show after stop
  // -------------------------
  if (navbar) {
    let scrollTimeout = null;
    const SHOW_DELAY = 250; // ms

    const onScrollHideShow = () => {
      if (!navbar.classList.contains('hidden')) {
        navbar.classList.add('hidden');
        navbar.classList.remove('visible');
      }
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        navbar.classList.remove('hidden');
        navbar.classList.add('visible');
      }, SHOW_DELAY);
    };

    window.addEventListener('scroll', onScrollHideShow, { passive: true });
  }

  // -------------------------
  // Scroll-to-top button
  // -------------------------
  if (scrollToTopBtn) {
    const toggleScrollBtn = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollToTopBtn.style.display = (scrollTop > 300) ? 'block' : 'none';
    };
    toggleScrollBtn();
    window.addEventListener('scroll', toggleScrollBtn, { passive: true });
    scrollToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // -------------------------
  // Swiper initializations
  // -------------------------
  if (typeof Swiper !== 'undefined') {
    try {
      // Hero / main swiper
      if (document.querySelector('.hero-swiper')) {
        new Swiper('.hero-swiper', {
          loop: true,
          autoplay: { delay: 4000, disableOnInteraction: false },
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          pagination: { el: '.swiper-pagination', clickable: true },
          slidesPerView: 'auto',
          spaceBetween: 20
        });
      }
    } catch (error) {
      console.error('Error initializing Swiper:', error);
    }
  }
});

// -------------------------
// Portfolio / Projects swiper
// -------------------------
if (document.querySelector('.mySwiper')) {
  var swiper = new Swiper(".mySwiper", {
    slidesPerView: 3,      // show 3 cards at once
    spaceBetween: 20,      // space between cards
    loop: true,           // turn OFF loop since you only have 4 projects
    loopedSlides: 4,
    navigation: {
      nextEl: "#portfolio .swiper-button-next",
      prevEl: "#portfolio .swiper-button-prev",
    },
    autoplay: {
    delay: 3000,
    disableOnInteraction: false,
    },
    breakpoints: {
      320: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
    },
    on: {
      init: function () {
        document.querySelectorAll('#portfolio .swiper-slide-visible')
          .forEach(slide => slide.classList.add('fade-in'));
      },
      slideChangeTransitionStart: function () {
        document.querySelectorAll('#portfolio .swiper-slide')
          .forEach(slide => slide.classList.remove('fade-in'));
      },
      slideChangeTransitionEnd: function () {
        document.querySelectorAll('#portfolio .swiper-slide-visible')
          .forEach(slide => slide.classList.add('fade-in'));
      }
    }
  });
}

