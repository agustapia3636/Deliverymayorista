// URL base de las imágenes en tu repo de GitHub
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

// Elementos del DOM
const grid = document.getElementById("lista-productos");      // contenedor de tarjetas
const buscador = document.getElementById("buscador");         // input de búsqueda
const filtroCategoria = document.getElementById("filtro-categoria"); // select de categorías

let TODOS_LOS_PRODUCTOS = [];

// ---------- UTILIDADES ----------

// Devuelve un valor “seguro” (sin undefined)
function safe(value, fallback = "") {
  return (value === undefined || value === null) ? fallback : value;
}

// Intenta cargar .jpg y .JPG. Si ninguna existe, muestra “Sin imagen”
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
      // No hay imagen válida
      imgElement.style.display = "none";
      // el texto "Sin imagen" lo dejamos en el HTML
      return;
    }
    imgElement.src = urls[intento];
    intento++;
  };

  imgElement.onerror = probar;
  probar();
}

// Da formato de precio
function formatearPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return "Consultar";
  return numero.toLocaleString("es-AR", {
    minimumFractionDigits: 0
  });
}

// ---------- RENDER ----------

function renderProductos(lista) {
  grid.innerHTML = "";

  if (!lista || lista.length === 0) {
    grid.innerHTML = `<p style="color:white; padding:1rem;">No se encontraron productos.</p>`;
    return;
  }

  lista.forEach(prod => {
    // Soportamos varios nombres de propiedades por si el JSON cambia
    const codigo      = safe(prod.codigo || prod.cod || prod.Code);
    const nombre      = safe(prod.nombre || prod.descripcion || prod.titulo, "Sin nombre");
    const categoria   = safe(prod.categoria || prod.rubro || prod.cat, "Sin categoría");
    const descCorta   = safe(prod.descripcionCorta || prod.descripcion_corta || prod.descripcion || "");
    const precioNum   = prod.precio ?? prod.precioMayorista ?? prod.precio_venta ?? prod.precioLista;
    const precioTexto = formatearPrecio(precioNum);

    const card = document.createElement("article");
    card.classList.add("producto-card");
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
    `;

    const img = card.querySelector(".producto-imagen");
    setImagenProducto(img, codigo);

    grid.appendChild(card);
  });
}

// ---------- FILTROS ----------

function aplicarFiltros() {
  const texto = buscador.value.trim().toLowerCase();
  const cat = filtroCategoria.value;

  const filtrados = TODOS_LOS_PRODUCTOS.filter(prod => {
    const codigo    = safe(prod.codigo || prod.cod || prod.Code, "").toString().toLowerCase();
    const nombre    = safe(prod.nombre || prod.descripcion || prod.titulo, "").toLowerCase();
    const categoria = safe(prod.categoria || prod.rubro || prod.cat, "").toLowerCase();

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

if (buscador) {
  buscador.addEventListener("input", aplicarFiltros);
}

if (filtroCategoria) {
  filtroCategoria.addEventListener("change", aplicarFiltros);
}

// ---------- CARGA INICIAL ----------

async function cargarProductos() {
  try {
    // OJO: tu productos.json está en la RAÍZ del repo
    // desde catalogo.html la ruta correcta es "./productos.json"
    const resp = await fetch("./productos.json");

    if (!resp.ok) {
      throw new Error("No se pudo cargar productos.json");
    }

    const data = await resp.json();

    // puede venir como array directo o como { productos: [...] }
    TODOS_LOS_PRODUCTOS = Array.isArray(data) ? data : (data.productos || []);

    // si existe un select de categorías lo llenamos
    if (filtroCategoria) {
      const categoriasUnicas = Array.from(
        new Set(
          TODOS_LOS_PRODUCTOS.map(p =>
            safe(p.categoria || p.rubro || p.cat, "").toString()
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

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:white; padding:1rem;">Error cargando productos.</p>`;
  }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", cargarProductos);
