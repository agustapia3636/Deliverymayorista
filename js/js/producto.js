// URL base de imágenes (la misma que usás en el catálogo)
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main/";

// Carga de la ficha de producto
async function cargarProducto() {
  try {
    // 1) Leer código desde la URL ?codigo=N0247
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("codigo");
    console.log("Código en URL:", codigo);

    if (!codigo) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Falta el código en la URL.</p>";
      return;
    }

    // 2) Cargar productos.json (el que generaste desde el CSV)
    const resp = await fetch("productos.json");
    if (!resp.ok) {
      throw new Error("No se pudo cargar productos.json: " + resp.status);
    }

    const productos = await resp.json();
    console.log("Productos cargados:", productos.length);

    // 3) Buscar el producto por Codigo
    const index = productos.findIndex(p => p["Codigo"] === codigo);
    console.log("Índice encontrado:", index);

    if (index === -1) {
      document.getElementById("producto-info").innerHTML =
        "<h2>Producto no encontrado</h2><p>Verificá el código.</p>";
      return;
    }

    const prod = productos[index];

    // =====================
    // IMAGEN PRINCIPAL
    // =====================
    const imgPrincipal = document.getElementById("imagen-principal");
    // Suponiendo que la imagen se llama igual que el código, ej: N0247.jpg
    imgPrincipal.src = BASE_IMG + prod["Codigo"] + ".jpg";
    imgPrincipal.alt = prod["Nombre Corto"];

    // Si después querés miniaturas, acá podríamos armar más rutas.

    // =====================
    // INFORMACIÓN DEL PRODUCTO
    // =====================
    const precioRaw = String(prod["Precio Mayorista"] || "").trim();
    // Convertir "1992,2" en número 1992.2
    const precioNumero = precioRaw
      ? parseFloat(precioRaw.replace(".", "").replace(",", "."))
      : 0;

    const precioFormateado = precioNumero.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const info = document.getElementById("producto-info");
    info.innerHTML = `
      <p class="producto-codigo">${prod["Codigo"]}</p>
      <h1 class="producto-titulo">${prod["Nombre Corto"]}</h1>
      <p class="producto-categoria">${prod["Categoria Princ"]}</p>
      <p class="producto-descripcion">
        ${prod["Descripción Larga"] || ""}
      </p>
      <p class="producto-precio">
        <span class="moneda">$</span> ${precioFormateado}
      </p>

      <div class="producto-acciones">
        <a href="catalogo.html" class="btn-secundario">← Volver al catálogo</a>
        <a
          href="https://wa.me/54XXXXXXXXXX?text=Hola,%20quiero%20consultar%20por%20el%20producto%20${encodeURIComponent(
            prod["Codigo"] + " - " + prod["Nombre Corto"]
          )}"
          target="_blank"
          class="btn-whatsapp"
        >
          Consultar por WhatsApp
        </a>
      </div>
    `;

    // =====================
    // NAVEGACIÓN ANTERIOR / SIGUIENTE
    // =====================
    const nav = document.getElementById("producto-nav");
    const anterior = productos[index - 1];
    const siguiente = productos[index + 1];

    let navHTML = "";

    if (anterior) {
      navHTML += `
        <a href="producto.html?codigo=${anterior["Codigo"]}" class="nav-btn">
          ← ${anterior["Codigo"]}
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
        <a href="producto.html?codigo=${siguiente["Codigo"]}" class="nav-btn">
          ${siguiente["Codigo"]} →
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

// Ejecutar cuando carga la página
cargarProducto();
