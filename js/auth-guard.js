// js/auth-guard.js
import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// -------------------------
// Protección de páginas del panel
// -------------------------
onAuthStateChanged(auth, (user) => {
  // Si no hay usuario logueado y NO estamos en login.html → mandar a login
  const path = window.location.pathname || "";
  const esLogin = path.endsWith("/login.html") || path.endsWith("login.html");

  if (!user && !esLogin) {
    // (Opcional) guardar a dónde quería ir para usarlo en el futuro
    try {
      sessionStorage.setItem(
        "dm_afterLogin",
        window.location.pathname + window.location.search
      );
    } catch (e) {
      console.warn("No se pudo guardar dm_afterLogin:", e);
    }

    window.location.href = "login.html";
  }
});

// -------------------------
// Botón "Cerrar sesión"
// -------------------------
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }

    // Limpiar posible URL guardada y volver al login
    try {
      sessionStorage.removeItem("dm_afterLogin");
    } catch (e) {
      /* ignore */
    }

    window.location.href = "login.html";
  });
}