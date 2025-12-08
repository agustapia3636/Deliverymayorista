// ========================================
// CATÁLOGO + CARRITO (página catalogo.html)
// Mega menú categorías tipo "Telefonía"
// ========================================

const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";
const CLAVE_CARRITO = "dm_carrito";

// ===== DOM PRINCIPAL =====
const grid               = document.getElementById("lista-productos");
const buscador           = document.getElementById("buscador");
const filtroCategoria    = document.getElementById("filtro-categoria");     // select oculto
const filtroSubcategoria = document.getElementById("filtro-subcategoria");  // select oculto

// Mega menú
const megaDropdown    = document.getElementById("megaDropdown");
const megaToggle      = document.getElementById("categoriaToggle");
const megaMenu        = document.getElementById("megaMenu");
const megaCatList     = document.getElementById("megaCategorias");
const megaSubList     = document.getElementById("megaSubcategorias");
const megaSubTitle    = document.getElementById("megaSubTitle");

const miniCantidad = document.getElementById("mini-carrito-cantidad");
const miniTotal    = document.getElementById("mini-carrito-total");

// mapa categoría → subcategorías
let MAPA_CAT_SUB      = {};
let MAPA_CAT_LABEL    = {};
let TODAS_LAS_SUBCATS = new Set();
let TODOS_LOS_PRODUCTOS = [];

let categoriaSeleccionada    = "todas";
let subcategoriaSeleccionada = "todas";

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

// ========= FILTROS (BUSCADOR + CAT + SUBCAT) =========

function aplicarFiltros() {
  const texto = buscador.value.trim().toLowerCase();
  const cat   = filtroCategoria ? filtroCategoria.value : "";
  const sub   = filtroSubcategoria ? filtroSubcategoria.value : "";

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

    const pasaTexto =
      !texto || codigo.includes(texto) || nombre.includes(texto);

    const pasaCategoria =
      !cat || cat === "todas" || categoria === cat.toLowerCase();

    const pasaSubcategoria =
      !sub || sub === "todas" || subcategoria === sub.toLowerCase();

    return pasaTexto && pasaCategoria && pasaSubcategoria;
  });

  renderProductos(filtrados);
}

// ========= MEGA MENÚ: CATEGORÍAS / SUBCATEGORÍAS =========

function cerrarMegaMenu() {
  if (megaDropdown) megaDropdown.classList.remove("open");
}

function abrirMegaMenu() {
  if (megaDropdown) megaDropdown.classList.add("open");
}

function actualizarTextoToggle(catLabel, subLabel) {
  if (!megaToggle) return;

  let texto;
  if (catLabel && subLabel && subLabel !== "Todas") {
    texto = `${catLabel} › ${subLabel}`;
  } else if (catLabel) {
    texto = catLabel;
  } else {
    texto = "Todas las categorías";
  }

  megaToggle.innerHTML = `
    <span class="mega-label">${texto}</span>
    <span class="mega-arrow">▾</span>
  `;
}

function seleccionarCategoria(catKey) {
  categoriaSeleccionada = catKey || "todas";
  subcategoriaSeleccionada = "todas";

  if (filtroCategoria)    filtroCategoria.value    = categoriaSeleccionada;
  if (filtroSubcategoria) filtroSubcategoria.value = "todas";

  if (megaCatList) {
    megaCatList.querySelectorAll(".mega-item").forEach(li => {
      li.classList.toggle("mega-item-activo", li.dataset.catKey === categoriaSeleccionada);
    });
  }

  const labelCat = categoriaSeleccionada === "todas"
    ? "Todas las categorías"
    : (MAPA_CAT_LABEL[categoriaSeleccionada] || "Categoría");

  construirMenuSubcategorias(categoriaSeleccionada, labelCat);
  actualizarTextoToggle(labelCat, null);
  aplicarFiltros();
}

function seleccionarSubcategoria(catKey, subKey, subLabel) {
  subcategoriaSeleccionada = subKey || "todas";

  if (filtroSubcategoria) filtroSubcategoria.value = subcategoriaSeleccionada;

  if (megaSubList) {
    megaSubList.querySelectorAll(".mega-subitem").forEach(li => {
      li.classList.toggle("mega-subitem-activo", li.dataset.subKey === subcategoriaSeleccionada);
    });
  }

  const labelCat = catKey === "todas"
    ? "Todas las categorías"
    : (MAPA_CAT_LABEL[catKey] || "Categoría");

  const labelSub = subKey === "todas" ? null : subLabel;

  actualizarTextoToggle(labelCat, labelSub);
  aplicarFiltros();
  cerrarMegaMenu();
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
  liTodas.addEventListener("click", () => seleccionarCategoria("todas"));
  megaCatList.appendChild(liTodas);

  categoriasUnicas.forEach(cat => {
    const key = cat.toLowerCase();
    MAPA_CAT_LABEL[key] = cat;

    const li = document.createElement("li");
    li.className = "mega-item";
    li.textContent = cat;
    li.dataset.catKey = key;
    li.addEventListener("click", () => seleccionarCategoria(key));
    megaCatList.appendChild(li);
  });

  seleccionarCategoria("todas");
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

    MAPA_CAT_SUB      = {};
    MAPA_CAT_LABEL    = {};
    TODAS_LAS_SUBCATS = new Set();

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

      const catKey = catOriginal.toLowerCase();
      if (!MAPA_CAT_SUB[catKey]) {
        MAPA_CAT_SUB[catKey] = new Set();
      }
      if (subOriginal) {
        MAPA_CAT_SUB[catKey].add(subOriginal);
        TODAS_LAS_SUBCATS.add(subOriginal);
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
      const listaSubs = Array.from(TODAS_LAS_SUBCATS).sort(
        (a, b) => a.localeCompare(b, "es")
      );
      filtroSubcategoria.innerHTML = "";
      const optTodasSub = document.createElement("option");
      optTodasSub.value = "todas";
      optTodasSub.textContent = "Todas las subcategorías";
      filtroSubcategoria.appendChild(optTodasSub);
      listaSubs.forEach(sub => {
        const op = document.createElement("option");
        op.value = sub.toLowerCase();
        op.textContent = sub;
        filtroSubcategoria.appendChild(op);
      });
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

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarMiniCarrito();
});
