// js/catalogo.js
// Catálogo dinámico desde Firestore + filtros + mega dropdown + mini carrito

import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// -------------------------
// DOM
// -------------------------
const grid = document.getElementById("catalogoGrid");
const buscador = document.getElementById("buscador");

// Mega dropdown
const megaDropdown = document.getElementById("megaDropdown");
const megaToggle = document.getElementById("categoriaToggle");
const megaMenu = document.getElementById("megaMenu");
const megaCategorias = document.getElementById("megaCategorias");
const megaSubcategorias = document.getElementById("megaSubcategorias");
const megaEtiquetas = document.getElementById("megaEtiquetas");
const megaResetBtn = document.getElementById("megaReset");
const megaLabel = megaToggle?.querySelector(".mega-label");

// Selects ocultos (por compatibilidad)
const selectCategoria = document.getElementById("filtro-categoria");
const selectSubcategoria = document.getElementById("filtro-subcategoria");

// Filtros extra
const chkSoloDestacados = document.getElementById("chkSoloDestacados");
const chkSoloConStock = document.getElementById("chkSoloConStock");

// Paginador
const btnPrev = document.getElementById("btn-pagina-anterior");
const btnNext = document.getElementById("btn-pagina-siguiente");
const contNumeros = document.getElementById("paginador-numeros");
const resumenResultados = document.getElementById("resumen-resultados");

// Mini carrito
const miniCarrito = document.getElementById("mini-carrito");
const miniCarritoCant = document.getElementById("mini-carrito-cantidad");
const miniCarritoTotal = document.getElementById("mini-carrito-total");

// -------------------------
// Estado
// -------------------------
let productos = []; // todos
let productosFiltrados = []; // luego de filtros
let categoriasSet = new Set();
let subcategoriasSet = new Set();
let etiquetasSet = new Set();

let categoriaSeleccionada = "";
let subcategoriaSeleccionada = "";
let etiquetaSeleccionada = "";

let paginaActual = 1;
function calcularItemsPorPagina() {
  return window.innerWidth >= 1200 ? 28 : 16;
}

let ITEMS_POR_PAGINA = calcularItemsPorPagina();

window.addEventListener("resize", () => {
  const nuevo = calcularItemsPorPagina();
  if (nuevo !== ITEMS_POR_PAGINA) {
    ITEMS_POR_PAGINA = nuevo;
    paginaActual = 1;
    renderizarPagina();
  }
});

// -------------------------
// Util carrito (localStorage)
// -------------------------
const CLAVE_CARRITO = "carrito"; // mantengo el nombre clásico

function leerCarrito() {
  try {
    const raw = localStorage.getItem(CLAVE_CARRITO);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    console.warn("Error leyendo carrito:", e);
    return [];
  }
}

function guardarCarrito(items) {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
  } catch (e) {
    console.warn("Error guardando carrito:", e);
  }
}

function agregarAlCarrito(producto, cantidad) {
  if (!producto || !producto.codigo) return;
  const cant = Math.max(1, Number(cantidad) || 1);

  const carrito = leerCarrito();
  const idx = carrito.findIndex((item) => item.codigo === producto.codigo);

  if (idx >= 0) {
    carrito[idx].cantidad = (carrito[idx].cantidad || 0) + cant;
  } else {
    carrito.push({
      codigo: producto.codigo,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      cantidad: cant,
    });
  }

  guardarCarrito(carrito);
  actualizarMiniCarrito();
}

function actualizarMiniCarrito() {
  const carrito = leerCarrito();
  const totalItems = carrito.reduce(
    (acc, item) => acc + (Number(item.cantidad) || 0),
    0
  );
  const totalMonto = carrito.reduce(
    (acc, item) =>
      acc + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
    0
  );

  if (miniCarritoCant) miniCarritoCant.textContent = totalItems;
  if (miniCarritoTotal)
    miniCarritoTotal.textContent = totalMonto.toLocaleString("es-AR");

  if (miniCarrito) {
    miniCarrito.style.display = totalItems > 0 ? "flex" : "none";
  }
}

// Exponer función global para el onClick del HTML
window.irAlCarrito = function () {
  window.location.href = "carrito.html";
};

// -------------------------
// Firestore - cargar productos
// -------------------------
async function cargarProductos() {
  if (!grid) return;

  grid.innerHTML =
    '<p class="texto-centro">Cargando productos del catálogo...</p>';

  try {
    const ref = collection(db, "productos");
    const q = query(ref, orderBy("nombre"));
    const snap = await getDocs(q);

    productos = [];
    categoriasSet = new Set();
    subcategoriasSet = new Set();
    etiquetasSet = new Set();

    snap.forEach((docSnap) => {
      const d = docSnap.data();

      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || "";
      const categoria = d.categoria || d.Categoria_Princ || "";
      const subcategoria = d.subcategoria || d.Sub_Categoria || "";
      const precio =
        d.precio != null
          ? Number(d.precio)
          : d.PrecioMayorista != null
          ? Number(d.PrecioMayorista)
          : 0;
      const stock =
        d.stock != null
          ? Number(d.stock)
          : d.Stock != null
          ? Number(d.Stock)
          : 0;
      const imagen = d.imagen || d.Imagen || "";
      const destacado = !!d.destacado;
      const descripcion =
        d.descripcionLarga || d.descripcion || d.Descripcion || "";

      let etiquetas = [];
      if (Array.isArray(d.etiquetas)) {
        etiquetas = d.etiquetas;
      } else if (typeof d.etiquetas === "string") {
        etiquetas = d.etiquetas
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

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
        descripcion,
        etiquetas,
      });

      if (categoria) categoriasSet.add(categoria);
      if (subcategoria) subcategoriasSet.add(subcategoria);
      etiquetas.forEach((tag) => etiquetasSet.add(tag));
    });

    construirMegaMenu();
    aplicarFiltros();
    actualizarMiniCarrito();
  } catch (error) {
    console.error("Error cargando productos desde Firestore:", error);
    grid.innerHTML =
      '<p class="texto-centro">Error al cargar el catálogo. Revisá la consola.</p>';
  }
}

// -------------------------
// Mega dropdown / filtros
// -------------------------

function construirMegaMenu() {
  if (selectCategoria) {
    selectCategoria.innerHTML = '<option value="">Todas</option>';
    Array.from(categoriasSet)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        selectCategoria.appendChild(opt);
      });
  }

  if (selectSubcategoria) {
    selectSubcategoria.innerHTML = '<option value="">Todas</option>';
    Array.from(subcategoriasSet)
      .sort()
      .forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        selectSubcategoria.appendChild(opt);
      });
  }

  if (megaCategorias) {
    megaCategorias.innerHTML = "";
    Array.from(categoriasSet)
      .sort()
      .forEach((cat) => {
        const li = document.createElement("li");
        li.classList.add("mega-item");
        li.dataset.value = cat;
        li.dataset.icon = "📦";
        li.textContent = cat;

        if (cat === categoriaSeleccionada) {
          li.classList.add("mega-item-activo");
        }

        li.addEventListener("click", () => {
          categoriaSeleccionada = categoriaSeleccionada === cat ? "" : cat;
          subcategoriaSeleccionada = "";
          etiquetaSeleccionada = "";
          actualizarMegaSeleccion();
          aplicarFiltros();
        });

        megaCategorias.appendChild(li);
      });
  }

  actualizarMegaSubcategorias();
  actualizarMegaEtiquetas();
  actualizarMegaLabel();
}

function actualizarMegaSubcategorias() {
  if (!megaSubcategorias) return;
  megaSubcategorias.innerHTML = "";

  const subcatsFiltradas = new Set();
  productos.forEach((p) => {
    if (categoriaSeleccionada && p.categoria !== categoriaSeleccionada) return;
    if (p.subcategoria) subcatsFiltradas.add(p.subcategoria);
  });

  const lista = subcatsFiltradas.size
    ? Array.from(subcatsFiltradas)
    : Array.from(subcategoriasSet);

  lista.sort().forEach((sub) => {
    const li = document.createElement("li");
    li.classList.add("mega-subitem");
    li.dataset.value = sub;
    li.textContent = sub;

    if (sub === subcategoriaSeleccionada) {
      li.classList.add("mega-subitem-activo");
    }

    li.addEventListener("click", () => {
      subcategoriaSeleccionada = subcategoriaSeleccionada === sub ? "" : sub;
      etiquetaSeleccionada = "";
      actualizarMegaSeleccion();
      aplicarFiltros();
    });

    megaSubcategorias.appendChild(li);
  });
}

function actualizarMegaEtiquetas() {
  if (!megaEtiquetas) return;
  megaEtiquetas.innerHTML = "";

  const tagsFiltrados = new Set();
  productos.forEach((p) => {
    if (categoriaSeleccionada && p.categoria !== categoriaSeleccionada) return;
    if (subcategoriaSeleccionada && p.subcategoria !== subcategoriaSeleccionada)
      return;
    (p.etiquetas || []).forEach((t) => tagsFiltrados.add(t));
  });

  const lista = tagsFiltrados.size
    ? Array.from(tagsFiltrados)
    : Array.from(etiquetasSet);

  lista
    .filter(Boolean)
    .sort()
    .forEach((tag) => {
      const li = document.createElement("li");
      li.classList.add("mega-tagitem");
      li.dataset.value = tag;
      li.textContent = tag;

      if (tag === etiquetaSeleccionada) {
        li.classList.add("mega-tagitem-activo");
      }

      li.addEventListener("click", () => {
        etiquetaSeleccionada = etiquetaSeleccionada === tag ? "" : tag;
        actualizarMegaSeleccion();
        aplicarFiltros();
      });

      megaEtiquetas.appendChild(li);
    });
}

function actualizarMegaLabel() {
  if (!megaLabel) return;

  if (!categoriaSeleccionada && !subcategoriaSeleccionada && !etiquetaSeleccionada) {
    megaLabel.textContent = "Todas las categorías";
    return;
  }

  const partes = [];
  if (categoriaSeleccionada) partes.push(categoriaSeleccionada);
  if (subcategoriaSeleccionada) partes.push(subcategoriaSeleccionada);
  if (etiquetaSeleccionada) partes.push(`#${etiquetaSeleccionada}`);

  megaLabel.textContent = partes.join(" · ");
}

function actualizarMegaSeleccion() {
  if (megaCategorias) {
    [...megaCategorias.querySelectorAll(".mega-item")].forEach((el) => {
      el.classList.toggle(
        "mega-item-activo",
        el.dataset.value === categoriaSeleccionada
      );
    });
  }

  actualizarMegaSubcategorias();
  actualizarMegaEtiquetas();
  actualizarMegaLabel();

  if (selectCategoria) selectCategoria.value = categoriaSeleccionada || "";
  if (selectSubcategoria) selectSubcategoria.value = subcategoriaSeleccionada || "";
}

function limpiarFiltros() {
  categoriaSeleccionada = "";
  subcategoriaSeleccionada = "";
  etiquetaSeleccionada = "";
  if (buscador) buscador.value = "";
  if (chkSoloConStock) chkSoloConStock.checked = false;
  if (chkSoloDestacados) chkSoloDestacados.checked = false;

  actualizarMegaSeleccion();
  aplicarFiltros();
}

// -------------------------
// Filtros + paginación
// -------------------------
function aplicarFiltros() {
  const texto = (buscador?.value || "").toLowerCase().trim();
  const soloDestacados = !!(chkSoloDestacados?.checked);
  const soloConStock = !!(chkSoloConStock?.checked);

  productosFiltrados = productos
    .filter((p) => {
      if (texto) {
        const hay = [p.codigo, p.nombre, p.descripcion, p.categoria, p.subcategoria]
          .join(" ")
          .toLowerCase()
          .includes(texto);
        if (!hay) return false;
      }

      if (categoriaSeleccionada && p.categoria !== categoriaSeleccionada) return false;
      if (subcategoriaSeleccionada && p.subcategoria !== subcategoriaSeleccionada) return false;

      if (etiquetaSeleccionada) {
        const tags = p.etiquetas || [];
        if (!tags.includes(etiquetaSeleccionada)) return false;
      }

      if (soloDestacados && !p.destacado) return false;
      if (soloConStock && (p.stock || 0) <= 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

  paginaActual = 1;
  renderizarPagina();
}

function renderizarPagina() {
  if (!grid) return;

  const total = productosFiltrados.length;

  if (!total) {
    grid.innerHTML =
      '<p class="texto-centro">No se encontraron productos con esos filtros.</p>';
    actualizarPaginador(0, 0, 0);
    return;
  }

  const totalPaginas = Math.ceil(total / ITEMS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;

  // ✅ FIX IMPORTANTE: que nunca se pase del total
  const fin = Math.min(inicio + ITEMS_POR_PAGINA, total);

  const pagina = productosFiltrados.slice(inicio, fin);

  grid.innerHTML = "";
  pagina.forEach((p) => grid.appendChild(crearCardProducto(p)));

  actualizarPaginador(paginaActual, totalPaginas, total);
}

function actualizarPaginador(pagina, totalPaginas, totalItems) {
  if (!btnPrev || !btnNext || !contNumeros) return;

  if (!totalPaginas) {
    btnPrev.disabled = true;
    btnNext.disabled = true;
    contNumeros.innerHTML = "";
    if (resumenResultados)
      resumenResultados.textContent = "Sin resultados para mostrar.";
    return;
  }

  btnPrev.disabled = pagina <= 1;
  btnNext.disabled = pagina >= totalPaginas;

  if (resumenResultados) {
    const desde = (pagina - 1) * ITEMS_POR_PAGINA + 1;
    const hasta = Math.min(pagina * ITEMS_POR_PAGINA, totalItems);
    resumenResultados.textContent = `Mostrando ${desde}–${hasta} de ${totalItems} productos`;
  }

  contNumeros.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    btn.classList.add("paginador-numero");
    if (i === pagina) btn.classList.add("paginador-numero--activo");
    btn.addEventListener("click", () => {
      paginaActual = i;
      renderizarPagina();
    });
    contNumeros.appendChild(btn);
  }
}

// -------------------------
// Render de card de producto
// -------------------------

function crearBadgeStock(stock) {
  const span = document.createElement("span");
  const valor = Number.isFinite(stock) ? stock : 0;
  span.textContent = valor;
  span.classList.add("badge-stock");

  if (valor <= 0) span.classList.add("stock-cero");
  else if (valor <= 5) span.classList.add("stock-bajo");
  else span.classList.add("stock-ok");

  return span;
}

function crearCardProducto(p) {
  const card = document.createElement("article");
  card.classList.add("producto-card");
  card.dataset.codigo = p.codigo;

  const imgWrap = document.createElement("div");
  imgWrap.classList.add("producto-imagen-wrapper");

  if (p.imagen) {
    const img = document.createElement("img");
    img.classList.add("producto-imagen");
    img.src = p.imagen;
    img.alt = p.nombre || "Producto";

    img.onerror = () => {
      img.remove();
      imgWrap.textContent = "Sin imagen";
      imgWrap.style.color = "#7777a7";
    };

    imgWrap.appendChild(img);
  } else {
    imgWrap.textContent = "Sin imagen";
    imgWrap.style.color = "#7777a7";
  }

  imgWrap.addEventListener("click", () => {
    window.location.href = "producto.html?codigo=" + encodeURIComponent(p.codigo);
  });

  const titulo = document.createElement("div");
  titulo.classList.add("producto-titulo");
  titulo.textContent = p.nombre || "";
  titulo.addEventListener("click", () => {
    window.location.href = "producto.html?codigo=" + encodeURIComponent(p.codigo);
  });

  const desc = document.createElement("div");
  desc.classList.add("producto-descripcion");
  desc.textContent = p.descripcion || "";

  const precioRow = document.createElement("div");
  precioRow.classList.add("producto-precio-row");

  const precioSpan = document.createElement("div");
  precioSpan.classList.add("producto-precio");
  precioSpan.textContent =
    p.precio != null ? `$ ${p.precio.toLocaleString("es-AR")}` : "-";
  precioRow.appendChild(precioSpan);

  const stockDiv = document.createElement("div");
  stockDiv.classList.add("producto-stock");
  stockDiv.textContent = "Stock: ";
  stockDiv.appendChild(crearBadgeStock(p.stock));

  const cantidadWrap = document.createElement("div");
  cantidadWrap.classList.add("cantidad-container");

  const btnMenos = document.createElement("button");
  btnMenos.type = "button";
  btnMenos.textContent = "−";
  btnMenos.classList.add("btn-cantidad");

  const inputCant = document.createElement("input");
  inputCant.type = "number";
  inputCant.min = "1";
  inputCant.value = "1";
  inputCant.classList.add("input-cantidad");

  const btnMas = document.createElement("button");
  btnMas.type = "button";
  btnMas.textContent = "+";
  btnMas.classList.add("btn-cantidad");

  cantidadWrap.appendChild(btnMenos);
  cantidadWrap.appendChild(inputCant);
  cantidadWrap.appendChild(btnMas);

  const btnAgregar = document.createElement("button");
  btnAgregar.type = "button";
  btnAgregar.classList.add("btn-agregar-carrito");
  btnAgregar.innerHTML = "Agregar <span>🛒</span>";

  btnAgregar.addEventListener("click", () => {
    const cantidad = Number(inputCant.value) || 1;

    const max = Number(p.stock) || 0;
    let cantFinal = cantidad;
    if (max > 0 && cantidad > max) {
      cantFinal = max;
      inputCant.value = String(max);
    }

    agregarAlCarrito(p, cantFinal);
    btnAgregar.classList.add("btn-agregar-carrito-activo");
    setTimeout(() => btnAgregar.classList.remove("btn-agregar-carrito-activo"), 600);
  });

  btnMenos.addEventListener("click", () => {
    let v = Number(inputCant.value) || 1;
    v = Math.max(1, v - 1);
    inputCant.value = String(v);
  });

  btnMas.addEventListener("click", () => {
    let v = Number(inputCant.value) || 1;
    v += 1;
    if (Number(p.stock) > 0) v = Math.min(v, Number(p.stock));
    inputCant.value = String(v);
  });

  card.appendChild(imgWrap);
  card.appendChild(titulo);
  card.appendChild(desc);
  card.appendChild(precioRow);
  card.appendChild(stockDiv);
  card.appendChild(cantidadWrap);
  card.appendChild(btnAgregar);

  if (p.destacado) {
    const chip = document.createElement("span");
    chip.classList.add("chip-destacado");
    chip.textContent = "Destacado";
    precioRow.appendChild(chip);
  }

  return card;
}

// -------------------------
// Eventos generales
// -------------------------
if (buscador) buscador.addEventListener("input", aplicarFiltros);
if (chkSoloDestacados) chkSoloDestacados.addEventListener("change", aplicarFiltros);
if (chkSoloConStock) chkSoloConStock.addEventListener("change", aplicarFiltros);

if (megaToggle && megaDropdown) {
  megaToggle.addEventListener("click", () => {
    megaDropdown.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!megaDropdown.contains(e.target)) megaDropdown.classList.remove("open");
  });
}

if (megaResetBtn) {
  megaResetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    limpiarFiltros();
  });
}

if (btnPrev) {
  btnPrev.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderizarPagina();
    }
  });
}

if (btnNext) {
  btnNext.addEventListener("click", () => {
    const totalPaginas = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA);
    if (paginaActual < totalPaginas) {
      paginaActual++;
      renderizarPagina();
    }
  });
}

// -------------------------
// Inicio
// -------------------------
cargarProductos();
