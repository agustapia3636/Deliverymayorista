// Helper reutilizado para cargar imágenes
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

async function cargarProducto() {
  try {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("codigo");

    if (!codigo) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Falta el código en la URL.</p>";
      return;
    }

    const resp = await fetch("productos.json");
    if (!resp.ok) {
      throw new Error("No se pudo cargar productos.json: " + resp.status);
    }

    const productos = await resp.json();
    const index = productos.findIndex(p => p.codigo === codigo);

    if (index === -1) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Verificá el código.</p>";
      return;
    }

    const prod = productos[index];

    // Imagen principal
    const imgPrincipal = document.getElementById("imagen-principal");
    imgPrincipal.alt = prod.nombre_corto || prod.codigo;
    configurarImagenPorCodigo(imgPrincipal, prod.codigo, () => {
      imgPrincipal.src = "";
    });

    // Info
    const precioNumero = Number(prod.precio) || 0;
    const precioFormateado = precioNumero.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const info = document.getElementById("producto-info");
    info.innerHTML = `
      <p class="producto-codigo">${prod.codigo}</p>
      <h1 class="producto-titulo">${prod.nombre_corto}</h1>
      <p class="producto-categoria">${prod.categoria || ""}</p>
      <p class="producto-descripcion">
        ${prod.descripcion_larga || ""}
      </p>
      <p class="producto-precio">
        <span class="moneda">$</span> ${precioFormateado}
      </p>

      <div class="producto-acciones">
        <a href="catalogo.html" class="btn-secundario">← Volver al catálogo</a>
        <a
          href="https://wa.me/54XXXXXXXXXX?text=Hola,%20quiero%20consultar%20por%20el%20producto%20${encodeURIComponent(
            prod.codigo + " - " + prod.nombre_corto
          )}"
          target="_blank"
          class="btn-whatsapp"
        >
          Consultar por WhatsApp
        </a>
      </div>
    `;

    // Navegación
    const nav = document.getElementById("producto-nav");
    const anterior = productos[index - 1];
    const siguiente = productos[index + 1];

    let navHTML = "";

    if (anterior) {
      navHTML += `
        <a href="producto.html?codigo=${anterior.codigo}" class="nav-btn">
          ← ${anterior.codigo}
        </a>
      `;
    } else {
      navHTML += `<span class="nav-btn nav-btn--disabled">← Anterior</span>`;
    }

    navHTML += `
      <a href="catalogo.html" class="nav-btn">Volver al listado</a>
    `;

    if (siguiente) {
      navHTML += `
        <a href="producto.html?codigo=${siguiente.codigo}" class="nav-btn">
          ${siguiente.codigo} →
        </a>
      `;
    } else {
      navHTML += `<span class="nav-btn nav-btn--disabled">Siguiente →</span>`;
    }

    nav.innerHTML = navHTML;

  } catch (err) {
    console.error(err);
    document.getElementById("producto-info").innerHTML =
      "<h2>Ups, hubo un error</h2><p>Probá recargar la página.</p>";
  }
}

cargarProducto();
