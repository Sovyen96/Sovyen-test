const STORAGE_KEY = 'ml.age-verified';
const MIN_AGE = 18;

const gate = document.getElementById('age-gate');
const enterBtn = document.getElementById('age-gate-enter');
const leaveBtn = document.getElementById('age-gate-leave');
const errorEl = document.getElementById('age-gate-error');

function calcAge(day, month, year) {
  const today = new Date();
  const birth = new Date(year, month - 1, day);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function hideGate() {
  gate.classList.add('is-hidden');
  setTimeout(() => gate.remove(), 600);
  document.documentElement.style.overflow = '';
}

if (sessionStorage.getItem(STORAGE_KEY) === '1') {
  gate.remove();
} else {
  document.documentElement.style.overflow = 'hidden';
}

enterBtn?.addEventListener('click', () => {
  const day = parseInt(document.getElementById('age-day').value, 10);
  const month = parseInt(document.getElementById('age-month').value, 10);
  const year = parseInt(document.getElementById('age-year').value, 10);
  const currentYear = new Date().getFullYear();

  if (!day || !month || !year || day > 31 || month > 12 || year < 1900 || year > currentYear) {
    errorEl.textContent = 'Por favor introduce una fecha válida.';
    errorEl.hidden = false;
    return;
  }

  const age = calcAge(day, month, year);
  if (age >= MIN_AGE) {
    sessionStorage.setItem(STORAGE_KEY, '1');
    hideGate();
  } else {
    errorEl.textContent = 'Lo sentimos, debes ser mayor de 18 años para entrar.';
    errorEl.hidden = false;
  }
});

leaveBtn?.addEventListener('click', () => {
  window.location.href = 'https://www.google.com';
});
