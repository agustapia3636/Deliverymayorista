// Mismo repo de imágenes que en el catálogo
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

async function cargarProducto() {
  try {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("codigo");
    console.log("Código en URL:", codigo);

    if (!codigo) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Falta el código en la URL.</p>";
      return;
    }

    // IMPORTANTE: productos.json está en la RAÍZ del repo
    const resp = await fetch("productos.json");
    if (!resp.ok) {
      throw new Error("No se pudo cargar productos.json: " + resp.status);
    }

    const productos = await resp.json();
    console.log("Productos cargados:", productos.length);

    const index = productos.findIndex(p => p.codigo === codigo);
    console.log("Índice encontrado:", index);

    if (index === -1) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Verificá el código.</p>";
      return;
    }

    const prod = productos[index];

    // Imagen grande
    const imgContainer = document.getElementById("producto-imagen");
    imgContainer.innerHTML = "";
    const img = document.createElement("img");
    img.src = `${BASE_IMG}/${prod.codigo}.JPG`;
    img.alt = prod.nombre_corto || prod.codigo;
    img.loading = "lazy";
    img.onerror = () => {
      img.src = `${BASE_IMG}/${prod.codigo}.jpg`;
    };
    imgContainer.appendChild(img);

    // Info del producto
    const info = document.getElementById("producto-info");
    const precioFormateado = prod.precio
      ? `$ ${Number(prod.precio).toLocaleString("es-AR", {
          minimumFractionDigits: 2,
        })}`
      : "";

    info.innerHTML = `
      <p class="producto-codigo">${prod.codigo}</p>
      <h1 class="producto-titulo">${prod.nombre_corto}</h1>
      ${
        prod.categoria
          ? `<p class="producto-categoria">${prod.categoria}</p>`
          : ""
      }
      ${
        prod.descripcion_larga
          ? `<p class="producto-descripcion">${prod.descripcion_larga}</p>`
          : ""
      }
      ${
        precioFormateado
          ? `<p class="producto-precio">${precioFormateado}</p>`
          : ""
      }
      <div class="producto-acciones">
        <a href="catalogo.html" class="btn-secundario">← Volver al catálogo</a>
        <a href="${armarLinkWhatsApp(prod)}" target="_blank" class="btn-whatsapp">
          Consultar por WhatsApp
        </a>
      </div>
    `;

    // Navegación anterior / siguiente
    const nav = document.getElementById("producto-nav");
    const anterior = productos[(index - 1 + productos.length) % productos.length];
    const siguiente = productos[(index + 1) % productos.length];

    nav.innerHTML = `
      <button class="btn-nav" onclick="irAProducto('${anterior.codigo}')">
        ← ${anterior.codigo}
      </button>
      <button class="btn-nav" onclick="window.location.href='catalogo.html'">
        Volver al listado
      </button>
      <button class="btn-nav" onclick="irAProducto('${siguiente.codigo}')">
        ${siguiente.codigo} →
      </button>
    `;
  } catch (error) {
    console.error("Error en cargarProducto:", error);
    const info = document.getElementById("producto-info");
    if (info) {
      info.innerHTML = "<h2>Error</h2><p>No se pudo cargar el producto.</p>";
    }
  }
}

function armarLinkWhatsApp(prod) {
  const precio = prod.precio
    ? `$ ${Number(prod.precio).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
      })}`
    : "—";

  const mensaje = [
    "Hola! Me interesa este producto:",
    "",
    `Código: ${prod.codigo}`,
    `Producto: ${prod.nombre_corto}`,
    `Precio mayorista: ${precio}`,
    "",
    "¿Me pasás disponibilidad y cantidades mínimas?"
  ].join("\n");

  // Más adelante podemos poner tu número fijo acá:
  // return `https://wa.me/54911TU_NUMERO?text=${encodeURIComponent(mensaje)}`;
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

function irAProducto(codigo) {
  window.location.href = `producto.html?codigo=${encodeURIComponent(codigo)}`;
}

cargarProducto();
