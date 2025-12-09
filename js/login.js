// js/login.js
import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// -------------------------
// DOM
// -------------------------
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const msgBox = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");
const rememberCheckbox = document.getElementById("rememberMe");

// -------------------------
// Helper para mensajes (sin alerts)
// -------------------------
function setMessage(text, type = "error") {
  if (!msgBox) {
    console.warn("[login.js] loginMessage no existe en el HTML. Mensaje:", text);
    return;
  }
  msgBox.textContent = text || "";
  msgBox.className = "login-message " + (type === "ok" ? "ok" : "error");
}

// -------------------------
// Mostrar / ocultar password
// -------------------------
if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const tipoActual = passwordInput.getAttribute("type");
    const esPassword = tipoActual === "password";

    passwordInput.setAttribute("type", esPassword ? "text" : "password");

    // Opcional: cambiar estilo/emoji/icono del botón
    togglePassword.classList.toggle("active", esPassword);
    // Si usás un emoji dentro del botón, podés cambiarlo así:
    // togglePassword.textContent = esPassword ? "🙉" : "🙈";
  });
}

// -------------------------
// Auto-redirigir si ya está logueado
// -------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Ya hay sesión → directo al panel, sin mensajes ni alerts
    window.location.href = "admin.html";
  }
});

// -------------------------
// Login
// -------------------------
if (form && emailInput && passwordInput) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage(""); // limpia

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage("Completá el correo y la contraseña.", "error");
      return;
    }

    // Desactivar botón mientras se procesa
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = "Ingresando...";
    }

    try {
      // Persistencia según el checkbox
      if (rememberCheckbox && rememberCheckbox.checked) {
        await setPersistence(auth, browserLocalPersistence); // Mantener iniciada
      } else {
        await setPersistence(auth, browserSessionPersistence); // Solo pestaña
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login OK:", cred.user.uid);

      // Mensaje suave en la tarjeta (sin alert, sin botón de aceptar)
      setMessage("Entrando al panel...", "ok");

      // Pequeño delay para que se vea el mensaje y luego redirigir
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 300);
    } catch (error) {
      console.error("Error de login:", error);
      let texto = "No se pudo iniciar sesión.";

      switch (error.code) {
        case "auth/invalid-email":
          texto = "El correo no es válido.";
          break;
        case "auth/user-disabled":
          texto = "Este usuario está deshabilitado.";
          break;
        case "auth/user-not-found":
          texto = "No existe un usuario con ese correo.";
          break;
        case "auth/wrong-password":
          texto = "Contraseña incorrecta.";
          break;
      }

      setMessage(texto, "error");
    } finally {
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar al panel";
      }
    }
  });
} else {
  console.warn(
    "[login.js] No se encontró el formulario o los campos de email/password."
  );
}