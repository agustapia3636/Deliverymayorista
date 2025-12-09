// js/login.js
import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// DOM
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const rememberInput = document.getElementById("rememberMe"); // por ahora no lo usamos, pero ya queda
const btnLogin = document.getElementById("btnLogin");
const msgBox = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");

// Si ya está logueado → directo al panel
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "admin.html";
  }
});

// Mostrar / ocultar contraseña
if (togglePassword && passInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword = passInput.type === "password";
    passInput.type = isPassword ? "text" : "password";
  });
}

function setMsg(text, type = "error") {
  if (!msgBox) return;
  msgBox.textContent = text;
  msgBox.className = "login-msg " + (type === "ok" ? "ok" : "error");
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (emailInput?.value || "").trim();
    const password = passInput?.value || "";

    if (!email || !password) {
      setMsg("Completá correo y contraseña.", "error");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Ingresando...";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged se encarga de redirigir
      setMsg("Ingreso correcto, redirigiendo...", "ok");
    } catch (err) {
      console.error(err);
      let msg = "Error al iniciar sesión.";

      if (err.code === "auth/invalid-credential" ||
          err.code === "auth/wrong-password") {
        msg = "Correo o contraseña incorrectos.";
      } else if (err.code === "auth/user-not-found") {
        msg = "No existe un usuario con ese correo.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Demasiados intentos. Probá de nuevo más tarde.";
      }

      setMsg(msg, "error");
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar al panel";
    }
  });
}