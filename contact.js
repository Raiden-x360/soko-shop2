// Provide an optional prefilled WhatsApp message alongside the email form.
const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
const whatsappButton = document.getElementById("contact-whatsapp");
const whatsappNumber = "254143415478";

whatsappButton.addEventListener("click", () => {
  if (!contactForm.reportValidity()) return;
  const formData = new FormData(contactForm);
  const message = [
    `${formData.get("topic")} — Soko & Co. contact`,
    `Name: ${formData.get("name")}`,
    `Email: ${formData.get("email")}`,
    "",
    String(formData.get("message")),
  ].join("\n");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  contactStatus.textContent =
    "WhatsApp should open with your message ready to review and send.";
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});
