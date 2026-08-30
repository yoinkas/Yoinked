const AppState = {
  currentLang: "en",
  currentTheme: "dark",
  isMenuOpen: false,
};

document.addEventListener("DOMContentLoaded", () => {
  loadPreferences();
  initLanguage();
  initTheme();
  initNavigation();
  initMobileMenu();
  initFormHandlers();
  generateParticles();
  initLoaderAnimation();
  initScrollAnimations();
});

function loadPreferences() {
  AppState.currentLang = localStorage.getItem("portfolio-lang") || "en";
  AppState.currentTheme = localStorage.getItem("portfolio-theme") || "dark";
}

function initLanguage() {
  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.addEventListener("click", toggleLanguage);
  setLanguage(AppState.currentLang);
}

function toggleLanguage() {
  setLanguage(AppState.currentLang === "en" ? "ar" : "en");
  localStorage.setItem("portfolio-lang", AppState.currentLang);
}

function setLanguage(lang) {
  AppState.currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.dataset.lang = lang;
  document.body.dataset.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-text-en], [data-text-ar]").forEach((element) => {
    const value = element.getAttribute(`data-text-${lang}`);
    if (value) element.textContent = value;
  });

  document.querySelectorAll("[data-placeholder-en], [data-placeholder-ar]").forEach((element) => {
    const value = element.getAttribute(`data-placeholder-${lang}`);
    if (value) element.placeholder = value;
  });

  const langText = document.querySelector(".lang-text");
  if (langText) langText.textContent = lang === "en" ? "AR" : "EN";
}

function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
  setTheme(AppState.currentTheme);
}

function toggleTheme() {
  setTheme(AppState.currentTheme === "dark" ? "light" : "dark");
  localStorage.setItem("portfolio-theme", AppState.currentTheme);
}

function setTheme(theme) {
  AppState.currentTheme = theme;
  document.body.dataset.theme = theme;
  const icon = document.querySelector("#themeToggle i");
  if (icon) icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link[href^='#']");
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const section = document.querySelector(link.getAttribute("href"));
      if (!section) return;
      window.scrollTo({ top: section.offsetTop - 72, behavior: "smooth" });
      if (AppState.isMenuOpen) toggleMobileMenu();
    });
  });

  window.addEventListener("scroll", () => {
    document.getElementById("header").classList.toggle("scrolled", window.scrollY > 50);
    updateActiveSection();
  });
}

function updateActiveSection() {
  const scrollPosition = window.scrollY + 120;
  document.querySelectorAll("section[id]").forEach((section) => {
    if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
      document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.toggle("active", link.dataset.section === section.id);
      });
    }
  });
}

function initMobileMenu() {
  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) menuToggle.addEventListener("click", toggleMobileMenu);
}

function toggleMobileMenu() {
  AppState.isMenuOpen = !AppState.isMenuOpen;
  document.getElementById("navMenu").classList.toggle("active", AppState.isMenuOpen);
  document.getElementById("menuToggle").classList.toggle("active", AppState.isMenuOpen);
}

function initFormHandlers() {
  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert(AppState.currentLang === "ar" ? "تم إرسال الرسالة بنجاح!" : "Message sent successfully!");
    contactForm.reset();
  });
}

function generateParticles() {
  const particlesContainer = document.getElementById("particles");
  if (!particlesContainer) return;
  const symbols = ["{", "}", "[", "]", "(", ")", "<", ">", "/", "*", "=", "+", "-", ";", ":", "&", "|", "%", "$", "#", "@"];
  for (let index = 0; index < 20; index += 1) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.animationDuration = `${10 + Math.random() * 10}s`;
    particlesContainer.appendChild(particle);
  }
}

function initLoaderAnimation() {
  const loader = document.getElementById("loader");
  const loaderPercent = document.getElementById("loaderPercent");
  if (!loader || !loaderPercent) return;

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(100, progress + Math.random() * 18);
    loaderPercent.textContent = `${Math.floor(progress)}%`;
    if (progress < 100) return;

    clearInterval(progressInterval);
    setTimeout(() => {
      loader.classList.add("hidden");
      initHeroAnimation();
    }, 250);
  }, 90);
}

function initHeroAnimation() {
  const nameValue = document.querySelector("#heroName .name-value");
  if (!nameValue || typeof anime === "undefined") return;
  const originalText = nameValue.textContent;
  nameValue.textContent = "";
  anime({
    targets: { value: 0 },
    value: originalText.length,
    duration: 1400,
    easing: "easeInOutQuad",
    update(anim) {
      nameValue.textContent = originalText.slice(0, Math.floor(anim.animatables[0].target.value));
    },
  });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");

      if (entry.target.classList.contains("skill-item")) {
        animateSkill(entry.target);
      }

      if (entry.target.classList.contains("stat-number")) {
        animateStat(entry.target);
      }

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25 });

  document.querySelectorAll(".portfolio-section, .project-card, .timeline-item, .contact-item, .skill-item, .stat-number").forEach((element) => {
    observer.observe(element);
  });
}

function animateSkill(skillItem) {
  const percent = Number(skillItem.dataset.percent || 0);
  const progress = skillItem.querySelector(".skill-progress");
  const label = skillItem.querySelector(".skill-percent");
  if (progress) progress.style.width = `${percent}%`;
  if (!label) return;

  let value = 0;
  const interval = setInterval(() => {
    value += 2;
    label.textContent = `${Math.min(value, percent)}%`;
    if (value >= percent) clearInterval(interval);
  }, 18);
}

function animateStat(stat) {
  const target = Number(stat.dataset.count || 0);
  let value = 0;
  const interval = setInterval(() => {
    value += 1;
    stat.textContent = Math.min(value, target);
    if (value >= target) clearInterval(interval);
  }, 30);
}
