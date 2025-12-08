// ========================================
// CATÁLOGO + CARRITO (página catalogo.html)
// Mega menú categorías tipo "Telefonía"
// con 3er nivel de ETIQUETAS libres + iconos
// + memoria de filtros en localStorage
// + botón premium "Limpiar filtros"
// + PAGINACIÓN PREMIUM
// ========================================

const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";
const CLAVE_CARRITO = "dm_carrito";

// ===== DOM PRINCIPAL =====
const grid               = document.getElementById("lista-productos");
const buscador           = document.getElementById("buscador");
const filtroCategoria    = document.getElementById("filtro-categoria");     // select oculto
const filtroSubcategoria = document.getElementById("filtro-subcategoria");  // select oculto
const filtroEtiqueta     = document.getElementById("filtro-etiqueta");      // select oculto
const badgeActivos       = document.getElementById("badge-filtros-activos");

const megaToggle     = document.querySelector(".mega-toggle");
const megaDropdown   = document.querySelector(".mega-dropdown");
const megaCatBody    = document.getElementById("mega-cat-body");
const megaSubBody    = document.getElementById("mega-sub-body");
const megaTagBody    = document.getElementById("mega-tag-body");
const megaClose      = document.getElementById("mega-close");
const megaLimpiarBtn = document.getElementById("mega-limpiar");

// Texto del toggle principal
const megaLabelSpan = document.querySelector(".mega-label span");

// Paginación
const paginador      = document.getElementById("paginador");
const paginaActualEl = document.getElementById("pagina-actual");

// ===== ESTADO GLOBAL =====
let TODOS_LOS_PRODUCTOS = [];
let FILTROS = {
  texto: "",
  categoria: "",     // key interna de categoría
  subcategoria: "",  // key interna de subcategoría
  etiqueta: ""       // key interna de etiqueta
};

// Mapa: categoriaKey -> { label, subcategorias: { subKey: { label, tags: Set() } } }
let MAPA_CAT_SUB = {};

// PAGINACIÓN
let paginaActual = 1;
const TAMANIO_PAGINA = 24;

// ====== UTILIDADES GENERALES ======

function safe(value, defaultValue = "") {
  if (value === null || value === undefined) return defaultValue;
  return value;
}

function normalizarClaveCategoria(nombre) {
  return (nombre || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parsearPrecio(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return null;
  let str = String(valor).trim();
  str = str.replace(/\./g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? null : num;
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
      .map(t => String(t).trim())
      .filter(t => t.length > 0);
  }
  if (typeof campo === "string") {
    const partes = campo.split(/[;,\/|]+/);
    return partes
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }
  return [];
}

// ====== CARRITO (localStorage) ======

function leerCarrito() {
  try {
    const str = localStorage.getItem(CLAVE_CARRITO);
    if (!str) return [];
    const arr = JSON.parse(str);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    console.error("Error leyendo carrito:", e);
    return [];
  }
}

function guardarCarrito(arr) {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(arr));
  } catch (e) {
    console.error("Error guardando carrito:", e);
  }
}

function agregarAlCarrito(codigo, cantidad, precioUnitario, nombre) {
  const carrito = leerCarrito();
  const idx = carrito.findIndex(item => item.codigo === codigo);

  if (idx >= 0) {
    carrito[idx].cantidad += cantidad;
  } else {
    carrito.push({
      codigo,
      cantidad,
      precioUnitario,
      nombre
    });
  }

  guardarCarrito(carrito);
}

function calcularTotalItemsCarrito() {
  const carrito = leerCarrito();
  return carrito.reduce((acc, item) => acc + (item.cantidad || 0), 0);
}

// ====== MEMORIA DE FILTROS (localStorage) ======

const CLAVE_FILTROS = "dm_filtros_catalogo";

function guardarFiltros() {
  try {
    localStorage.setItem(CLAVE_FILTROS, JSON.stringify(FILTROS));
  } catch (e) {
    console.warn("No se pudieron guardar filtros:", e);
  }
}

function cargarFiltrosGuardados() {
  try {
    const str = localStorage.getItem(CLAVE_FILTROS);
    if (!str) return;
    const obj = JSON.parse(str);
    if (typeof obj !== "object" || obj === null) return;

    FILTROS.texto       = obj.texto       || "";
    FILTROS.categoria   = obj.categoria   || "";
    FILTROS.subcategoria= obj.subcategoria|| "";
    FILTROS.etiqueta    = obj.etiqueta    || "";
  } catch (e) {
    console.warn("No se pudieron cargar filtros guardados:", e);
  }
}

// ====== CONSTRUCCIÓN DEL MAPA CATEGORÍAS / SUBCATEGORÍAS / TAGS ======

function construirMapaCatSub(productos) {
  MAPA_CAT_SUB = {};

  productos.forEach(prod => {
    const catBruta = safe(
      prod.categoria ||
      prod.rubro ||
      prod.cat ||
      prod["Categoria Princ"] ||
      prod["Categoria_Princ"],
      "Sin categoría"
    );

    const catLabel = String(catBruta).trim() || "Sin categoría";
    const catKey   = normalizarClaveCategoria(catLabel) || "sin_categoria";

    if (!MAPA_CAT_SUB[catKey]) {
      MAPA_CAT_SUB[catKey] = {
        label: catLabel,
        subcategorias: {}
      };
    }

    const subBruta = safe(
      prod.subcategoria ||
      prod.Subcategoria ||
      prod.Sub_Categoria ||
      prod["Sub_Categoria"] ||
      prod["Subcategoria"],
      "General"
    );

    const subLabel = String(subBruta).trim() || "General";
    const subKey   = normalizarClaveCategoria(subLabel) || "general";

    if (!MAPA_CAT_SUB[catKey].subcategorias[subKey]) {
      MAPA_CAT_SUB[catKey].subcategorias[subKey] = {
        label: subLabel,
        tags: new Set()
      };
    }

    const etiquetasCrudas =
      prod.etiquetas ||
      prod.tags ||
      prod["Etiquetas"] ||
      prod["Tags"];

    const listaTags = normalizarEtiquetasCampo(etiquetasCrudas);

    listaTags.forEach(tag => {
      MAPA_CAT_SUB[catKey].subcategorias[subKey].tags.add(tag);
    });
  });

  Object.values(MAPA_CAT_SUB).forEach(catObj => {
    Object.values(catObj.subcategorias).forEach(subObj => {
      if (!subObj.tags || !(subObj.tags instanceof Set)) {
        subObj.tags = new Set();
      }
    });
  });
}

function crearBotonCat(catKey, catLabel) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mega-cat-btn";
  btn.dataset.catKey = catKey;
  btn.textContent = catLabel;

  if (FILTROS.categoria === catKey) {
    btn.classList.add("activo");
  }

  btn.addEventListener("click", () => {
    seleccionarCategoria(catKey);
  });

  return btn;
}

function crearBotonSub(catKey, subKey, subLabel) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mega-sub-btn";
  btn.dataset.catKey = catKey;
  btn.dataset.subKey = subKey;
  btn.textContent = subLabel;

  if (FILTROS.categoria === catKey && FILTROS.subcategoria === subKey) {
    btn.classList.add("activo");
  }

  btn.addEventListener("click", () => {
    seleccionarSubcategoria(catKey, subKey);
  });

  return btn;
}

function crearBotonTag(catKey, subKey, tagKey, tagLabel) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mega-tag-btn";
  btn.dataset.catKey = catKey;
  btn.dataset.subKey = subKey;
  btn.dataset.tagKey = tagKey;
  btn.textContent = tagLabel;

  if (
    FILTROS.categoria === catKey &&
    FILTROS.subcategoria === subKey &&
    FILTROS.etiqueta === tagKey
  ) {
    btn.classList.add("activo");
  }

  btn.addEventListener("click", () => {
    seleccionarEtiqueta(catKey, subKey, tagKey, tagLabel);
  });

  return btn;
}

// ====== ACTUALIZAR MEGA MENÚ ======

function renderizarMegaMenu() {
  megaCatBody.innerHTML = "";
  megaSubBody.innerHTML = "";
  megaTagBody.innerHTML = "";

  const entriesCat = Object.entries(MAPA_CAT_SUB)
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "es"));

  entriesCat.forEach(([catKey, catObj]) => {
    const btnCat = crearBotonCat(catKey, catObj.label);
    megaCatBody.appendChild(btnCat);

    if (FILTROS.categoria === catKey) {
      const subEntries = Object.entries(catObj.subcategorias)
        .sort((a, b) => a[1].label.localeCompare(b[1].label, "es"));

      subEntries.forEach(([subKey, subObj]) => {
        const btnSub = crearBotonSub(catKey, subKey, subObj.label);
        megaSubBody.appendChild(btnSub);

        if (FILTROS.subcategoria === subKey) {
          const tagsArray = Array.from(subObj.tags).sort((a, b) =>
            a.localeCompare(b, "es")
          );

          tagsArray.forEach(tag => {
            const tagKey = normalizarClaveCategoria(tag);
            const btnTag = crearBotonTag(catKey, subKey, tagKey, tag);
            megaTagBody.appendChild(btnTag);
          });
        }
      });
    }
  });

  actualizarTextoToggle();
}

// ====== SELECCIÓN DESDE MEGA MENÚ ======

function seleccionarCategoria(catKey) {
  FILTROS.categoria    = catKey;
  FILTROS.subcategoria = "";
  FILTROS.etiqueta     = "";
  paginaActual = 1;

  renderizarMegaMenu();
  aplicarFiltros();
  guardarFiltros();
}

function seleccionarSubcategoria(catKey, subKey) {
  FILTROS.categoria    = catKey;
  FILTROS.subcategoria = subKey;
  FILTROS.etiqueta     = "";
  paginaActual = 1;

  renderizarMegaMenu();
  aplicarFiltros();
  guardarFiltros();
}

function seleccionarEtiqueta(catKey, subKey, tagKey, tagLabel) {
  FILTROS.categoria    = catKey;
  FILTROS.subcategoria = subKey;
  FILTROS.etiqueta     = tagKey;
  paginaActual = 1;

  const actualTexto = megaLabelSpan.textContent || "";
  const baseTexto   = actualTexto.split(" · ")[0];

  if (tagLabel) {
    megaLabelSpan.textContent = `${baseTexto} · ${tagLabel}`;
  }

  renderizarMegaMenu();
  aplicarFiltros();
  guardarFiltros();
}

function limpiarFiltrosMega() {
  FILTROS.texto       = "";
  FILTROS.categoria   = "";
  FILTROS.subcategoria= "";
  FILTROS.etiqueta    = "";
  paginaActual        = 1;

  if (buscador) buscador.value = "";

  filterSelectReset(filtroCategoria);
  filterSelectReset(filtroSubcategoria);
  filterSelectReset(filtroEtiqueta);

  renderizarMegaMenu();
  aplicarFiltros();
  guardarFiltros();
}

function filterSelectReset(select) {
  if (!select) return;
  select.value = "";
}

// ====== TEXTO DEL TOGGLE ======

function actualizarTextoToggle() {
  const catKey = FILTROS.categoria;
  const subKey = FILTROS.subcategoria;
  const tagKey = FILTROS.etiqueta;

  let texto = "Categoría";

  if (catKey && MAPA_CAT_SUB[catKey]) {
    texto = MAPA_CAT_SUB[catKey].label;

    if (subKey && MAPA_CAT_SUB[catKey].subcategorias[subKey]) {
      texto += " · " + MAPA_CAT_SUB[catKey].subcategorias[subKey].label;

      if (tagKey) {
        let tagEncontrada = null;
        const subObj = MAPA_CAT_SUB[catKey].subcategorias[subKey];
        subObj.tags.forEach(t => {
          if (!tagEncontrada) {
            if (normalizarClaveCategoria(t) === tagKey) {
              tagEncontrada = t;
            }
          }
        });

        if (tagEncontrada) {
          texto += " · " + tagEncontrada;
        }
      }
    }
  }

  megaLabelSpan.textContent = texto;
}

// ====== FILTRADO DE PRODUCTOS ======

function aplicarFiltros() {
  if (!Array.isArray(TODOS_LOS_PRODUCTOS)) return;

  let lista = [...TODOS_LOS_PRODUCTOS];

  const texto = (FILTROS.texto || "").toLowerCase().trim();
  if (texto) {
    lista = lista.filter(prod => {
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

      const etiquetasCrudas =
        prod.etiquetas ||
        prod.tags ||
        prod["Etiquetas"] ||
        prod["Tags"] ||
        "";

      const etiquetasTexto = Array.isArray(etiquetasCrudas)
        ? etiquetasCrudas.join(" ").toLowerCase()
        : String(etiquetasCrudas).toLowerCase();

      return (
        codigo.includes(texto) ||
        nombre.includes(texto) ||
        categoria.includes(texto) ||
        subcategoria.includes(texto) ||
        etiquetasTexto.includes(texto)
      );
    });
  }

  const catKey = FILTROS.categoria;
  if (catKey) {
    lista = lista.filter(prod => {
      const catBruta = safe(
        prod.categoria ||
        prod.rubro ||
        prod.cat ||
        prod["Categoria Princ"] ||
        prod["Categoria_Princ"],
        "Sin categoría"
      );
      const catLabel = String(catBruta).trim() || "Sin categoría";
      const catKeyProd = normalizarClaveCategoria(catLabel) || "sin_categoria";

      return catKeyProd === catKey;
    });
  }

  const subKey = FILTROS.subcategoria;
  if (subKey) {
    lista = lista.filter(prod => {
      const subBruta = safe(
        prod.subcategoria ||
        prod.Subcategoria ||
        prod.Sub_Categoria ||
        prod["Sub_Categoria"] ||
        prod["Subcategoria"],
        "General"
      );
      const subLabel = String(subBruta).trim() || "General";
      const subKeyProd = normalizarClaveCategoria(subLabel) || "general";
      return subKeyProd === subKey;
    });
  }

  const tagKey = FILTROS.etiqueta;
  if (tagKey) {
    lista = lista.filter(prod => {
      const etiquetasCrudas =
        prod.etiquetas ||
        prod.tags ||
        prod["Etiquetas"] ||
        prod["Tags"];

      const listaTags = normalizarEtiquetasCampo(etiquetasCrudas);

      return listaTags.some(t => normalizarClaveCategoria(t) === tagKey);
    });
  }

  const totalFiltrados = lista.length;
  actualizarBadgeFiltros();
  paginaActual = Math.min(paginaActual, Math.max(1, Math.ceil(totalFiltrados / TAMANIO_PAGINA))) || 1;

  renderPaginacion(lista);
  const desde = (paginaActual - 1) * TAMANIO_PAGINA;
  const hasta = desde + TAMANIO_PAGINA;
  const paginaProductos = lista.slice(desde, hasta);

  renderProductos(paginaProductos);
}

function actualizarBadgeFiltros() {
  if (!badgeActivos) return;

  let count = 0;

  if ((FILTROS.texto || "").trim()) count++;
  if (FILTROS.categoria) count++;
  if (FILTROS.subcategoria) count++;
  if (FILTROS.etiqueta) count++;

  if (count > 0) {
    badgeActivos.style.display = "inline-flex";
    badgeActivos.textContent = String(count);
  } else {
    badgeActivos.style.display = "none";
  }
}

// ====== RENDER DE PRODUCTOS ======

function setImagenProducto(imgElement, prod) {
  if (!imgElement || !prod) return;

  let ruta = safe(prod.imagen || prod.img || prod.foto, "");
  if (!ruta) {
    const codigo = safe(
      prod.codigo || prod.cod || prod.Code || prod.Codigo,
      ""
    );

    if (codigo) {
      ruta = `${BASE_IMG}/productos/${encodeURIComponent(codigo)}.jpg`;
    } else {
      ruta = `${BASE_IMG}/otros/no-image.png`;
    }
  } else if (!ruta.startsWith("http")) {
    ruta = `${BASE_IMG}/${ruta.replace(/^\/+/, "")}`;
  }

  imgElement.src = ruta;
}

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

    const categoriaLabel = safe(
      prod.categoria ||
      prod.rubro ||
      prod.cat ||
      prod["Categoria Princ"] ||
      prod["Categoria_Princ"],
      ""
    ).toString().trim();

    const subcategoriaLabel = safe(
      prod.subcategoria ||
      prod.Subcategoria ||
      prod.Sub_Categoria ||
      prod["Sub_Categoria"] ||
      prod["Subcategoria"],
      ""
    ).toString().trim();

    const card = document.createElement("article");
    card.classList.add("producto-card");
    card.dataset.categoria   = (categoriaLabel || "sin-categoria").toLowerCase();
    card.dataset.subcategoria = (subcategoriaLabel || "sin-subcategoria").toLowerCase();

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

        <p class="producto-meta-cat">
          ${categoriaLabel || "Sin categoría"}
          ${subcategoriaLabel ? " · " + subcategoriaLabel : ""}
        </p>

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
    setImagenProducto(img, prod);

    const input = card.querySelector(".input-cantidad");
    if (input) {
      input.value = "1";
      if (stockNum > 0) {
        input.max = stockNum;
      }
    }

    const btnAgregar = card.querySelector(".btn-agregar-carrito");
    if (btnAgregar) {
      btnAgregar.addEventListener("click", (ev) => {
        ev.stopPropagation();

        let cantidad = parseInt(input?.value || "1", 10);
        if (!Number.isFinite(cantidad) || cantidad < 1) {
          cantidad = 1;
        }
        if (stockNum > 0 && cantidad > stockNum) {
          cantidad = stockNum;
        }
        if (input) input.value = String(cantidad);

        agregarAlCarrito(codigo, cantidad, precioNum, nombreBase);

        btnAgregar.textContent = `En carrito (${(itemCarrito?.cantidad || 0) + cantidad})`;
        btnAgregar.classList.add("en-carrito");

        const stockVisible = card.querySelector(".producto-stock");
        if (stockVisible && stockNum > 0) {
          const carritoTotal = leerCarrito()
            .filter(x => x.codigo === codigo)
            .reduce((acc, x) => acc + (x.cantidad || 0), 0);

          let restante = stockNum - carritoTotal;
          if (restante < 0) restante = 0;
          stockVisible.textContent = `Stock: ${restante} unidades`;
        }
      });
    }

    const stockVisible = card.querySelector(".producto-stock");
    if (stockVisible && stockNum > 0 && itemCarrito?.cantidad) {
      let restante = stockNum - itemCarrito.cantidad;
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
        v++;
        if (stockNum > 0 && v > stockNum) v = stockNum;
        input.value = String(v);
      });
    }

    if (btnMenos) {
      btnMenos.addEventListener("click", (ev) => {
        ev.stopPropagation();
        let v = parseInt(input.value, 10);
        if (!Number.isFinite(v) || v < 1) v = 1;
        v--;
        if (v < 1) v = 1;
        input.value = String(v);
      });
    }

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

// ====== PAGINACIÓN ======

function renderPaginacion(listaCompleta) {
  if (!paginador || !Array.isArray(listaCompleta)) return;

  paginador.innerHTML = "";

  const total = Math.ceil(listaCompleta.length / TAMANIO_PAGINA);
  if (total <= 1) {
    paginador.style.display = "none";
    return;
  }

  paginador.style.display = "flex";

  function crearBotonPagina(num) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(num);
    btn.className = "page-btn";
    if (num === paginaActual) {
      btn.classList.add("activo");
    }
    btn.addEventListener("click", () => {
      paginaActual = num;
      aplicarFiltros();
    });
    paginador.appendChild(btn);
  }

  function crearBotonFlecha(label, delta) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = "page-btn flecha";
    btn.addEventListener("click", () => {
      paginaActual = Math.min(Math.max(1, paginaActual + delta), total);
      aplicarFiltros();
    });
    paginador.appendChild(btn);
  }

  if (paginaActual > total) {
    paginaActual = total;
  }

  crearBotonFlecha("«", -1);

  const rango = 2;

  crearBotonPagina(1);

  if (paginaActual - rango > 2) {
    const dots = document.createElement("span");
    dots.className = "page-dots";
    dots.textContent = "...";
    paginador.appendChild(dots);
  }

  for (
    let i = Math.max(2, paginaActual - rango);
    i <= Math.min(total - 1, paginaActual + rango);
    i++
  ) {
    crearBotonPagina(i);
  }

  if (paginaActual + rango < total - 1) {
    const dots2 = document.createElement("span");
    dots2.className = "page-dots";
    dots2.textContent = "...";
    paginador.appendChild(dots2);
  }

  if (total > 1) {
    crearBotonPagina(total);
  }

  crearBotonFlecha("»", +1);

  if (paginaActualEl) {
    paginaActualEl.textContent = `Página ${paginaActual} de ${total}`;
  }
}

// ====== CARGA DE PRODUCTOS ======

async function cargarProductos() {
  try {
    let data = null;

    // 1) Si vienen productos embebidos en la página (opcional)
    if (window.PRODUCTOS_EMBEBIDOS && Array.isArray(window.PRODUCTOS_EMBEBIDOS)) {
      data = window.PRODUCTOS_EMBEBIDOS;
    } else {
      // 2) Probamos varias rutas posibles para el JSON
      const rutas = [
        "data/productos.json",
        "productos.json",
        "./data/productos.json",
        "./productos.json"
      ];

      let ultimaError = null;

      for (const ruta of rutas) {
        try {
          const resp = await fetch(ruta, { cache: "no-store" });
          if (!resp.ok) {
            ultimaError = new Error(`Respuesta no OK (${resp.status}) en ${ruta}`);
            continue;
          }
          data = await resp.json();
          console.log("Productos cargados desde:", ruta);
          break;
        } catch (e) {
          ultimaError = e;
        }
      }

      if (!data) {
        throw ultimaError || new Error("No se pudo cargar productos.json en ninguna ruta");
      }
    }

    // 3) Nos aseguramos de quedarnos con un ARRAY
    if (!Array.isArray(data)) {
      if (data && Array.isArray(data.productos)) {
        data = data.productos;
      } else {
        throw new Error("El JSON de productos no es un array válido");
      }
    }

    TODOS_LOS_PRODUCTOS = data;

    // 4) Construimos categorías / subcategorías / etiquetas
    construirMapaCatSub(TODOS_LOS_PRODUCTOS);
    cargarFiltrosGuardados();

    // 5) Render inicial
    renderizarMegaMenu();
    aplicarFiltros();
  } catch (err) {
    console.error("Error cargando productos:", err);
    if (grid) {
      grid.innerHTML = `<p>Error al cargar productos. Intenta más tarde.</p>`;
    }
  }
}

// ====== EVENTOS BUSCADOR Y TOGGLE ======

if (buscador) {
  buscador.addEventListener("input", () => {
    FILTROS.texto = buscador.value;
    paginaActual = 1;
    aplicarFiltros();
    guardarFiltros();
  });
}

if (megaToggle && megaDropdown) {
  megaToggle.addEventListener("click", (ev) => {
    ev.stopPropagation();
    megaDropdown.classList.toggle("abierto");
  });

  document.addEventListener("click", (ev) => {
    if (!megaDropdown.contains(ev.target) && !megaToggle.contains(ev.target)) {
      megaDropdown.classList.remove("abierto");
    }
  });
}

if (megaClose) {
  megaClose.addEventListener("click", () => {
    megaDropdown.classList.remove("abierto");
  });
}

if (megaLimpiarBtn) {
  megaLimpiarBtn.addEventListener("click", () => {
    limpiarFiltrosMega();
  });
}

window.addEventListener("DOMContentLoaded", () => {
  cargarProductos();

  if (FILTROS.texto && buscador) {
    buscador.value = FILTROS.texto;
  }

  if (FILTROS.categoria) {
    const catKey = FILTROS.categoria;
    const subKey = FILTROS.subcategoria;
    const tagKey = FILTROS.etiqueta;

    if (MAPA_CAT_SUB[catKey]) {
      if (subKey && MAPA_CAT_SUB[catKey].subcategorias[subKey]) {
        if (tagKey) {
          const subObj = MAPA_CAT_SUB[catKey].subcategorias[subKey];
          let tagLabel = null;
          subObj.tags.forEach(t => {
            if (!tagLabel) {
              if (normalizarClaveCategoria(t) === tagKey) {
                tagLabel = t;
              }
            }
          });
          if (tagLabel) {
            seleccionarEtiqueta(catKey, subKey, tagKey, tagLabel);
          }
        } else {
          seleccionarSubcategoria(catKey, subKey);
        }
      } else {
        seleccionarCategoria(catKey);
      }
    }
  }

  if (!FILTROS.categoria && !FILTROS.subcategoria && !FILTROS.etiqueta) {
    actualizarTextoToggle();
    aplicarFiltros();
  }

  if (filtroCategoria) filtroCategoria.value = FILTROS.categoria || "";
  if (filtroSubcategoria) filtroSubcategoria.value = FILTROS.subcategoria || "";
  if (filtroEtiqueta) filtroEtiqueta.value = FILTROS.etiqueta || "";
});
