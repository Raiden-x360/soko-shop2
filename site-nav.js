// Controls the shared responsive navigation menu used by Soko & Co. pages.
const nav = document.querySelector(".nav");
const menuButton = nav && nav.querySelector(".mobile-menu-toggle");
const menuOverlay = nav && nav.querySelector("[data-menu-overlay]");
const menuLinks = nav ? [...nav.querySelectorAll(".nav-links a")] : [];

if (!nav || !menuButton || !menuOverlay) {
  throw new Error("Mobile navigation controls are missing.");
}

// Keep menu visibility, accessibility state, page scrolling, and keyboard focus aligned.
function setMenuOpen(isOpen, restoreFocus = false) {
  nav.classList.toggle("is-menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu",
  );
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) menuLinks[0]?.focus({ preventScroll: true });
  else if (restoreFocus) menuButton.focus({ preventScroll: true });
}

// Toggle the drawer, close it on navigation/backdrop/Escape, and support keyboard focus.
menuButton.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true", true);
});

menuOverlay.addEventListener("click", () => setMenuOpen(false, true));
menuLinks.forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (menuButton.getAttribute("aria-expanded") !== "true") return;

  if (event.key === "Escape") {
    event.preventDefault();
    setMenuOpen(false, true);
    return;
  }

  if (event.key !== "Tab" || menuLinks.length === 0) return;
  const lastFocusable = menuButton;
  const firstFocusable = menuLinks[0];
  if (event.shiftKey && document.activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable.focus();
  } else if (!event.shiftKey && document.activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 600) setMenuOpen(false);
});
