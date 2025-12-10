// js/auth-guard.js
import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// -------------------------
// Config: qué páginas son privadas y cuáles públicas
// -------------------------

// Páginas que requieren sesión iniciada
const PAGINAS_PROTEGIDAS = [
  "admin.html",
  "editor.html",
  "ventas.html",
  "clientes.html",
  "historial.html"
];

// Páginas públicas (no redirigir aunque no haya usuario)
const PAGINAS_PUBLICAS = [
  "",
  "index.html",
  "catalogo.html",
  "carrito.html",
  "producto.html",
  "login.html"
];

// Detectar archivo actual (sin querystring)
const path = window.location.pathname || "";
let actual = path.substring(path.lastIndexOf("/") + 1);
actual = actual.split("?")[0] || ""; // por si viene con ?algo

const esLogin = actual === "login.html";
const esProtegida = PAGINAS_PROTEGIDAS.includes(actual);

// -------------------------
// Protección de páginas del panel
// -------------------------
onAuthStateChanged(auth, (user) => {
  // Si estamos en una página pública, no hacemos nada
  if (!esProtegida) {
    // Caso especial: si estamos en login y ya hay usuario, podemos llevarlo al admin
    if (esLogin && user) {
      // Intentar recuperar adónde quería ir antes de loguearse
      let destino = "admin.html";
      try {
        const guardado = sessionStorage.getItem("dm_afterLogin");
        if (guardado) destino = guardado;
      } catch (e) {
        // ignorar
      }
      window.location.href = destino;
    }
    return;
  }

  // Si la página es protegida y NO hay usuario, mandamos al login
  if (!user) {
    try {
      // Guardar adónde quería ir
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
