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
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* -----------------------------
   ELEMENTOS DEL DOM
----------------------------- */
const tablaProductos = document.getElementById("tablaProductos");
const buscador       = document.getElementById("buscar");
const btnNuevo       = document.getElementById("btnNuevo");
const btnLogout      = document.getElementById("logoutBtn");

/* -----------------------------
   VERIFICAR USUARIO LOGUEADO
----------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  console.log("Usuario activo:", user.email);
  await cargarProductos();
});

/* -----------------------------
   CERRAR SESIÓN
----------------------------- */
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
    window.location.href = "login.html";
  });
}

/* -----------------------------
   ABRIR FORMULARIO NUEVO PRODUCTO
----------------------------- */
if (btnNuevo) {
  btnNuevo.addEventListener("click", () => {
    // sin id => modo CREAR
    window.location.href = "editor.html";
  });
}

/* -----------------------------
   FORMATEO DE PRECIO
----------------------------- */
function formatearPrecio(valor) {
  const num = Number(valor) || 0;
  return Math.round(num).toLocaleString("es-AR", {
    maximumFractionDigits: 0
  });
}

/* -----------------------------
   CARGAR PRODUCTOS DESDE FIRESTORE
----------------------------- */
let productos = [];

async function cargarProductos() {
  if (!tablaProductos) return;

  tablaProductos.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

  try {
    const ref = collection(db, "productos");
    const q   = query(ref, orderBy("codigo")); // orden por código (N0001, N0002, ...)
    const snap = await getDocs(q);

    productos = snap.docs.map(d => ({
      id: d.id,         // normalmente el código (N0001, etc.)
      ...d.data()
    }));

    mostrarProductos(productos);
  } catch (err) {
    console.error("Error cargando productos:", err);
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="6">Error al cargar productos. Revisá la consola.</td>
      </tr>
    `;
  }
}

/* -----------------------------
   MOSTRAR PRODUCTOS EN LA TABLA
----------------------------- */
function mostrarProductos(lista) {
  if (!tablaProductos) return;

  tablaProductos.innerHTML = "";

  if (!lista.length) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="6">No hay productos que coincidan.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(p => {
    const codigo = p.codigo ?? p.id ?? ""; // fallback al id si falta el campo

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${codigo}</td>
      <td>${p.nombre || ""}</td>
      <td>$ ${formatearPrecio(p.precio)}</td>
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

/* -----------------------------
   BUSCADOR EN TIEMPO REAL
----------------------------- */
if (buscador) {
  buscador.addEventListener("input", () => {
    const q = buscador.value.toLowerCase();

    const filtrados = productos.filter(p => {
      const codigo = (p.codigo ?? p.id ?? "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      return nombre.includes(q) || codigo.includes(q);
    });

    mostrarProductos(filtrados);
  });
}

/* -----------------------------
   BOTONES EDITAR & ELIMINAR
----------------------------- */
function activarBotones() {
  // EDITAR
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const codigo = e.currentTarget.dataset.id;
      if (!codigo) return;
      window.location.href = `editor.html?id=${encodeURIComponent(codigo)}`;
    });
  });

  // ELIMINAR
  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const codigo = e.currentTarget.dataset.id;
      if (!codigo) return;

      const ok = confirm(`¿Seguro que querés eliminar el producto ${codigo}?`);
      if (!ok) return;

      try {
        // el id del documento es el código (N0001, etc.)
        await deleteDoc(doc(db, "productos", codigo));
        alert("Producto eliminado 👍");
        cargarProductos();
      } catch (err) {
        console.error("Error eliminando producto:", err);
        alert("Hubo un error al eliminar el producto. Revisá la consola.");
      }
    });
  });
}
