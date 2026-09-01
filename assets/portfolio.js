const AppState = {
  currentLang: "en",
  currentTheme: "dark",
  isMenuOpen: false,
};

const supportedLanguages = ["en", "es", "fr", "ar"];

const languageLabels = {
  en: "EN",
  es: "ES",
  fr: "FR",
  ar: "AR",
};

const translations = {
  es: {
    "Home": "Inicio",
    "About": "Sobre mi",
    "Skills": "Habilidades",
    "Experience": "Experiencia",
    "Projects": "Proyectos",
    "Contact": "Contacto",
    "Hello, I'm": "Hola, soy",
    "Full Stack Developer & UI/UX Designer": "Desarrollador Full Stack y disenador UI/UX",
    "Passionate developer creating exceptional digital experiences with modern technologies.": "Desarrollador apasionado que crea experiencias digitales con tecnologias modernas.",
    "Get In Touch": "Contactame",
    "View Projects": "Ver proyectos",
    "Scroll Down": "Desplazarse",
    "About Me": "Sobre mi",
    "I'm a passionate Full Stack Developer with over 5 years of experience in building modern web applications and mobile solutions. I specialize in JavaScript technologies, React, Node.js, and creating beautiful user interfaces.": "Soy un desarrollador Full Stack enfocado en aplicaciones web modernas, interfaces responsivas, rutas autenticadas, APIs serverless e integraciones reales.",
    "Years Experience": "Anos de experiencia",
    "Happy Clients": "Clientes satisfechos",
    "Send Message": "Enviar mensaje",
    "Name": "Nombre",
    "Email": "Correo",
    "Subject": "Asunto",
    "Message": "Mensaje",
  },
  fr: {
    "Home": "Accueil",
    "About": "A propos",
    "Skills": "Competences",
    "Experience": "Experience",
    "Projects": "Projets",
    "Contact": "Contact",
    "Hello, I'm": "Bonjour, je suis",
    "Full Stack Developer & UI/UX Designer": "Developpeur Full Stack et designer UI/UX",
    "Passionate developer creating exceptional digital experiences with modern technologies.": "Developpeur passionne qui cree des experiences numeriques avec des technologies modernes.",
    "Get In Touch": "Me contacter",
    "View Projects": "Voir les projets",
    "Scroll Down": "Defiler",
    "About Me": "A propos de moi",
    "I'm a passionate Full Stack Developer with over 5 years of experience in building modern web applications and mobile solutions. I specialize in JavaScript technologies, React, Node.js, and creating beautiful user interfaces.": "Je suis un developpeur Full Stack concentre sur les applications web modernes, les interfaces responsives, les routes authentifiees, les APIs serverless et les integrations reelles.",
    "Years Experience": "Annees d'experience",
    "Happy Clients": "Clients satisfaits",
    "Send Message": "Envoyer",
    "Name": "Nom",
    "Email": "Email",
    "Subject": "Sujet",
    "Message": "Message",
  },
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
  const savedLang = localStorage.getItem("portfolio-lang") || "en";
  AppState.currentLang = supportedLanguages.includes(savedLang) ? savedLang : "en";
  AppState.currentTheme = localStorage.getItem("portfolio-theme") || "dark";
}

function initLanguage() {
  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.addEventListener("click", toggleLanguage);
  setLanguage(AppState.currentLang);
}

function toggleLanguage() {
  const currentIndex = supportedLanguages.indexOf(AppState.currentLang);
  const nextLang = supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
  setLanguage(nextLang);
  localStorage.setItem("portfolio-lang", AppState.currentLang);
}

function translateValue(lang, englishValue, fallbackValue) {
  if (lang === "en") return englishValue || fallbackValue;
  return translations[lang]?.[englishValue] || fallbackValue || englishValue;
}

function setLanguage(lang) {
  const activeLang = supportedLanguages.includes(lang) ? lang : "en";
  AppState.currentLang = activeLang;
  document.documentElement.lang = activeLang;
  document.documentElement.dir = activeLang === "ar" ? "rtl" : "ltr";
  document.body.dataset.lang = activeLang;
  document.body.dataset.dir = activeLang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-text-en]").forEach((element) => {
    const englishValue = element.getAttribute("data-text-en");
    const fallbackValue = element.getAttribute(`data-text-${activeLang}`);
    const value = translateValue(activeLang, englishValue, fallbackValue);
    if (value) element.textContent = value;
  });

  document.querySelectorAll("[data-placeholder-en]").forEach((element) => {
    const englishValue = element.getAttribute("data-placeholder-en");
    const fallbackValue = element.getAttribute(`data-placeholder-${activeLang}`);
    const value = translateValue(activeLang, englishValue, fallbackValue);
    if (value) element.placeholder = value;
  });

  const nextIndex = (supportedLanguages.indexOf(activeLang) + 1) % supportedLanguages.length;
  const langText = document.querySelector(".lang-text");
  if (langText) langText.textContent = languageLabels[supportedLanguages[nextIndex]];
  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.title = `Switch to ${languageLabels[supportedLanguages[nextIndex]]}`;
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
    const messages = {
      en: "Message sent successfully!",
      es: "Mensaje enviado correctamente!",
      fr: "Message envoye avec succes!",
      ar: "تم إرسال الرسالة بنجاح!",
    };
    alert(messages[AppState.currentLang] || messages.en);
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
