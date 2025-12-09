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
    // Si no está logueado → volver al login
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
  alert("Acá pronto abrimos el formulario de 'Nuevo producto' 🛠️🔥");
});

// -----------------------------
// CARGAR PRODUCTOS DESDE FIRESTORE
// -----------------------------
let productos = []; // memoria interna

async function cargarProductos() {
  tablaProductos.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";

  const ref = collection(db, "productos");
  const snap = await getDocs(ref);

  productos = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  mostrarProductos(productos);
}

// -----------------------------
// MOSTRAR PRODUCTOS EN TABLA
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
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${p.codigo}</td>
      <td>${p.nombre}</td>
      <td>$${p.precio}</td>
      <td>${p.stock}</td>
      <td>${p.categoria}</td>
      <td>
        <button class="btn-editar" data-id="${p.id}">Editar</button>
        <button class="btn-eliminar" data-id="${p.id}">Eliminar</button>
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

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.codigo.toLowerCase().includes(q)
  );

  mostrarProductos(filtrados);
});

// -----------------------------
// BOTONES EDITAR & ELIMINAR
// -----------------------------
function activarBotones() {
  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      alert("Editar producto: " + id + " (pronto habilitado)");
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;

      if (!confirm("¿Seguro que querés eliminar este producto?")) return;

      await deleteDoc(doc(db, "productos", id));
      alert("Producto eliminado 👍");

      cargarProductos();
    });
  });
}
