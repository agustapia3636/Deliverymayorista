// ========================================
// CATÁLOGO + CARRITO (página catalogo.html)
// Mega menú categorías tipo "Telefonía"
// con 3er nivel de ETIQUETAS libres + iconos
// + memoria de filtros en localStorage
// + botón premium "Limpiar filtros"
// + PAGINACIÓN PREMIUM
// + DATOS DESDE FIRESTORE (sin productos.json)
// ========================================

// ===== FIREBASE (MODULAR) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ⚠️ PEGÁ ACÁ EL MISMO CONFIG QUE USAS EN login.js / admin.js
const firebaseConfig = {
  // apiKey: "TU_API_KEY",
  // authDomain: "TU_AUTH_DOMAIN",
  // projectId: "TU_PROJECT_ID",
  // storageBucket: "TU_BUCKET",
  // messagingSenderId: "TU_SENDER_ID",
  // appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ========================================

const BASE_IMG     = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";
const CLAVE_CARRITO = "dm_carrito";

// ===== DOM PRINCIPAL =====
const grid               = document.getElementById("lista-productos");
const buscador           = document.getElementById("buscador");
const filtroCategoria    = document.getElementById("filtro-categoria");     // select oculto
const filtroSubcategoria = document.getElementById("filtro-subcategoria");  // select oculto

// Mega menú
const megaDropdown = document.getElementById("megaDropdown");
const megaToggle   = document.getElementById("categoriaToggle");
const megaMenu     = document.getElementById("megaMenu");
const megaCatList  = document.getElementById("megaCategorias");
const megaSubList  = document.getElementById("megaSubcategorias");
const megaTagList  = document.getElementById("megaEtiquetas");
const megaSubTitle = document.getElementById("megaSubTitle");
const megaTagTitle = document.getElementById("megaTagTitle");
const megaResetBtn = document.getElementById("megaReset");

const miniCantidad = document.getElementById("mini-carrito-cantidad");
const miniTotal    = document.getElementById("mini-carrito-total");

// Paginación
const resumenResultados   = document.getElementById("resumen-resultados");
const btnPaginaAnterior   = document.getElementById("btn-pagina-anterior");
const btnPaginaSiguiente  = document.getElementById("btn-pagina-siguiente");
const contenedorNumeros   = document.getElementById("paginador-numeros");
const contenedorPaginador = document.querySelector(".paginador-contenedor");

const ITEMS_POR_PAGINA = 24;
let paginaActual = 1;
let ultimoTotalFiltrado = 0;

// mapa categoría → subcategorías
let MAPA_CAT_SUB   = {};
let MAPA_CAT_LABEL = {};

// mapa etiquetas: catKey -> subKey -> Set(etiquetas)
let MAPA_TAGS = {};

let TODOS_LOS_PRODUCTOS = [];

let categoriaSeleccionada    = "todas";
let subcategoriaSeleccionada = "todas";
let etiquetaSeleccionada     = "todas";

let labelCategoriaActual    = "Todas las categorías";
let labelSubcategoriaActual = null;
let labelEtiquetaActual     = null;

// ========================
// GUARDAR / LEER FILTROS
// ========================

const CLAVE_FILTROS = "dm_filtros";

function guardarFiltrosActuales() {
  const data = {
    categoria:    categoriaSeleccionada || "todas",
    subcategoria: subcategoriaSeleccionada || "todas",
    etiqueta:     etiquetaSeleccionada || "todas",
    pagina:       paginaActual || 1,
    busqueda:     buscador ? buscador.value.trim().toLowerCase() : ""
  };
  try {
    localStorage.setItem(CLAVE_FILTROS, JSON.stringify(data));
  } catch (e) {
    console.error("Error guardando filtros", e);
  }
}

function leerFiltrosGuardados() {
  try {
    const raw = localStorage.getItem(CLAVE_FILTROS);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data;
  } catch (e) {
    console.error("Error leyendo filtros", e);
    return null;
  }
}

// ========= UTILIDADES =========

function safe(value, fallback = "") {
  return (value === undefined || value === null) ? fallback : value;
}

function parsearPrecio(valor) {
  if (typeof valor === "number") return valor;

  if (typeof valor === "string") {
    const limpio = valor
      .toString()
      .replace(/\./g, "")
      .replace(",", ".");
    const num = Number(limpio);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function formatearPrecio(valor) {
  const numero = parsearPrecio(valor);
  if (numero == null) return "Consultar";

  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizarEtiquetasCampo(campo) {
  if (!campo) return [];
  if (Array.isArray(campo)) {
    return campo
      .map(t => t && t.toString().trim())
      .filter(t => t)
      .map(t => t.toLowerCase());
  }
  const comoStr = campo.toString();
  return comoStr
    .split(",")
    .map(t => t && t.trim())
    .filter(t => t)
    .map(t => t.toLowerCase());
}

// 🔄 Ahora puede usar URL directa de Firestore (campo "imagen")
// y si no existe, cae al patrón BASE_IMG/codigo.jpg
function setImagenProducto(imgElement, codigo, urlDirecta) {
  if (!imgElement) return;

  const fallbackPorCodigo = () => {
    if (!codigo) {
      imgElement.style.display = "none";
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
  };

  if (urlDirecta) {
    imgElement.onload = () => {
      imgElement.dataset.srcOk = imgElement.src;
    };
    imgElement.onerror = () => {
      // si falla la URL de Firestore, probamos por código
      fallbackPorCodigo();
    };
    imgElement.src = urlDirecta;
    return;
  }

  // Si no hay urlDirecta, vamos directo al fallback por código
  fallbackPorCodigo();
}

// ========= CARRITO =========

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

function agregarAlCarritoDesdeCatalogo(productoBasico, boton, cantidadElegida, stockDisponible) {
  let carrito = leerCarrito();
  const idx = carrito.findIndex(p => p.codigo === productoBasico.codigo);
  let cantidad = Number(cantidadElegida) || 1;

  if (idx >= 0) {
    const item = carrito[idx];
    if (stockDisponible && item.cantidad + cantidad > stockDisponible) {
      alert("No hay más stock disponible de este producto.");
      return;
    }
    item.cantidad += cantidad;
  } else {
    if (stockDisponible && cantidad > stockDisponible) cantidad = stockDisponible;
    carrito.push({
      codigo:  productoBasico.codigo,
      nombre:  productoBasico.nombre,
      precio:  productoBasico.precio,
      cantidad,
      img:     productoBasico.img || null,
      stock:   stockDisponible,
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

// ========= RENDER PRODUCTOS =========

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

    const titulo = `${codigo} - ${nombreBase}`;

    const descLarga = safe(
      prod.descripcionLarga ||
      prod.descripcion_larga ||
      prod["descripcionLarga"] ||
      prod["descripcion_larga"] ||
      prod["Descripción Larga"] ||
      prod.descripcionCorta ||
      prod.descripcion_corta ||
      prod.descripcion ||
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

    const precioNum   = parsearPrecio(brutoPrecio) || 0;
    const precioTexto = formatearPrecio(brutoPrecio);

    const stockBruto = safe(prod.Stock ?? prod.stock, "");
    const stockNum   = Number(stockBruto) || 0;
    const stockTexto = stockNum
      ? `Stock: ${stockNum} unidades`
      : (stockBruto ? `Stock: ${stockBruto}` : "");

    const card = document.createElement("article");
    card.classList.add("producto-card");

    const itemCarrito = carritoActual.find(p => p.codigo === codigo);
    const textoBoton = itemCarrito
      ? `En carrito (${itemCarrito.cantidad})`
      : "Agregar al carrito";

    card.innerHTML = `
      <div class="producto-imagen-wrapper">
        <img class="producto-imagen" alt="${nombreBase}">
      </div>

      <div class="producto-info">
        <h3 class="producto-titulo">${titulo}</h3>
        <p class="producto-descripcion">${descLarga}</p>

        <div class="producto-precio-row">
          <span class="producto-precio">$ ${precioTexto}</span>
        </div>

        ${stockTexto ? `<p class="producto-stock stock-text">${stockTexto}</p>` : ""}

        <div class="cantidad-container">
          <button class="btn-cantidad menos">−</button>
          <input type="number" class="input-cantidad">
          <button class="btn-cantidad mas">+</button>
        </div>

        <button class="btn-agregar-carrito">
          ${textoBoton}
        </button>
      </div>
    `;

    const img = card.querySelector(".producto-imagen");
    // usamos imagen directa de Firestore si existe, sino BASE_IMG/codigo
    setImagenProducto(img, codigo, prod.imagen);

    const btn = card.querySelector(".btn-agregar-carrito");
    if (itemCarrito) {
      btn.classList.add("btn-agregar-carrito-activo");
    }

    const input        = card.querySelector(".input-cantidad");
    const stockVisible = card.querySelector(".stock-text");
    const stockInicial = stockNum || 0;

    function obtenerCantidadSegura() {
      let cant = parseInt(input.value, 10);
      if (!Number.isFinite(cant) || cant < 1) cant = 1;
      if (stockInicial > 0 && cant > stockInicial) cant = stockInicial;
      return cant;
    }

    function actualizarStockVisible() {
      if (!stockVisible || stockInicial <= 0) return;

      const raw = input.value;
      if (raw === "" || raw == null) {
        stockVisible.textContent = `Stock: ${stockInicial} unidades`;
        return;
      }

      let cant = parseInt(raw, 10);
      if (!Number.isFinite(cant) || cant < 1) cant = 1;
      if (stockInicial > 0 && cant > stockInicial) cant = stockInicial;

      let restante = stockInicial - cant;
      if (restante < 0) restante = 0;

      stockVisible.textContent = `Stock: ${restante} unidades`;
    }

    const btnMas   = card.querySelector(".btn-cantidad.mas");
    const btnMenos = card.querySelector(".btn-cantidad.menos");

    if (btnMas) {
      btnMas.addEventListener("click", (ev) => {
        ev.stopPropagation();
        let v = parseInt(input.value, 10);
        if (!Number.isFinite(v) || v < 1) v = 1;
        else v += 1;
        if (stockInicial > 0 && v > stockInicial) v = stockInicial;
        input.value = String(v);
        actualizarStockVisible();
      });
    }

    if (btnMenos) {
      btnMenos.addEventListener("click", (ev) => {
        ev.stopPropagation();
        let v = parseInt(input.value, 10);
        if (!Number.isFinite(v) || v <= 1) v = 1;
        else v -= 1;
        input.value = String(v);
        actualizarStockVisible();
      });
    }

    if (input) {
      const handleTyping = (ev) => {
        ev.stopPropagation();
        ev.target.value = ev.target.value.replace(/\D/g, "");
        actualizarStockVisible();
      };
      ["input", "keyup", "change"].forEach(evt =>
        input.addEventListener(evt, handleTyping)
      );
      input.addEventListener("blur", (ev) => {
        ev.stopPropagation();
        const cant = obtenerCantidadSegura();
        input.value = String(cant);
        actualizarStockVisible();
      });
    }

    if (stockVisible && stockInicial > 0) {
      stockVisible.textContent = `Stock: ${stockInicial} unidades`;
    }

    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();

      const cant = obtenerCantidadSegura();
      input.value = String(cant);
      actualizarStockVisible();

      const productoBasico = {
        codigo,
        nombre: nombreBase,
        precio: precioNum,
        img: (img && (img.dataset.srcOk || img.src)) || null
      };

      const stockParaCarrito = stockInicial || 9999;
      agregarAlCarritoDesdeCatalogo(productoBasico, btn, cant, stockParaCarrito);
    });

    const tituloEl = card.querySelector(".producto-titulo");
    const imgEl    = card.querySelector(".producto-imagen");

    function irADetalle(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.location.href = `producto.html?codigo=${encodeURIComponent(codigo)}`;
    }

    if (tituloEl) tituloEl.addEventListener("click", irADetalle);
    if (imgEl)    imgEl.addEventListener("click", irADetalle);

    grid.appendChild(card);
  });
}

// ========= FILTROS (BUSCADOR + CAT + SUBCAT + TAG) =========

function aplicarFiltros() {
  const texto = buscador ? buscador.value.trim().toLowerCase() : "";
  const cat   = filtroCategoria ? filtroCategoria.value : "";
  const sub   = filtroSubcategoria ? filtroSubcategoria.value : "";
  const tag   = etiquetaSeleccionada || "todas";

  const filtrados = TODOS_LOS_PRODUCTOS.filter(prod => {
    const codigo = safe(
      prod.codigo || prod.cod || prod.Code || prod.Codigo,
      ""
    ).toString().toLowerCase();

    const nombre = safe(
      prod.nombre || prod.descripcion || prod.titulo || prod["Nombre Corto"],
      ""
    ).toLowerCase();

    const categoria = safe(
      prod.categoria ||
      prod.rubro ||
      prod.cat ||
      prod["Categoria Princ"] ||
      prod["Categoria_Princ"],
      ""
    ).toLowerCase();

    const subcategoria = safe(
      prod.subcategoria ||
      prod.Subcategoria ||
      prod.Sub_Categoria ||
      prod["Sub_Categoria"] ||
      prod["Subcategoria"],
      ""
    ).toLowerCase();

    const etiquetasRaw =
      prod.etiquetas ||
      prod.tags ||
      prod.tag ||
      prod["Etiquetas"] ||
      prod["etiquetas"];

    const etiquetasNormalizadas = normalizarEtiquetasCampo(etiquetasRaw);

    const pasaTexto =
      !texto || codigo.includes(texto) || nombre.includes(texto);

    const pasaCategoria =
      !cat || cat === "todas" || categoria === cat.toLowerCase();

    const pasaSubcategoria =
      !sub || sub === "todas" || subcategoria === sub.toLowerCase();

    const pasaEtiqueta =
      !tag || tag === "todas" || etiquetasNormalizadas.includes(tag.toLowerCase());

    return pasaTexto && pasaCategoria && pasaSubcategoria && pasaEtiqueta;
  });

  renderConPaginador(filtrados);
}

// ========= PAGINACIÓN PREMIUM =========

function renderConPaginador(listaFiltrada) {
  ultimoTotalFiltrado = listaFiltrada.length;

  let totalPaginas = Math.max(
    1,
    Math.ceil(ultimoTotalFiltrado / ITEMS_POR_PAGINA)
  );

  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin    = inicio + ITEMS_POR_PAGINA;

  const paginaLista = listaFiltrada.slice(inicio, fin);

  // Render de tarjetas
  renderProductos(paginaLista);

  // Resumen
  if (resumenResultados) {
    if (ultimoTotalFiltrado === 0) {
      resumenResultados.textContent = "0 productos encontrados";
    } else {
      const desde = inicio + 1;
      const hasta = inicio + paginaLista.length;
      resumenResultados.textContent = `Mostrando ${desde}-${hasta} de ${ultimoTotalFiltrado} productos`;
    }
  }

  // Configuración visual del contenedor del paginador (sticky + ocultar si 1 sola página)
  if (contenedorPaginador) {
    if (totalPaginas <= 1) {
      contenedorPaginador.style.display = "none";
    } else {
      contenedorPaginador.style.display   = "flex";
      contenedorPaginador.style.position  = "sticky";
      contenedorPaginador.style.bottom    = "0";
      contenedorPaginador.style.zIndex    = "40";
      contenedorPaginador.style.background = "#0f0f1a";
    }
  }

  if (!contenedorNumeros) return;

  // Animación suave
  contenedorNumeros.style.transition = "opacity 0.15s ease, transform 0.15s ease";
  contenedorNumeros.style.opacity    = "0";
  contenedorNumeros.style.transform  = "translateY(4px)";

  contenedorNumeros.innerHTML = "";

  // Si no hay más de una página, terminamos acá
  if (totalPaginas <= 1) {
    if (btnPaginaAnterior) btnPaginaAnterior.disabled = true;
    if (btnPaginaSiguiente) btnPaginaSiguiente.disabled = true;
    requestAnimationFrame(() => {
      contenedorNumeros.style.opacity   = "1";
      contenedorNumeros.style.transform = "translateY(0)";
    });
    return;
  }

  // Helper para crear botón numerado
  function crearBotonPagina(num) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "paginador-numero";
    if (num === paginaActual) {
      btn.classList.add("paginador-numero--activo");
    }
    btn.textContent = num;
    btn.addEventListener("click", () => {
      paginaActual = num;
      guardarFiltrosActuales();
      aplicarFiltros();
    });
    contenedorNumeros.appendChild(btn);
  }

  const rango = 3;
  const total = totalPaginas;

  // 1) Primera página
  crearBotonPagina(1);

  // 2) "..." inicial
  if (paginaActual - rango > 2) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.style.opacity = "0.5";
    dots.style.padding = "0 6px";
    contenedorNumeros.appendChild(dots);
  }

  // 3) Páginas intermedias alrededor de la actual
  for (
    let i = Math.max(2, paginaActual - rango);
    i <= Math.min(total - 1, paginaActual + rango);
    i++
  ) {
    crearBotonPagina(i);
  }

  // 4) "..." final
  if (paginaActual + rango < total - 1) {
    const dots2 = document.createElement("span");
    dots2.textContent = "…";
    dots2.style.opacity = "0.5";
    dots2.style.padding = "0 6px";
    contenedorNumeros.appendChild(dots2);
  }

  // 5) Última página
  if (total > 1) crearBotonPagina(total);

  // Prev / Next
  if (btnPaginaAnterior) {
    btnPaginaAnterior.disabled = paginaActual <= 1;
  }
  if (btnPagina