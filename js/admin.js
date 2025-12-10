// js/admin.js
// Panel administrativo PRO: listado, filtros, búsqueda, thumbnails, stock con colores

import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- DOM ----------
const tbody            = document.getElementById("tablaProductosBody"); // <tbody>
const buscador         = document.getElementById("buscadorProductos");  // <input>
const filtroCategoria  = document.getElementById("filtroCategoria");   // <select>
const filtroSubcat     = document.getElementById("filtroSubcategoria");// <select>
const chkSoloSinStock  = document.getElementById("filtroSoloSinStock");// <input type="checkbox">
const btnNuevoProducto = document.getElementById("btnNuevoProducto");  // botón "Nuevo producto"
const lblUsuario       = document.getElementById("nombreUsuario");     // opcional
const btnLogout        = document.getElementById("btnLogout");         // botón salir (opcional)

let productos = []; // todos los productos traídos de Firestore

// ---------- Auth ----------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (lblUsuario) {
    lblUsuario.textContent = user.email || "Admin";
  }

  cargarProductos();
});

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

if (btnNuevoProducto) {
  btnNuevoProducto.addEventListener("click", () => {
    window.location.href = "editor.html"; // sin ?id → modo nuevo
  });
}

// ---------- Cargar productos ----------
async function cargarProductos() {
  if (!tbody) {
    console.error("No se encontró <tbody id='tablaProductosBody'>");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="texto-centro">Cargando productos...</td>
    </tr>
  `;

  try {
    const ref = collection(db, "productos");
    const q   = query(ref, orderBy("nombre"));
    const snap = await getDocs(q);

    productos = [];

    const categorias = new Set();
    const subcats    = new Set();

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      const codigo       = data.codigo || docSnap.id || "";
      const nombre       = data.nombre || data.Nombre || "";
      const categoria    = data.categoria || data.Categoria_Princ || "";
      const subcategoria = data.subcategoria || data.Sub_Categoria || "";
      const precio       = data.precio ?? data.PrecioMayorista ?? 0;
      const stock        = data.stock ?? data.Stock ?? 0;
      const imagen       = data.imagen || data.Imagen || "";
      const destacado    = !!data.destacado;

      productos.push({
        id: docSnap.id,
        codigo,
        nombre,
        categoria,
        subcategoria,
        precio,
        stock,
        imagen,
        destacado,
      });

      if (categoria)    categorias.add(categoria);
      if (subcategoria) subcats.add(subcategoria);
    });

    poblarFiltros(categorias, subcats);
    aplicarFiltros();

  } catch (err) {
    console.error("Error cargando productos:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">Error al cargar productos.</td>
      </tr>
    `;
  }
}

// ---------- Filtros ----------
function poblarFiltros(setCategorias, setSubcats) {
  if (filtroCategoria) {
    filtroCategoria.innerHTML = `<option value="">Todas</option>`;
    Array.from(setCategorias)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
      });
  }

  if (filtroSubcat) {
    filtroSubcat.innerHTML = `<option value="">Todas</option>`;
    Array.from(setSubcats)
      .sort()
      .forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        filtroSubcat.appendChild(opt);
      });
  }
}

function aplicarFiltros() {
  const texto = (buscador?.value || "").toLowerCase();
  const cat   = filtroCategoria?.value || "";
  const sub   = filtroSubcat?.value || "";
  const soloSinStock = !!(chkSoloSinStock?.checked);

  const filtrados = productos.filter((p) => {
    // búsqueda
    const matchTexto = (() => {
      if (!texto) return true;
      const codigo = (p.codigo || "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      const catP   = (p.categoria || "").toLowerCase();
      const subP   = (p.subcategoria || "").toLowerCase();
      return (
        codigo.includes(texto) ||
        nombre.includes(texto) ||
        catP.includes(texto) ||
        subP.includes(texto)
      );
    })();

    if (!matchTexto) return false;

    // filtros por categoría/sub
    if (cat && p.categoria !== cat) return false;
    if (sub && p.subcategoria !== sub) return false;

    // solo sin stock
    if (soloSinStock && (p.stock || 0) > 0) return false;

    return true;
  });

  mostrarProductos(filtrados);
}

// ---------- Render de tabla ----------
function crearBadgeStock(stock) {
  const span = document.createElement("span");
  const valor = Number.isFinite(stock) ? stock : 0;
  span.textContent = valor;

  span.classList.add("badge-stock");
  if (valor <= 0) {
    span.classList.add("stock-cero");
  } else if (valor <= 5) {
    span.classList.add("stock-bajo");
  } else {
    span.classList.add("stock-ok");
  }

  return span;
}

function crearThumbImagen(url) {
  const cont = document.createElement("div");
  cont.classList.add("thumb-contenedor");

  if (!url) {
    cont.textContent = "Sin imagen";
    cont.classList.add("thumb-vacio");
    return cont;
  }

  const img = document.createElement("img");
  img.src = url;
  img.alt = "Imagen producto";
  img.classList.add("thumb-img-admin");

  img.onerror = () => {
    cont.textContent = "No válida";
    cont.classList.add("thumb-error");
    img.remove();
  };

  cont.appendChild(img);
  return cont;
}

function mostrarProductos(lista) {
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">No se encontraron productos con esos filtros.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  lista.forEach((p) => {
    const tr = document.createElement("tr");
    if (p.stock <= 0) {
      tr.classList.add("fila-sin-stock");
    }

    // Código
    const tdCodigo = document.createElement("td");
    tdCodigo.textContent = p.codigo;

    // Nombre
    const tdNombre = document.createElement("td");
    tdNombre.textContent = p.nombre || "-";
    if (p.destacado) {
      const badge = document.createElement("span");
      badge.textContent = "★";
      badge.classList.add("badge-destacado");
      tdNombre.prepend(badge);
    }

    // Categoría / Subcategoría
    const tdCategoria = document.createElement("td");
    tdCategoria.textContent = p.categoria || "";

    const tdSubcat = document.createElement("td");
    tdSubcat.textContent = p.subcategoria || "";

    // Precio
    const tdPrecio = document.createElement("td");
    tdPrecio.textContent =
      p.precio != null ? `$ ${p.precio.toLocaleString("es-AR")}` : "-";

    // Stock con badge
    const tdStock = document.createElement("td");
    tdStock.appendChild(crearBadgeStock(p.stock));

    // Imagen
    const tdImg = document.createElement("td");
    tdImg.appendChild(crearThumbImagen(p.imagen));

    // Acciones
    const tdAcciones = document.createElement("td");
    tdAcciones.classList.add("col-acciones");

    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.classList.add("btn-accion", "btn-editar");
    btnEditar.addEventListener("click", () => {
      window.location.href = `editor.html?id=${p.codigo}`;
    });

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.classList.add("btn-accion", "btn-eliminar");
    btnEliminar.addEventListener("click", () => eliminarProducto(p.codigo, p.nombre));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);

    tr.appendChild(tdCodigo);
    tr.appendChild(tdNombre);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdSubcat);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdStock);
    tr.appendChild(tdImg);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });
}

// ---------- Eliminar ----------
async function eliminarProducto(codigo, nombre) {
  const ok = confirm(`¿Eliminar el producto "${nombre}" (${codigo})?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "productos", codigo));
    alert("Producto eliminado 👍");
    cargarProductos();
  } catch (err) {
    console.error("Error eliminando producto:", err);
    alert("Hubo un error al eliminar el producto. Revisá la consola.");
  }
}

// ---------- Eventos de filtros ----------
if (buscador) {
  buscador.addEventListener("input", () => {
    aplicarFiltros();
  });
}

if (filtroCategoria) {
  filtroCategoria.addEventListener("change", () => {
    aplicarFiltros();
  });
}

if (filtroSubcat) {
  filtroSubcat.addEventListener("change", () => {
    aplicarFiltros();
  });
}

if (chkSoloSinStock) {
  chkSoloSinStock.addEventListener("change", () => {
    aplicarFiltros();
  });
}
