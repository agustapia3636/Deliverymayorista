// Elementos del DOM
const grid = document.getElementById("grid-productos");
const buscador = document.getElementById("buscador");
const categoriaSelect = document.getElementById("categoria");

let productos = [];

// ===============================
// Helper para cargar imágenes desde tu repo
// ===============================
function configurarImagenPorCodigo(img, codigo, onFalloTotal) {
  const urls = [
    `https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main/${codigo}.jpg`,
    `https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main/${codigo}.JPG`,
    `https://agustapia3636.github.io/deliverymayorista-img/${codigo}.jpg`,
    `https://agustapia3636.github.io/deliverymayorista-img/${codigo}.JPG`,
  ];

  let idx = 0;

  const intentar = () => {
    if (idx >= urls.length) {
      if (onFalloTotal) onFalloTotal();
      return;
    }
    img.src = urls[idx++];
  };

  img.onerror = intentar;
  intentar();
}

// ===============================
// Cargar productos desde productos.json
// ===============================
async function cargarProductos() {
  try {
    const respuesta = await fetch("productos.json");
    productos = await respuesta.json();

    poblarCategorias();
    renderizarProductos(productos);
  } catch (error) {
    console.error("Error cargando productos:", error);
    grid.innerHTML = "<p>Error al cargar el catálogo.</p>";
  }
}

// ===============================
// Llenar el select de categorías
// ===============================
function poblarCategorias() {
  const categorias = [
    ...new Set(productos.map(p => p.categoria).filter(Boolean))
  ];
  categorias.sort();

  categorias.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoriaSelect.appendChild(opt);
  });
}

// ===============================
// Crear la imagen de cada producto
// ===============================
function crearImagenProducto(p) {
  const wrapper = document.createElement("div");
  wrapper.className = "img-placeholder";

  const img = document.createElement("img");
  img.alt = p.nombre_corto || p.codigo;
  img.loading = "lazy";

  configurarImagenPorCodigo(img, p.codigo, () => {
    wrapper.textContent = "Sin imagen";
    img.remove();
  });

  wrapper.appendChild(img);
  return wrapper;
}

// ===============================
// Pintar las tarjetas de productos
// ===============================
function renderizarProductos(lista) {
  if (!lista.length) {
    grid.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  grid.innerHTML = "";

  lista.forEach(p => {
    const codigo = p.codigo;
    const nombreCorto = p.nombre_corto;
    const descLarga = p.descripcion_larga || "";
    const categoriaTexto = p.categoria;

    const precioNumero = Number(p.precio) || 0;
    const precioFormateado = precioNumero.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const card = document.createElement("article");
    card.className = "card-producto";
    card.style.cursor = "pointer";

    // Click → ficha de producto
    card.addEventListener("click", () => {
      window.location.href = `producto.html?codigo=${encodeURIComponent(
        codigo
      )}`;
    });

    const imgWrapper = crearImagenProducto(p);

    const cuerpo = document.createElement("div");
    cuerpo.className = "card-body";

    const titulo = document.createElement("h2");
    titulo.textContent = `${codigo} - ${nombreCorto}`;

    const desc = document.createElement("p");
    desc.className = "descripcion";
    const resumen =
      descLarga.length > 160 ? descLarga.slice(0, 157) + "..." : descLarga;
    desc.textContent = resumen;

    const precio = document.createElement("p");
    precio.className = "precio";
    precio.textContent = `$ ${precioFormateado}`;

    const categoria = document.createElement("p");
    categoria.className = "categoria";
    if (categoriaTexto) {
      categoria.textContent = categoriaTexto;
    }

    cuerpo.appendChild(titulo);
    cuerpo.appendChild(desc);
    cuerpo.appendChild(precio);
    cuerpo.appendChild(categoria);

    card.appendChild(imgWrapper);
    card.appendChild(cuerpo);
    grid.appendChild(card);
  });
}

// ===============================
// Filtros
// ===============================
function aplicarFiltros() {
  const texto = buscador.value.toLowerCase().trim();
  const cat = categoriaSelect.value;

  const filtrados = productos.filter(p => {
    const codigo = (p.codigo || "").toLowerCase();
    const nombre = (p.nombre_corto || "").toLowerCase();
    const desc = (p.descripcion_larga || "").toLowerCase();
    const categoriaProd = p.categoria || "";

    const coincideTexto =
      !texto ||
      codigo.includes(texto) ||
      nombre.includes(texto) ||
      desc.includes(texto);

    const coincideCat = !cat || categoriaProd === cat;

    return coincideTexto && coincideCat;
  });

  renderizarProductos(filtrados);
}

buscador.addEventListener("input", aplicarFiltros);
categoriaSelect.addEventListener("change", aplicarFiltros);

// Ejecutar carga inicial
cargarProductos();
