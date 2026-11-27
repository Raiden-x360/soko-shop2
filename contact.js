// Keeps the local demo contact form honest: it displays a notice but sends no message.
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  contactStatus.textContent =
    "Your message wasn’t sent because this demo form isn’t connected to a messaging service.";
});
