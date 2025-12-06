// URL base de las imágenes en GitHub
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

// Elementos del DOM
const grid = document.getElementById("grid-productos");
const buscador = document.getElementById("buscador");
const categoriaSelect = document.getElementById("categoria");

let productos = [];

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
    ...new Set(productos.map(p => p["Categoria Princ"]).filter(Boolean))
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
  let triedLower = false;

  const codigo = p["Codigo"];

  img.src = `${BASE_IMG}/${codigo}.JPG`;
  img.alt = p["Nombre Corto"] || codigo;
  img.loading = "lazy";

  img.onerror = () => {
    if (!triedLower) {
      triedLower = true;
      img.onerror = () => {
        wrapper.textContent = "Sin imagen";
        img.remove();
      };
      img.src = `${BASE_IMG}/${codigo}.jpg`;
    } else {
      wrapper.textContent = "Sin imagen";
      img.remove();
    }
  };

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
    const codigo = p["Codigo"];
    const nombreCorto = p["Nombre Corto"];
    const descLarga = p["Descripción Larga"] || "";
    const categoriaTexto = p["Categoria Princ"];

    const precioRaw = String(p["Precio Mayorista"] || "").trim();
    const precioNumero = precioRaw
      ? parseFloat(precioRaw.replace(".", "").replace(",", "."))
      : 0;
    const precioFormateado = precioNumero
      ? precioNumero.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : "";

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
    desc.textContent = descLarga;

    const precio = document.createElement("p");
    precio.className = "precio";
    if (precioFormateado) {
      precio.textContent = `$ ${precioFormateado}`;
    }

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
    const codigo = (p["Codigo"] || "").toLowerCase();
    const nombre = (p["Nombre Corto"] || "").toLowerCase();
    const desc = (p["Descripción Larga"] || "").toLowerCase();
    const categoriaProd = p["Categoria Princ"] || "";

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
