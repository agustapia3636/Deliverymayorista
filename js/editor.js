import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const form = document.getElementById("formProducto");
const btnEliminar = document.getElementById("btnEliminar");

const codigo = document.getElementById("codigo");
const nombre = document.getElementById("nombre");
const precio = document.getElementById("precio");
const stock = document.getElementById("stock");
const categoria = document.getElementById("categoria");
const subcategoria = document.getElementById("subcategoria");
const descripcion = document.getElementById("descripcion");
const imagen = document.getElementById("imagen");

// Verificar login
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Si estamos editando un producto
  if (id) {
    cargarProducto(id);
    btnEliminar.style.display = "block";
  }
});

// Cargar datos del producto existente
async function cargarProducto(id) {
  const ref = doc(db, "productos", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("El producto no existe.");
    window.location.href = "admin.html";
    return;
  }

  const p = snap.data();
  codigo.value = p.codigo;
  nombre.value = p.nombre;
  precio.value = p.precio;
  stock.value = p.stock;
  categoria.value = p.categoria;
  subcategoria.value = p.subcategoria || "";
  descripcion.value = p.descripcion || "";
  imagen.value = p.imagen || "";
}

// Guardar o actualizar producto
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    codigo: codigo.value.trim(),
    nombre: nombre.value.trim(),
    precio: Number(precio.value),
    stock: Number(stock.value),
    categoria: categoria.value.trim(),
    subcategoria: subcategoria.value.trim(),
    descripcion: descripcion.value.trim(),
    imagen: imagen.value.trim()
  };

  if (id) {
    await updateDoc(doc(db, "productos", id), data);
    alert("Producto actualizado correctamente ✔️");
  } else {
    await setDoc(doc(db, "productos", data.codigo), data);
    alert("Producto creado correctamente ✔️");
  }

  window.location.href = "admin.html";
});

// Eliminar producto
btnEliminar.addEventListener("click", async () => {
  if (!confirm("¿Eliminar este producto?")) return;

  await deleteDoc(doc(db, "productos", id));
  alert("Producto eliminado.");
  window.location.href = "admin.html";
});
