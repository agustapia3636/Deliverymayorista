// js/historial.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----------------------
// DOM
// ----------------------
const tituloCliente = document.getElementById("tituloCliente");
const tablaHistorial = document.getElementById("tablaHistorial");
const btnLogout = document.getElementById("logoutBtn");

// Obtener ID del cliente desde la URL
const urlParams = new URLSearchParams(window.location.search);
const clienteId = urlParams.get("cliente");

if (!clienteId) {
  tablaHistorial.innerHTML = "<tr><td colspan='6'>ID de cliente no válido.</td></tr>";
}

// ----------------------
// SESIÓN
// ----------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await cargarHistorial();
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ----------------------
// CARGAR HISTORIAL
// ----------------------
async function cargarHistorial() {
  tablaHistorial.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

  try {
    const ref = collection(db, "ventas");
    const q = query(ref, where("clienteId", "==", clienteId));

    const snap = await getDocs(q);

    if (snap.empty) {
      tablaHistorial.innerHTML = "<tr><td colspan='6'>Este cliente no tiene compras registradas.</td></tr>";
      return;
    }

    let rows = "";
    snap.forEach((doc) => {
      const v = doc.data();

      // Convertir fecha legible
      let fechaLegible = "-";
      if (v.fecha) {
        fechaLegible = new Date(v.fecha).toLocaleString();
      }

      rows += `
        <tr>
          <td>${fechaLegible}</td>
          <td>${v.productoCodigo} - ${v.productoNombre}</td>
          <td>${v.cantidad}</td>
          <td>$${v.total}</td>
          <td>${v.estado}</td>
          <td>${v.notas || "-"}</td>
        </tr>
      `;

      // mostrar título
      tituloCliente.textContent = v.clienteNombre || "Cliente";
    });

    tablaHistorial.innerHTML = rows;

  } catch (e) {
    console.error("Error historial:", e);
    tablaHistorial.innerHTML = "<tr><td colspan='6'>Ocurrió un error al cargar el historial.</td></tr>";
  }
}
