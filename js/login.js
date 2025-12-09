// js/login.js
import { auth, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const form = document.getElementById('login-form');
const btn = document.getElementById('login-btn');
const msg = document.getElementById('login-message');

function setMessage(text, type = 'error') {
  msg.textContent = text;
  msg.className = 'login-msg ' + (type === 'ok' ? 'ok' : 'error');
}

async function checkRoleAndEnter(user) {
  const ref = doc(db, 'usuarios', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await signOut(auth);
    setMessage('Tu usuario no está registrado en el sistema.', 'error');
    return;
  }

  const data = snap.data();
  if (data.rol === 'admin' || data.rol === 'empleado') {
    window.location.href = 'admin.html';
  } else {
    await signOut(auth);
    setMessage('No tenés permiso para acceder al panel.', 'error');
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    checkRoleAndEnter(user).catch(console.error);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;

  btn.disabled = true;
  setMessage('Ingresando...', 'ok');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await checkRoleAndEnter(cred.user);
  } catch (error) {
    console.error(error);
    let text = 'No se pudo iniciar sesión.';

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      text = 'Email o contraseña incorrectos.';
    } else if (error.code === 'auth/too-many-requests') {
      text = 'Demasiados intentos. Esperá un momento e intentá de nuevo.';
    }

    setMessage(text, 'error');
  } finally {
    btn.disabled = false;
  }
});
