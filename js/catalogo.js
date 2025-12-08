// ========================================
// CATÁLOGO + CARRITO (página catalogo.html)
// Mega menú categorías tipo "Telefonía"
// con 3er nivel de ETIQUETAS libres + iconos
// + memoria de filtros en localStorage
// ========================================

const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";
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

const miniCantidad = document.getElementById("mini-carrito-cantidad");
const miniTotal    = document.getElementById("mini-carrito-total");

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
    categoria: categoriaSeleccionada || "todas",
    subcategoria: subcategoriaSeleccionada || "todas",
    etiqueta: etiquetaSeleccionada || "todas"
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
    setImagenProducto(img, codigo);

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

  renderProductos(filtrados);
}

// ========= ICONOS PARA CATEGORÍAS =========

function iconoParaCategoria(catLabel) {
  if (!catLabel) return "•";

  // Normalizamos el texto para matchear bien
  const txt = catLabel.toLowerCase().trim();

  // Mapeo explícito por nombre de categoría
  const mapa = {
    "todas las categorías": "★",

    // Las que se ven en tu menú
    "accesorios vehiculares": "🚗",
    "baño y cocina": "🍽️",
    "bano y cocina": "🍽️",
    "camping": "⛺",
    "cocina": "🍳",
    "cuidado personal": "🧴",
    "decoración": "🕯️",
    "decoracion": "🕯️",

    // Por si tenés estas u otras similares
    "bazar": "🛍️",
    "hogar": "🏡",
    "librería": "📚",
    "libreria": "📚",
    "oficina": "📎",
    "electrónica": "🔌",
    "electronica": "🔌",
    "audio": "🎧",
    "ferretería": "🛠",
    "ferreteria": "🛠",
    "herramientas": "🛠",
    "juguetes": "🧸",
    "regalería": "🎁",
    "regaleria": "🎁",
    "mochilas": "🎒",
    "bolsos": "👜"
  };

  if (mapa[txt]) return mapa[txt];

  // Fallback si agregás nuevas categorías más adelante
  if (txt.includes("vehicul")) return "🚗";
  if (txt.includes("auto") || txt.includes("motor")) return "🚙";
  if (txt.includes("baño") || txt.includes("bano") || txt.includes("cocina")) return "🍽️";
  if (txt.includes("hogar")) return "🏡";
  if (txt.includes("camping")) return "⛺";
  if (txt.includes("cuidado")) return "🧴";
  if (txt.includes("decor")) return "🕯️";
  if (txt.includes("juguet") || txt.includes("regal")) return "🧸";
  if (txt.includes("librer") || txt.includes("oficina")) return "📚";
  if (txt.includes("electr")) return "🔌";
  if (txt.includes("herramient") || txt.includes("ferreter")) return "🛠";
  if (txt.includes("bolso") || txt.includes("mochila")) return "🎒";
  if (txt.includes("bazar")) return "🛍️";

  // Último recurso
  return "•";
}

// ========= MEGA MENÚ: CATEGORÍAS / SUBCATEGORÍAS / ETIQUETAS =========

function cerrarMegaMenu() {
  if (megaDropdown) megaDropdown.classList.remove("open");
}

function abrirMegaMenu() {
  if (megaDropdown) megaDropdown.classList.add("open");
}

function actualizarTextoToggle() {
  let partes = [];

  if (labelCategoriaActual) {
    if (labelCategoriaActual !== "Todas las categorías") {
      partes.push(labelCategoriaActual);
    }
  }

  if (labelSubcategoriaActual && labelSubcategoriaActual !== "Todas") {
    partes.push(labelSubcategoriaActual);
  }

  if (labelEtiquetaActual && labelEtiquetaActual !== "Todas") {
    partes.push(labelEtiquetaActual);
  }

  let texto;
  if (partes.length === 0) {
    texto = "Todas las categorías";
  } else {
    texto = partes.join(" › ");
  }

  megaToggle.innerHTML = `
    <span class="mega-label">${texto}</span>
    <span class="mega-arrow">▾</span>
  `;
}

function seleccionarCategoria(catKey) {
  categoriaSeleccionada    = catKey || "todas";
  subcategoriaSeleccionada = "todas";
  etiquetaSeleccionada     = "todas";

  if (filtroCategoria)    filtroCategoria.value    = categoriaSeleccionada;
  if (filtroSubcategoria) filtroSubcategoria.value = "todas";

  if (megaCatList) {
    megaCatList.querySelectorAll(".mega-item").forEach(li => {
      li.classList.toggle("mega-item-activo", li.dataset.catKey === categoriaSeleccionada);
    });
  }

  labelCategoriaActual   = categoriaSeleccionada === "todas"
    ? "Todas las categorías"
    : (MAPA_CAT_LABEL[categoriaSeleccionada] || "Categoría");
  labelSubcategoriaActual = null;
  labelEtiquetaActual     = null;

  construirMenuSubcategorias(categoriaSeleccionada, labelCategoriaActual);
  construirMenuEtiquetas(categoriaSeleccionada, "todas", labelCategoriaActual, null);

  actualizarTextoToggle();
  aplicarFiltros();
  guardarFiltrosActuales();
}

function seleccionarSubcategoria(catKey, subKey, subLabel) {
  subcategoriaSeleccionada = subKey || "todas";
  etiquetaSeleccionada     = "todas";

  if (filtroSubcategoria) filtroSubcategoria.value = subcategoriaSeleccionada;

  if (megaSubList) {
    megaSubList.querySelectorAll(".mega-subitem").forEach(li => {
      li.classList.toggle("mega-subitem-activo", li.dataset.subKey === subcategoriaSeleccionada);
    });
  }

  labelSubcategoriaActual = subKey === "todas" ? null : (subLabel || subKey);
  labelEtiquetaActual     = null;

  construirMenuEtiquetas(catKey, subKey, labelCategoriaActual, labelSubcategoriaActual);
  actualizarTextoToggle();
  aplicarFiltros();
  guardarFiltrosActuales();
}

function seleccionarEtiqueta(catKey, subKey, tagKey, tagLabel) {
  etiquetaSeleccionada = tagKey || "todas";

  if (megaTagList) {
    megaTagList.querySelectorAll(".mega-tagitem").forEach(li => {
      li.classList.toggle("mega-tagitem-activo", li.dataset.tagKey === etiquetaSeleccionada);
    });
  }

  labelEtiquetaActual = tagKey === "todas" ? null : (tagLabel || tagKey);

  actualizarTextoToggle();
  aplicarFiltros();
  guardarFiltrosActuales();
  cerrarMegaMenu();
}

function construirMenuEtiquetas(catKey, subKey, catLabel, subLabel) {
  if (!megaTagList) return;

  megaTagList.innerHTML = "";

  const ck = (catKey || "todas").toLowerCase();
  const sk = (subKey || "todas").toLowerCase();

  let setTags = null;

  if (ck === "todas") {
    setTags = null;
  } else if (MAPA_TAGS[ck]) {
    if (MAPA_TAGS[ck][sk]) {
      setTags = MAPA_TAGS[ck][sk];
    } else {
      const temp = new Set();
      Object.values(MAPA_TAGS[ck]).forEach(s => {
        s.forEach(t => temp.add(t));
      });
      setTags = temp;
    }
  }

  if (megaTagTitle) {
    if (!subLabel || sk === "todas") {
      megaTagTitle.textContent = "Etiquetas";
    } else {
      megaTagTitle.textContent = `Etiquetas de ${subLabel}`;
    }
  }

  const liTodas = document.createElement("li");
  liTodas.className = "mega-tagitem mega-tagitem-activo";
  liTodas.textContent = "Todas";
  liTodas.dataset.tagKey = "todas";
  liTodas.addEventListener("click", () =>
    seleccionarEtiqueta(ck, sk, "todas", "Todas")
  );
  megaTagList.appendChild(liTodas);

  if (!setTags || setTags.size === 0) {
    return;
  }

  Array.from(setTags)
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach(tagLabel => {
      const tagKey = tagLabel.toLowerCase();
      const li = document.createElement("li");
      li.className = "mega-tagitem";
      li.textContent = tagLabel;
      li.dataset.tagKey = tagKey;
      li.addEventListener("click", () =>
        seleccionarEtiqueta(ck, sk, tagKey, tagLabel)
      );
      megaTagList.appendChild(li);
    });
}

function construirMenuSubcategorias(catKey, catLabel) {
  if (!megaSubList) return;

  megaSubList.innerHTML = "";

  const key = (catKey || "todas").toLowerCase();
  const subSet = MAPA_CAT_SUB[key];

  if (!subSet || subSet.size === 0 || key === "todas") {
    if (megaSubTitle) megaSubTitle.textContent = "Subcategorías";

    const li = document.createElement("li");
    li.className = "mega-subitem mega-subitem-activo";
    li.textContent = "Todas";
    li.dataset.subKey = "todas";
    li.addEventListener("click", () => {
      seleccionarSubcategoria("todas", "todas", "Todas");
    });
    megaSubList.appendChild(li);
    return;
  }

  if (megaSubTitle) megaSubTitle.textContent = catLabel || "Subcategorías";

  const liTodas = document.createElement("li");
  liTodas.className = "mega-subitem mega-subitem-activo";
  liTodas.textContent = "Todas";
  liTodas.dataset.subKey = "todas";
  liTodas.addEventListener("click", () => {
    seleccionarSubcategoria(catKey, "todas", "Todas");
  });
  megaSubList.appendChild(liTodas);

  Array.from(subSet)
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach(sub => {
      const subKey = sub.toLowerCase();
      const li = document.createElement("li");
      li.className = "mega-subitem";
      li.textContent = sub;
      li.dataset.subKey = subKey;
      li.addEventListener("click", () => {
        seleccionarSubcategoria(catKey, subKey, sub);
      });
      megaSubList.appendChild(li);
    });
}

function construirMenuCategorias(categoriasUnicas) {
  if (!megaCatList) return;

  megaCatList.innerHTML = "";

  const liTodas = document.createElement("li");
  liTodas.className = "mega-item mega-item-activo";
  liTodas.textContent = "Todas las categorías";
  liTodas.dataset.catKey = "todas";
  liTodas.dataset.icon   = "★";
  liTodas.addEventListener("click", () => seleccionarCategoria("todas"));
  megaCatList.appendChild(liTodas);

  categoriasUnicas.forEach(cat => {
    const key = cat.toLowerCase();
    MAPA_CAT_LABEL[key] = cat;

    const li = document.createElement("li");
    li.className = "mega-item";
    li.textContent = cat;
    li.dataset.catKey = key;
    li.dataset.icon   = iconoParaCategoria(cat);
    li.addEventListener("click", () => seleccionarCategoria(key));
    megaCatList.appendChild(li);
  });

}

// ========= CARGA INICIAL =========

async function cargarProductos() {
  try {
    const resp = await fetch("productos.json");
    if (!resp.ok) throw new Error("No se pudo cargar productos.json");

    const data = await resp.json();
    TODOS_LOS_PRODUCTOS = Array.isArray(data)
      ? data
      : (data.productos || []);

    MAPA_CAT_SUB   = {};
    MAPA_CAT_LABEL = {};
    MAPA_TAGS      = {};

    TODOS_LOS_PRODUCTOS.forEach(p => {
      const catOriginal = safe(
        p.categoria || p.rubro || p.cat || p["Categoria Princ"] || p["Categoria_Princ"],
        ""
      ).toString().trim();

      const subOriginal = safe(
        p.subcategoria ||
        p.Subcategoria ||
        p.Sub_Categoria ||
        p["Sub_Categoria"] ||
        p["Subcategoria"],
        ""
      ).toString().trim();

      const catKey = (catOriginal.toLowerCase() || "sin-categoria");
      const subKey = (subOriginal.toLowerCase() || "sin-subcategoria");

      if (!MAPA_CAT_SUB[catKey]) {
        MAPA_CAT_SUB[catKey] = new Set();
      }
      if (subOriginal) {
        MAPA_CAT_SUB[catKey].add(subOriginal);
      }

      const etiquetasRaw =
        p.etiquetas ||
        p.tags ||
        p.tag ||
        p["Etiquetas"] ||
        p["etiquetas"];

      const etiquetasNorm = normalizarEtiquetasCampo(etiquetasRaw);
      if (etiquetasNorm.length) {
        if (!MAPA_TAGS[catKey]) MAPA_TAGS[catKey] = {};
        if (!MAPA_TAGS[catKey][subKey]) MAPA_TAGS[catKey][subKey] = new Set();
        etiquetasNorm.forEach(t => MAPA_TAGS[catKey][subKey].add(
          t.charAt(0).toUpperCase() + t.slice(1)
        ));
      }
    });

    if (filtroCategoria) {
      const categoriasUnicas = Array.from(
        new Set(
          TODOS_LOS_PRODUCTOS.map(p =>
            safe(
              p.categoria || p.rubro || p.cat || p["Categoria Princ"] || p["Categoria_Princ"],
              ""
            ).toString()
          ).filter(c => c !== "")
        )
      ).sort((a, b) => a.localeCompare(b, "es"));

      filtroCategoria.innerHTML = "";
      const optTodas = document.createElement("option");
      optTodas.value = "todas";
      optTodas.textContent = "Todas las categorías";
      filtroCategoria.appendChild(optTodas);

      categoriasUnicas.forEach(cat => {
        const op = document.createElement("option");
        op.value = cat.toLowerCase();
        op.textContent = cat;
        filtroCategoria.appendChild(op);
      });

      construirMenuCategorias(categoriasUnicas);
    }

    if (filtroSubcategoria) {
      filtroSubcategoria.innerHTML = "";
      const optTodasSub = document.createElement("option");
      optTodasSub.value = "todas";
      optTodasSub.textContent = "Todas las subcategorías";
      filtroSubcategoria.appendChild(optTodasSub);
      filtroSubcategoria.value = "todas";
    }

    renderProductos(TODOS_LOS_PRODUCTOS);
    actualizarMiniCarrito();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p>Error cargando productos: ${err.message}</p>`;
  }
}

// ========= EVENTOS =========

if (buscador) {
  buscador.addEventListener("input", aplicarFiltros);
}

if (megaToggle && megaDropdown) {
  megaToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (megaDropdown.classList.contains("open")) {
      cerrarMegaMenu();
    } else {
      abrirMegaMenu();
    }
  });

  document.addEventListener("click", (e) => {
    if (!megaDropdown.contains(e.target)) {
      cerrarMegaMenu();
    }
  });
}

// ========= INICIO: CARGA + RESTAURAR FILTROS =========

document.addEventListener("DOMContentLoaded", async () => {
  await cargarProductos();
  actualizarMiniCarrito();

  const guardados = leerFiltrosGuardados();
  if (guardados) {
    const { categoria, subcategoria, etiqueta } = guardados;

    const catKey = categoria || "todas";
    const subKey = subcategoria || "todas";
    const tagKey = etiqueta || "todas";

    // Categoría
    if (catKey && catKey !== "todas") {
      seleccionarCategoria(catKey);
    }

    // Subcategoría
    if (subKey && subKey !== "todas") {
      let subLabel = null;
      const setSubs = MAPA_CAT_SUB[catKey];
      if (setSubs) {
        for (const s of setSubs) {
          if (s.toLowerCase() === subKey) {
            subLabel = s;
            break;
          }
        }
      }
      seleccionarSubcategoria(catKey, subKey, subLabel || subKey);
    }

    // Etiqueta
    if (tagKey && tagKey !== "todas") {
      let tagLabel = null;
      const tagsPorCat = MAPA_TAGS[catKey];
      if (tagsPorCat) {
        let setTags = tagsPorCat[subKey];
        if (!setTags) {
          const tmp = new Set();
          Object.values(tagsPorCat).forEach(st => st.forEach(t => tmp.add(t)));
          setTags = tmp;
        }
        if (setTags) {
          for (const t of setTags) {
            if (t.toLowerCase() === tagKey) {
              tagLabel = t;
              break;
            }
          }
        }
      }
      seleccionarEtiqueta(catKey, subKey, tagKey, tagLabel || tagKey);
    }

    actualizarTextoToggle();
    aplicarFiltros();
  }
});
