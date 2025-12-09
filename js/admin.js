// js/admin.js
import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// -----------------------------
// ELEMENTOS DEL DOM
// -----------------------------
const tablaProductos = document.getElementById("tablaProductos");
const buscador = document.getElementById("buscar");
const btnNuevo = document.getElementById("btnNuevo");
const btnLogout = document.getElementById("logoutBtn");

// -----------------------------
// VERIFICAR USUARIO LOGUEADO
// -----------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  console.log("Usuario activo:", user.email);
  await cargarProductos();
});

// -----------------------------
// CERRAR SESIÓN
// -----------------------------
btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// -----------------------------
// ABRIR FORMULARIO NUEVO PRODUCTO
// -----------------------------
btnNuevo.addEventListener("click", () => {
  // sin id => modo CREAR
  window.location.href = "editor.html";
});

// -----------------------------
// CARGAR PRODUCTOS DESDE FIRESTORE
// -----------------------------
let productos = [];

async function cargarProductos() {
  tablaProductos.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

  const ref = collection(db, "productos");
  const snap = await getDocs(ref);

  productos = snap.docs.map(d => ({
    id: d.id,        // normalmente el código (N0001, etc.)
    ...d.data()
  }));

  mostrarProductos(productos);
}

// -----------------------------
// MOSTRAR PRODUCTOS EN LA TABLA
// -----------------------------
function mostrarProductos(lista) {
  tablaProductos.innerHTML = "";

  if (lista.length === 0) {
    tablaProductos.innerHTML = `<tr>
      <td colspan="6">No hay productos que coincidan.</td>
    </tr>`;
    return;
  }

  lista.forEach(p => {
    const codigo = p.codigo ?? p.id ?? ""; // ← acá evitamos el "undefined"

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${codigo}</td>
      <td>${p.nombre || ""}</td>
      <td>$${p.precio ?? ""}</td>
      <td>${p.stock ?? ""}</td>
      <td>${p.categoria || ""}</td>
      <td>
        <button class="btn-editar" data-id="${codigo}">Editar</button>
        <button class="btn-eliminar" data-id="${codigo}">Eliminar</button>
      </td>
    `;
    tablaProductos.appendChild(fila);
  });

  activarBotones();
}

// -----------------------------
// BUSCADOR EN TIEMPO REAL
// -----------------------------
buscador.addEventListener("input", () => {
  const q = buscador.value.toLowerCase();

  const filtrados = productos.filter(p => {
    const codigo = (p.codigo ?? p.id ?? "").toLowerCase();
    const nombre = (p.nombre || "").toLowerCase();
    return nombre.includes(q) || codigo.includes(q);
  });

  mostrarProductos(filtrados);
});

// -----------------------------
// BOTONES EDITAR & ELIMINAR
// -----------------------------
function activarBotones() {
  // EDITAR
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const codigo = e.target.dataset.id;
      window.location.href = `editor.html?id=${encodeURIComponent(codigo)}`;
    });
  });

  // ELIMINAR
  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const codigo = e.target.dataset.id;

      if (!confirm(`¿Seguro que querés eliminar el producto ${codigo}?`)) return;

      await deleteDoc(doc(db, "productos", codigo));
      alert("Producto eliminado 👍");
      cargarProductos();
    });
  });
}
