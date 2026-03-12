export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/263782244007"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg hover:scale-110 transition-transform"
    >
      <img
        src="/whatsapp.png"
        alt="WhatsApp"
        className="w-full h-full object-contain"
      />
    </a>
  );
}
