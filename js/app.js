// ===============================
//  DATOS DE PRODUCTOS
// ===============================

const productos = [
  {
    codigo: "N0247",
    nombre: "LLAVERO SILICONA CRYBABY",
    descripcion: 'Llavero de silicona con diseño "Crybaby". Ideal para mochilas y llaves.',
    precio: 1992,
    stock: 10,
    imagen: "img/llavero-crybaby.png" // CAMBIAR por tu ruta real
  },
  {
    codigo: "N0001",
    nombre: "AURICULAR P47",
    descripcion: "Auricular inalámbrico Bluetooth, plegable y recargable.",
    precio: 5999,
    stock: 25,
    imagen: "img/auricular-p47.png"
  }
  // Agregá más productos acá...
];

// carrito: objeto por código de producto
let carrito = {};


// ===============================
//  RENDER DEL CATÁLOGO
// ===============================

function renderCatalogo() {
  const catalogo = document.getElementById("catalogo");
  if (!catalogo) return;

  catalogo.innerHTML = "";

  productos.forEach(prod => {
    const article = document.createElement("article");
    article.className = "card-producto";
    article.dataset.codigo = prod.codigo;

    article.innerHTML = `
      <div class="img-placeholder">
        <img src="${prod.imagen}" alt="${prod.nombre}">
      </div>

      <div class="card-body">
        <h2>${prod.codigo} - ${prod.nombre}</h2>

        <p class="descripcion">
          ${prod.descripcion}
        </p>

        <p class="precio">$ ${prod.precio.toLocaleString("es-AR")}</p>

        <p class="stock-text" data-stock="${prod.stock}">
          Stock: ${prod.stock} unidades
        </p>

        <div class="cantidad-container">
          <button class="btn-cantidad menos">−</button>
          <input type="number"
                 class="input-cantidad"
                 value="1"
                 min="1"
                 max="${prod.stock}">
          <button class="btn-cantidad mas">+</button>
        </div>

        <button class="btn-agregar-carrito">Agregar al carrito</button>
      </div>
    `;

    catalogo.appendChild(article);
  });
}


// ===============================
//  CANTIDAD + STOCK EN TIEMPO REAL
// ===============================

function configurarCantidadYStock() {
  document.querySelectorAll(".card-producto").forEach(card => {
    const input = card.querySelector(".input-cantidad");
    const stockText = card.querySelector(".stock-text");
    if (!input || !stockText) return;

    const stockInicial = parseInt(stockText.dataset.stock);
    const max = parseInt(input.max) || stockInicial;

    function actualizarStockVisible() {
      let cantidad = parseInt(input.value) || 1;

      if (cantidad < 1) cantidad = 1;
      if (cantidad > max) cantidad = max;

      input.value = cantidad;

      const restante = stockInicial - cantidad;
      stockText.textContent = `Stock: ${restante} unidades`;
    }

    // botón +
    const btnMas = card.querySelector(".btn-cantidad.mas");
    const btnMenos = card.querySelector(".btn-cantidad.menos");

    if (btnMas) {
      btnMas.addEventListener("click", () => {
        let valor = parseInt(input.value) || 1;
        if (valor < max) valor++;
        input.value = valor;
        actualizarStockVisible();
      });
    }

    // botón -
    if (btnMenos) {
      btnMenos.addEventListener("click", () => {
        let valor = parseInt(input.value) || 1;
        if (valor > 1) valor--;
        input.value = valor;
        actualizarStockVisible();
      });
    }

    // si escribe a mano
    input.addEventListener("input", actualizarStockVisible);

    // valor inicial
    actualizarStockVisible();
  });
}


// ===============================
//  CARRITO FLOTANTE (RESUMEN)
// ===============================

function actualizarResumenCarritoFlotante() {
  const totalItemsSpan = document.getElementById("carrito-total-items");
  if (!totalItemsSpan) return;

  let total = 0;
  for (const codigo in carrito) {
    total += carrito[codigo].cantidad;
  }
  totalItemsSpan.textContent = total;
}


// ===============================
//  BOTÓN DENTRO DE CADA CARD
// ===============================

function actualizarBotonCard(card) {
  const codigo = card.dataset.codigo;
  const btn = card.querySelector(".btn-agregar-carrito");
  if (!btn) return;

  const enCarrito = carrito[codigo]?.cantidad || 0;

  if (enCarrito > 0) {
    btn.textContent = `En carrito (${enCarrito})`;
    btn.classList.add("en-carrito");
  } else {
    btn.textContent = "Agregar al carrito";
    btn.classList.remove("en-carrito");
  }
}

function configurarBotonesAgregar() {
  document.querySelectorAll(".card-producto").forEach(card => {
    const btn = card.querySelector(".btn-agregar-carrito");
    const input = card.querySelector(".input-cantidad");
    const stockText = card.querySelector(".stock-text");
    if (!btn || !input || !stockText) return;

    const stockInicial = parseInt(stockText.dataset.stock);

    btn.addEventListener("click", () => {
      const codigo = card.dataset.codigo;
      const producto = productos.find(p => p.codigo === codigo);
      if (!producto) return;

      let cantidad = parseInt(input.value) || 1;

      if (cantidad < 1) cantidad = 1;
      if (cantidad > stockInicial) cantidad = stockInicial;

      // inicializa si no existe
      if (!carrito[codigo]) {
        carrito[codigo] = {
          producto: producto,
          cantidad: 0
        };
      }

      carrito[codigo].cantidad += cantidad;

      // no superar stock total
      if (carrito[codigo].cantidad > stockInicial) {
        carrito[codigo].cantidad = stockInicial;
      }

      actualizarBotonCard(card);
      actualizarResumenCarritoFlotante();
    });

    // estado inicial
    actualizarBotonCard(card);
  });
}


// ===============================
//  INICIALIZACIÓN
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  renderCatalogo();              // pinta las cards
  configurarCantidadYStock();    // activa [-] 1 [+] + stock dinámico
  configurarBotonesAgregar();    // suma al carrito y cambia texto del botón
  actualizarResumenCarritoFlotante(); // actualiza burbuja del carrito flotante
});
