/* ==========================================================================
   Safe Scientific – Patient Records PWA
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Data ---------- */

  // Patient IDs run in one series: 42112210801, 42112210802, 42112210803 ...
  const ID_BASE = 42112210800;
  const makeId = (n) => String(ID_BASE + n);

  // 10 existing patients: name, age, number of oocytes
  const PATIENT_ROWS = [
    ['Priya Raman',        29, 12],
    ['Anitha Krishnan',    34,  8],
    ['Meena Sundaram',     31, 14],
    ['Lakshmi Narayanan',  38,  6],
    ['Divya Subramanian',  27, 16],
    ['Kavitha Murugan',    36,  9],
    ['Revathi Balaji',     33, 11],
    ['Sangeetha Venkat',   30, 13],
    ['Nithya Prakash',     28, 15],
    ['Deepa Chandran',     40,  5]
  ];

  const PATIENTS = PATIENT_ROWS.map((r, i) => ({
    name: r[0], id: makeId(i + 1), age: r[1], oocytes: r[2]
  }));
  const MAX_PATIENTS = 20;

  /* ---------- Helpers ---------- */

  const $ = (id) => document.getElementById(id);

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPod|iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS reports as Mac
  const isStandalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

  function safeStorage(kind) {
    try { return window[kind]; } catch (e) { return null; }
  }
  const session = safeStorage('sessionStorage');
  const local = safeStorage('localStorage');

  function getItem(store, key) { try { return store ? store.getItem(key) : null; } catch (e) { return null; } }
  function setItem(store, key, val) {
    try {
      if (!store) return false;
      store.setItem(key, val);
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadAddedPatients() {
    const saved = getItem(session, 'ss-added-patients');
    if (!saved) return [];

    try {
      const patients = JSON.parse(saved);
      if (!Array.isArray(patients) || patients.some((patient) =>
        !patient || typeof patient.name !== 'string' || typeof patient.id !== 'string' ||
        !Number.isSafeInteger(patient.age) || patient.age < 0 ||
        !Number.isSafeInteger(patient.oocytes) || patient.oocytes < 0
      )) {
        throw new Error('Unexpected patient data format.');
      }
      return patients;
    } catch (error) {
      console.warn('Could not load patient records for this session:', error);
      return [];
    }
  }

  let query = '';
  const addedPatients = loadAddedPatients();
  let hasSubmittedPatientForm = false;

  /* ---------- Theme ---------- */

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    $('theme-toggle').setAttribute('aria-pressed', String(isDark));
    $('theme-toggle').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    $('theme-toggle-icon').textContent = isDark ? '☀' : '☾';
    $('theme-toggle-label').textContent = isDark ? 'Light mode' : 'Dark mode';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', isDark ? '#1f262b' : '#e8ebee');
  }

  function initializeTheme() {
    const savedTheme = getItem(local, 'ss-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (prefersDark ? 'dark' : 'light'));

    $('theme-toggle').addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      setItem(local, 'ss-theme', theme);
    });
  }

  /* ---------- Rendering ---------- */

  function dataset() {
    return PATIENTS.concat(addedPatients);
  }

  function td(className, label, child) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.setAttribute('data-label', label);
    if (typeof child === 'string') cell.textContent = child; else cell.appendChild(child);
    return cell;
  }

  function oocyteCell(count, max) {
    const wrap = document.createElement('span');
    wrap.className = 'oocytes';

    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('i');
    fill.style.setProperty('--w', Math.round((count / max) * 100) + '%');
    bar.appendChild(fill);

    const num = document.createElement('b');
    num.textContent = String(count);

    wrap.appendChild(bar);
    wrap.appendChild(num);
    return wrap;
  }

  function render() {
    const all = dataset();
    const q = query.trim().toLowerCase();
    const list = q
      ? all.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))
      : all;

    const tbody = $('rows');
    if (tbody) {
      const maxOocytes = Math.max.apply(null, all.map((p) => p.oocytes));
      tbody.textContent = '';

      list.forEach((p) => {
        const tr = document.createElement('tr');
        tr.appendChild(td('name', 'Patient name', p.name));
        tr.appendChild(td('pid', 'Patient ID', p.id));
        tr.appendChild(td('num', 'Age', String(p.age)));
        tr.appendChild(td('num', 'Oocytes', oocyteCell(p.oocytes, maxOocytes)));
        tbody.appendChild(tr);
      });

      $('empty').hidden = list.length !== 0;
    }

    // Summary reflects what is currently listed
    const totalOocytes = list.reduce((s, p) => s + p.oocytes, 0);
    const avgAge = list.length ? (list.reduce((s, p) => s + p.age, 0) / list.length) : 0;
    if ($('stat-count')) $('stat-count').textContent = String(list.length);
    if ($('stat-age')) $('stat-age').textContent = list.length ? avgAge.toFixed(1) : '–';
    if ($('stat-oocytes')) $('stat-oocytes').textContent = String(totalOocytes);

    const form = $('patient-form');
    if (form) form.querySelector('[type="submit"]').disabled = all.length >= MAX_PATIENTS;
  }

  function patientFieldError(field) {
    const value = $(field).value.trim();
    if (!value) return '* Required Field';

    if (field === 'patient-name' && !/^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u.test(value)) {
      return 'Use letters and spaces only.';
    }
    if (field === 'patient-id') {
      if (!/^\d+$/.test(value)) return 'Use numbers only.';
      const idIsTaken = PATIENTS.concat(addedPatients)
        .some((patient) => patient.id === value);
      if (idIsTaken) return 'This patient ID is already in use.';
    }
    if (field === 'patient-age' || field === 'patient-oocytes') {
      const number = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)) {
        return 'Enter a whole number using digits only.';
      }
    }
    return '';
  }

  function updatePatientField(field) {
    const error = patientFieldError(field);
    const input = $(field);
    const message = $(field + '-error');
    input.setAttribute('aria-invalid', String(Boolean(error)));
    message.textContent = error;
    message.hidden = !error;
    return !error;
  }

  function submitPatient(event) {
    event.preventDefault();
    if (PATIENTS.length + addedPatients.length >= MAX_PATIENTS) {
      $('patient-form-status').textContent = 'Maximum of 20 patient records reached.';
      return;
    }

    hasSubmittedPatientForm = true;
    const fields = ['patient-name', 'patient-id', 'patient-age', 'patient-oocytes'];
    const invalidFields = fields.filter((field) => !updatePatientField(field));

    const entry = $('patient-entry');
    if (invalidFields.length) {
      entry.classList.remove('is-shaking');
      void entry.offsetWidth;
      entry.classList.add('is-shaking');
      $('patient-form-status').textContent = '';
      $(invalidFields[0]).focus();
      return;
    }

    const patient = {
      name: $('patient-name').value.trim(),
      id: $('patient-id').value.trim(),
      age: Number($('patient-age').value),
      oocytes: Number($('patient-oocytes').value)
    };
    addedPatients.push(patient);
    const saved = setItem(session, 'ss-added-patients', JSON.stringify(addedPatients));

    $('patient-form').reset();
    fields.forEach((field) => {
      $(field).removeAttribute('aria-invalid');
      $(field + '-error').textContent = '';
      $(field + '-error').hidden = true;
    });
    $('patient-form-status').textContent = !saved
      ? 'Patient added on this page, but could not be retained when switching pages. Check browser storage settings.'
      : PATIENTS.length + addedPatients.length >= MAX_PATIENTS
        ? 'Maximum of 20 patient records reached.'
        : 'Patient added for this session. Open Patient records from the menu to view it.';
    if ($('search')) $('search').value = '';
    query = '';
    render();
    $('patient-name').focus();
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    if ($('search')) $('search').addEventListener('input', (e) => { query = e.target.value; render(); });

    const form = $('patient-form');
    if (form) {
      form.addEventListener('submit', submitPatient);
      ['patient-name', 'patient-id', 'patient-age', 'patient-oocytes'].forEach((field) => {
        $(field).addEventListener('input', () => {
          if (hasSubmittedPatientForm) updatePatientField(field);
        });
      });
    }

    if ($('install-dismiss')) $('install-dismiss').addEventListener('click', () => {
      $('install-hint').hidden = true;
      setItem(local, 'ss-install-hint-dismissed', '1');
    });

    const menuToggle = $('menu-toggle');
    const navDrawer = $('nav-drawer');
    const navBackdrop = $('nav-backdrop');
    const navClose = $('nav-close');
    if (menuToggle && navDrawer && navBackdrop && navClose) {
      const closeMenu = () => {
        navDrawer.classList.remove('is-open');
        navBackdrop.classList.remove('is-visible');
        navDrawer.setAttribute('aria-hidden', 'true');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
        document.body.classList.remove('menu-open');
      };
      const openMenu = () => {
        navDrawer.classList.add('is-open');
        navBackdrop.classList.add('is-visible');
        navDrawer.setAttribute('aria-hidden', 'false');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Close navigation menu');
        document.body.classList.add('menu-open');
        navClose.focus();
      };

      menuToggle.addEventListener('click', () => {
        if (menuToggle.getAttribute('aria-expanded') === 'true') closeMenu();
        else openMenu();
      });
      navClose.addEventListener('click', closeMenu);
      navBackdrop.addEventListener('click', closeMenu);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
          closeMenu();
          menuToggle.focus();
        }
      });
    }
  }

  /* ---------- Splash screen ---------- */

  const SPLASH_MS = 2000;       // how long the splash stays visible
  const SPLASH_FADE_MS = 600;   // must match the CSS transition

  function showApp() {
    const splash = $('splash');
    splash.classList.add('is-leaving');
    setTimeout(() => { splash.remove(); }, SPLASH_FADE_MS + 100);
  }

  function startSplash() {
    // Show the splash once per launch; skip it when the page is reloaded in the same session.
    const seen = getItem(session, 'ss-splash-seen') === '1';
    if (seen) {
      $('splash').remove();
      return;
    }
    setItem(session, 'ss-splash-seen', '1');
    const ready = new Promise((res) => {
      if (document.readyState === 'complete') res(); else window.addEventListener('load', res);
    });
    const minTime = new Promise((res) => setTimeout(res, SPLASH_MS));
    Promise.all([ready, minTime]).then(showApp);
  }

  /* ---------- Install hint ---------- */

  const hintDismissed = () => getItem(local, 'ss-install-hint-dismissed') === '1';

  function maybeShowInstallHint() {
<<<<<<< HEAD
    if ($('install-hint') && isIOS && !isStandalone && getItem(local, 'ss-install-hint-dismissed') !== '1') {
=======
    if (isIOS && !isStandalone && !hintDismissed()) {
>>>>>>> 0cbe4d15c083c20700172d060bb4d4cac0e62ea8
      $('install-hint').hidden = false;
    }
  }

  // Android / desktop Chrome and Edge: offer an Install button when the browser allows it.
  let deferredInstall = null;

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstall = e;
      if (isStandalone || hintDismissed()) return;
      $('install-text').innerHTML = '<strong>Install this app on your device.</strong> ' +
        'It opens from your Home Screen and works offline.';
      $('install-button').hidden = false;
      $('install-dismiss').textContent = 'Not now';
      $('install-hint').hidden = false;
    });

    $('install-button').addEventListener('click', () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      deferredInstall.userChoice.finally(() => {
        deferredInstall = null;
        $('install-hint').hidden = true;
      });
    });

    window.addEventListener('appinstalled', () => {
      deferredInstall = null;
      $('install-hint').hidden = true;
    });
  }

  /* ---------- Service worker (PWA / offline) ---------- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // Service workers need HTTPS or localhost.
    const secure = location.protocol === 'https:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  /* ---------- Start ---------- */

  initializeTheme();
  bindEvents();
  render();
  maybeShowInstallHint();
  setupInstallPrompt();
  startSplash();
  registerServiceWorker();
})();
