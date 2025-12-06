// ========================================
//  CATÁLOGO + CARRITO (página catalogo.html)
// ========================================

// URL base de las imágenes en tu repo de GitHub
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

// Clave del carrito en localStorage
const CLAVE_CARRITO = "dm_carrito";

// Elementos del DOM
const grid = document.getElementById("lista-productos");      // contenedor de tarjetas
const buscador = document.getElementById("buscador");         // input de búsqueda
const filtroCategoria = document.getElementById("filtro-categoria"); // select de categorías

// Mini carrito (globito abajo a la derecha)
const miniCantidad = document.getElementById("mini-carrito-cantidad");
const miniTotal    = document.getElementById("mini-carrito-total");

let TODOS_LOS_PRODUCTOS = [];

// ========================================
//  UTILIDADES GENERALES
// ========================================

function safe(value, fallback = "") {
  return (value === undefined || value === null) ? fallback : value;
}

function setImagenProducto(imgElement, codigo) {
  if (!codigo) {
    imgElement.style.display = "none";
    return;
  }

  const urls = [
    `${BASE_IMG}/${codigo}.jpg`,
    `${BASE_IMG}/${codigo}.JPG`
  ];

  let intento = 0;

  const probar = () => {
    if (intento >= urls.length) {
      imgElement.style.display = "none";
      return;
    }
    imgElement.src = urls[intento];
    intento++;
  };

  imgElement.onerror = probar;
  probar();
}

function formatearPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return "Consultar";
  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: 0
  });
}

// ========================================
//  CARRITO (localStorage + mini carrito)
// ========================================

function leerCarrito() {
  try {
    const raw = localStorage.getItem(CLAVE_CARRITO);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("Error leyendo carrito", e);
    return [];
  }
}

function guardarCarrito(carrito) {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch (e) {
    console.error("Error guardando carrito", e);
  }
}

function actualizarMiniCarrito() {
  const carrito = leerCarrito();

  const totalProductos = carrito.reduce((acc, p) => acc + (p.cantidad || 0), 0);
  const totalPrecio = carrito.reduce((acc, p) => {
    const precio = Number(p.precio) || 0;
    return acc + precio * (p.cantidad || 0);
  }, 0);

  if (miniCantidad) miniCantidad.textContent = totalProductos;
  if (miniTotal)
    miniTotal.textContent = totalPrecio.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
}

function agregarAlCarritoDesdeCatalogo(productoBasico, boton) {
  let carrito = leerCarrito();

  const idx = carrito.findIndex(p => p.codigo === productoBasico.codigo);
  if (idx >= 0) {
    carrito[idx].cantidad += 1;
  } else {
    carrito.push({
      codigo: productoBasico.codigo,
      nombre: productoBasico.nombre,
      precio: productoBasico.precio,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
  actualizarMiniCarrito();

  const item = carrito.find(p => p.codigo === productoBasico.codigo);
  if (boton && item) {
    boton.textContent = `En carrito (${item.cantidad})`;
    boton.classList.add("btn-agregar-carrito-activo");
  }
}

function irAlCarrito() {
  window.location.href = "carrito.html";
}

// ========================================
//  RENDER
// ========================================

function renderProductos(lista) {
  grid.innerHTML = "";

  if (!lista || lista.length === 0) {
    grid.innerHTML = `<p style="color:white; padding:1rem;">No se encontraron productos.</p>`;
    return;
  }

  const carritoActual = leerCarrito();

  lista.forEach(prod => {
    const codigo      = safe(prod.codigo || prod.cod || prod.Code || prod.Codigo);
    const nombre      = safe(prod.nombre || prod.descripcion || prod.titulo || prod["Nombre Corto"], "Sin nombre");
    const categoria   = safe(prod.categoria || prod.rubro || prod.cat || prod["Categoria Princ"], "Sin categoría");
    const descCorta   = safe(
      prod.descripcionCorta ||
      prod.descripcion_corta ||
      prod.descripcion ||
      prod["Descripción Larga"] ||
      "",
      ""
    );
    const precioNum   = prod.precio ?? prod.precioMayorista ?? prod.precio_venta ?? prod.precioLista ?? prod["Precio Mayorista"];
    const precioTexto = formatearPrecio(precioNum);

    const card = document.createElement("article");
    card.classList.add("producto-card");

    const itemCarrito = carritoActual.find(p => p.codigo === codigo);
    const textoBoton  = itemCarrito ? `En carrito (${itemCarrito.cantidad})` : "Agregar al carrito";

    card.innerHTML = `
      <a class="producto-link" href="producto.html?codigo=${encodeURIComponent(codigo)}">
        <div class="producto-imagen-wrapper">
          <img class="producto-imagen" alt="${codigo} - ${nombre}">
          <span class="sin-imagen-texto">Sin imagen</span>
        </div>
        <div class="producto-info">
          <h3 class="producto-titulo">${codigo} - ${nombre}</h3>
          <p class="producto-descripcion">${descCorta}</p>
          <p class="producto-categoria">${categoria}</p>
          <p class="producto-precio">$ ${precioTexto}</p>
        </div>
      </a>

      <div class="producto-acciones">
        <button type="button" class="btn-agregar-carrito">
          ${textoBoton}
        </button>
      </div>
    `;

    const img = card.querySelector(".producto-imagen");
    setImagenProducto(img, codigo);

    const btn = card.querySelector(".btn-agregar-carrito");

    if (itemCarrito) {
      btn.classList.add("btn-agregar-carrito-activo");
    }

    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();

      const productoBasico = {
        codigo,
        nombre,
        precio: Number(precioNum) || 0
      };

      agregarAlCarritoDesdeCatalogo(productoBasico, btn);
    });

    grid.appendChild(card);
  });
}

// ========================================
//  FILTROS
// ========================================

function aplicarFiltros() {
  const texto = buscador.value.trim().toLowerCase();
  const cat = filtroCategoria.value;

  const filtrados = TODOS_LOS_PRODUCTOS.filter(prod => {
    const codigo    = safe(prod.codigo || prod.cod || prod.Code || prod.Codigo, "").toString().toLowerCase();
    const nombre    = safe(prod.nombre || prod.descripcion || prod.titulo || prod["Nombre Corto"], "").toLowerCase();
    const categoria = safe(prod.categoria || prod.rubro || prod.cat || prod["Categoria Princ"], "").toLowerCase();

    const pasaTexto =
      !texto ||
      codigo.includes(texto) ||
      nombre.includes(texto);

    const pasaCategoria =
      !cat || cat === "todas" || categoria === cat.toLowerCase();

    return pasaTexto && pasaCategoria;
  });

  renderProductos(filtrados);
}

if (buscador) buscador.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);

// ========================================
//  CARGA INICIAL
// ========================================

async function cargarProductos() {
  try {
    const resp = await fetch("./productos.json");

    if (!resp.ok) throw new Error("No se pudo cargar productos.json");

    const data = await resp.json();
    TODOS_LOS_PRODUCTOS = Array.isArray(data) ? data : (data.productos || []);

    if (filtroCategoria) {
      const categoriasUnicas = Array.from(
        new Set(
          TODOS_LOS_PRODUCTOS.map(p =>
            safe(p.categoria || p.rubro || p.cat || p["Categoria Princ"], "").toString()
          ).filter(c => c !== "")
        )
      ).sort();

      categoriasUnicas.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat.toLowerCase();
        op.textContent = cat;
        filtroCategoria.appendChild(op);
      });
    }

    renderProductos(TODOS_LOS_PRODUCTOS);
    actualizarMiniCarrito();

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:white; padding:1rem;">Error cargando productos.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarMiniCarrito();
});
