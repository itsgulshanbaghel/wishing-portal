// Theme toggling logic
const body = document.body;
function setTheme(isDark) {
  const themeIcon = document.getElementById('themeIcon') || (document.getElementById('modeToggle') ? document.getElementById('modeToggle').querySelector('i') : null);
  if (isDark) {
    body.classList.add('dark');
    if (themeIcon) themeIcon.className = 'fas fa-sun';
    localStorage.setItem('greeter-theme', 'dark');
  } else {
    body.classList.remove('dark');
    if (themeIcon) themeIcon.className = 'fas fa-moon';
    localStorage.setItem('greeter-theme', 'light');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme
  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.addEventListener('click', () => setTheme(!body.classList.contains('dark')));
  }
  if (localStorage.getItem('greeter-theme') === 'dark') {
    setTheme(true);
  } else {
    setTheme(false);
  }

  // Navbar scrolled behavior
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);
  });

  // Mobile menu behavior
  const navLinks = document.getElementById('navLinks');
  const menuBtn = document.getElementById('mobileMenuBtn');
  if (menuBtn && navLinks) {
    const toggleMobileMenu = () => {
      navLinks.classList.toggle('show');
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars', !navLinks.classList.contains('show'));
        icon.classList.toggle('fa-times', navLinks.classList.contains('show'));
      }
    };
    menuBtn.addEventListener('click', toggleMobileMenu);
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('show') && !navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        toggleMobileMenu();
      }
    });
  }

  // Modal behavior
  const customModal = document.getElementById('customModal');
  if (customModal) {
    window.showModal = (msg) => {
      const modalMessage = document.getElementById('modalMessage');
      if (modalMessage) modalMessage.innerText = msg;
      customModal.style.display = 'flex';
    };
    window.closeModal = () => {
      customModal.style.display = 'none';
    };
    const signinBtn = document.getElementById('signinBtn');
    if (signinBtn) {
      signinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.translations && window.translations[window.currentLang]) {
          showModal(window.translations[window.currentLang].signinAlert);
        } else {
          showModal("Sign in functionality is coming soon! Feel free to create wish pages directly without signing in.");
        }
      });
    }
  }

  // Reading progress bar & back to top button
  const progressBar = document.getElementById('readProgress');
  const backTopBtn = document.getElementById('backToTop');
  
  if (progressBar || backTopBtn) {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop;
      const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (progressBar && docH > 0) {
        progressBar.style.width = (scrollTop / docH * 100) + '%';
      }
      if (backTopBtn) {
        backTopBtn.classList.toggle('visible', scrollTop > 300);
      }
    });
  }

  if (backTopBtn) {
    backTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Scroll reveal via IntersectionObserver
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (revealEls.length > 0) {
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(el => obs.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('visible'));
    }
  }

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      }
    });
  });
});
