/** Contato: validação do formulário e envio via WhatsApp. */
import { maskPhone } from '../modules/format.js';

const WHATSAPP_NUMBER = '5511999990000';
const form = document.getElementById('contact-form');
const feedback = document.getElementById('contact-feedback');

const phoneInput = document.getElementById('contact-phone');
phoneInput.addEventListener('input', () => {
  phoneInput.value = maskPhone(phoneInput.value);
});

const validators = {
  'contact-name': (v) => (v.trim().length >= 3 ? '' : 'Informe seu nome.'),
  'contact-message': (v) => (v.trim().length >= 5 ? '' : 'Escreva sua mensagem.'),
};

function validateField(input) {
  const check = validators[input.id];
  if (!check) return true;
  const message = check(input.value);
  const field = input.closest('.form-field');
  field.classList.toggle('has-error', Boolean(message));
  field.querySelector('.error-msg').textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const inputs = [...form.querySelectorAll('input[id], textarea[id]')];
  const firstInvalid = inputs.filter((i) => !validateField(i))[0];
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const name = form.elements['name'].value.trim();
  const phone = form.elements['phone'].value.trim();
  const message = form.elements['message'].value.trim();
  const text = `Olá, slürk! Meu nome é ${name}.${phone ? ` (${phone})` : ''}\n\n${message}`;

  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener',
  );

  feedback.hidden = false;
  form.reset();
});
