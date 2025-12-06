// ========================================
// CATÁLOGO + CARRITO (página catalogo.html)
// ========================================

// URL base de las imágenes en tu repo de GitHub
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

// Clave del carrito en localStorage (misma que usa carrito.html)
const CLAVE_CARRITO = "dm_carrito";

// Elementos del DOM
const grid = document.getElementById("lista-productos");      // contenedor de tarjetas
const buscador = document.getElementById("buscador");         // input de búsqueda
const filtroCategoria = document.getElementById("filtro-categoria"); // select de categorías

// Mini carrito (globito abajo a la derecha)
const miniCantidad = document.getElementById("mini-carrito-cantidad");
const miniTotal = document.getElementById("mini-carrito-total");

let TODOS_LOS_PRODUCTOS = [];

// ========================================
// UTILIDADES GENERALES
// ========================================

function safe(value, fallback = "") {
  return (value === undefined || value === null) ? fallback : value;
}

// "19.585,8" -> 19585.8 / "1992,2" -> 1992.2
function parsearPrecio(valor) {
  if (typeof valor === "number") return valor;

  if (typeof valor === "string") {
    const limpio = valor
      .toString()
      .replace(/\./g, "")   // separador miles
      .replace(",", ".");   // coma a punto

    const num = Number(limpio);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

// texto redondeado SIN decimales (como te gustaba antes)
function formatearPrecio(valor) {
  const numero = parsearPrecio(valor);
  if (numero == null) return "Consultar";

  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Intenta .jpg y .JPG y guarda la URL correcta en data-src-ok
function setImagenProducto(imgElement, codigo) {
  if (!imgElement || !codigo) {
    if (imgElement) imgElement.style.display = "none";
    return;
  }

  const urls = [
    `${BASE_IMG}/${codigo}.jpg`,
    `${BASE_IMG}/${codigo}.JPG`,
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

  imgElement.onload = () => {
    imgElement.dataset.srcOk = imgElement.src;
  };

  imgElement.onerror = probar;

  probar();
}

// ========================================
// CARRITO (localStorage + mini carrito)
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

// Actualiza el globito del mini carrito
function actualizarMiniCarrito() {
  const carrito = leerCarrito();

  const totalProductos = carrito.reduce(
    (acc, p) => acc + (p.cantidad || 0),
    0
  );

  const totalPrecio = carrito.reduce((acc, p) => {
    const precio = Number(p.precio) || 0;
    return acc + precio * (p.cantidad || 0);
  }, 0);

  if (miniCantidad) miniCantidad.textContent = totalProductos;
  if (miniTotal) {
    miniTotal.textContent = totalPrecio.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}

// Agrega un producto al carrito desde el catálogo
function agregarAlCarritoDesdeCatalogo(productoBasico, boton) {
  let carrito = leerCarrito();

  const idx = carrito.findIndex(p => p.codigo === productoBasico.codigo);

  if (idx >= 0) {
    const item = carrito[idx];
    const stock = Number(item.stock ?? productoBasico.stock ?? 0) || 0;

    if (!stock || item.cantidad < stock) {
      item.cantidad += 1;
    } else {
      alert("No hay más stock disponible de este producto.");
      return;
    }

  } else {
    carrito.push({
      codigo: productoBasico.codigo,
      nombre: productoBasico.nombre,
      precio: productoBasico.precio,
      cantidad: 1,
      img: productoBasico.img || null,
      stock: productoBasico.stock ?? null,
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
// RENDER DE PRODUCTOS
// ========================================

function renderProductos(lista) {
  grid.innerHTML = "";

  if (!lista || lista.length === 0) {
    grid.innerHTML = `<p>No se encontraron productos.</p>`;
    return;
  }

  const carritoActual = leerCarrito();

  lista.forEach(prod => {
    const codigo = safe(
      prod.codigo || prod.cod || prod.Code || prod.Codigo
    );
    const nombreBase = safe(
      prod.nombre ||
      prod.descripcion ||
      prod.titulo ||
      prod["Nombre Corto"],
      "Sin nombre"
    );
    // Como antes: "N0247 - LLAVERO ..."
    const nombre = `${codigo} - ${nombreBase}`;

    const categoria = safe(
      prod.categoria ||
      prod.rubro ||
      prod.cat ||
      prod["Categoria Princ"],
      "Sin categoría"
    );
    const descCorta = safe(
      prod.descripcionCorta ||
      prod.descripcion_corta ||
      prod.descripcion ||
      prod["Descripción Larga"] ||
      "",
      ""
    );

    const brutoPrecio =
      prod.precio ??
      prod.precioMayorista ??
      prod.precio_venta ??
      prod.precioLista ??
      prod["Precio Mayorista"] ??
      prod["Precio Cliente"];

    const precioNum = parsearPrecio(brutoPrecio) || 0;
    const precioTexto = formatearPrecio(brutoPrecio);

    const card = document.createElement("article");
    card.classList.add("producto-card");

    const itemCarrito = carritoActual.find(p => p.codigo === codigo);
    const textoBoton = itemCarrito
      ? `En carrito (${itemCarrito.cantidad})`
      : "Agregar al carrito";

    // 👉 ESTRUCTURA COMO LA QUE TENÍAS ANTES
    card.innerHTML = `
      <div class="producto-img-wrapper">
        <img class="producto-imagen" alt="${nombreBase}">
      </div>

      <div class="producto-info">
        <h3 class="producto-titulo">${nombre}</h3>
        <p class="producto-descripcion">${descCorta}</p>
        <p class="producto-categoria">${categoria}</p>

        <div class="producto-precio-row">
          <span class="producto-precio">$ ${precioTexto}</span>
        </div>

        <button class="btn-agregar-carrito">
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

    // CLICK EN CARD → ir a detalle (imagen + texto)
    card.addEventListener("click", ev => {
      // si el click viene del botón, NO navegar
      if (ev.target.closest(".btn-agregar-carrito")) return;
      window.location.href = `producto.html?codigo=${encodeURIComponent(codigo)}`;
    });

    // CLICK en Agregar al carrito
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation(); // para que no dispare el click de la card

      const productoBasico = {
        codigo,
        nombre: nombreBase,
        precio: precioNum,
        img: (img && (img.dataset.srcOk || img.src)) || null,
        stock: safe(prod.Stock ?? prod.stock, null),
      };

      agregarAlCarritoDesdeCatalogo(productoBasico, btn);
    });

    grid.appendChild(card);
  });
}

// ========================================
// FILTROS
// ========================================

function aplicarFiltros() {
  const texto = buscador.value.trim().toLowerCase();
  const cat = filtroCategoria.value;

  const filtrados = TODOS_LOS_PRODUCTOS.filter(prod => {
    const codigo = safe(
      prod.codigo || prod.cod || prod.Code || prod.Codigo,
      ""
    )
      .toString()
      .toLowerCase();

    const nombre = safe(
      prod.nombre || prod.descripcion || prod.titulo || prod["Nombre Corto"],
      ""
    ).toLowerCase();

    const categoria = safe(
      prod.categoria || prod.rubro || prod.cat || prod["Categoria Princ"],
      ""
    ).toLowerCase();

    const pasaTexto =
      !texto || codigo.includes(texto) || nombre.includes(texto);

    const pasaCategoria =
      !cat || cat === "todas" || categoria === cat.toLowerCase();

    return pasaTexto && pasaCategoria;
  });

  renderProductos(filtrados);
}

if (buscador) buscador.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);

// ========================================
// CARGA INICIAL
// ========================================

async function cargarProductos() {
  try {
    const resp = await fetch("./productos.json");
    if (!resp.ok) throw new Error("No se pudo cargar productos.json");

    const data = await resp.json();
    TODOS_LOS_PRODUCTOS = Array.isArray(data)
      ? data
      : (data.productos || []);

    // llenar combo de categorías
    if (filtroCategoria) {
      const categoriasUnicas = Array.from(
        new Set(
          TODOS_LOS_PRODUCTOS.map(p =>
            safe(
              p.categoria || p.rubro || p.cat || p["Categoria Princ"],
              ""
            ).toString()
          ).filter(c => c !== "")
        )
      ).sort();

      if (!filtroCategoria.querySelector("option[value='todas']")) {
        const optTodas = document.createElement("option");
        optTodas.value = "todas";
        optTodas.textContent = "Todas las categorías";
        filtroCategoria.appendChild(optTodas);
      }

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
    grid.innerHTML = `<p>Error cargando productos.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarMiniCarrito();
});
