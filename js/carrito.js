// ========================================
//  LÓGICA DE CARRITO (página carrito.html)
//  Usa el mismo localStorage que el catálogo
// ========================================

const CLAVE_CARRITO = "dm_carrito";

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

// Mini carrito (globito)
function actualizarMiniCarrito() {
  const carrito = leerCarrito();
  const miniCantidad = document.getElementById("mini-carrito-cantidad");
  const miniTotal    = document.getElementById("mini-carrito-total");

  const totalProductos = carrito.reduce((acc, p) => acc + (p.cantidad || 0), 0);
  const totalPrecio = carrito.reduce((acc, p) => {
    const precio = Number(p.precio) || 0;
    return acc + precio * (p.cantidad || 0);
  }, 0);

  if (miniCantidad) miniCantidad.textContent = totalProductos;
  if (miniTotal)    miniTotal.textContent    = totalPrecio.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function irAlCarrito() {
  // ya estamos en carrito, pero por si se usa desde otro lado:
  window.location.href = "carrito.html";
}

// Pintar la lista en carrito.html
function cargarCarritoPagina() {
  const contenedor = document.getElementById("carrito");
  const carrito = leerCarrito();

  if (!contenedor) return;

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <p>Tu carrito está vacío.</p>
        <a href="catalogo.html" class="btn-volver">← Ver catálogo</a>
      </div>
    `;
    actualizarMiniCarrito();
    return;
  }

  let total = 0;
  let totalItems = 0;

  const htmlItems = carrito.map(item => {
    const precio = Number(item.precio) || 0;
    const subtotal = precio * (item.cantidad || 0);
    total += subtotal;
    totalItems += item.cantidad || 0;

    const precioTxt   = precio ? `$ ${precio.toLocaleString("es-AR", { minimumFractionDigits: 0 })}` : "Consultar";
    const subtotalTxt = subtotal ? `$ ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 0 })}` : "—";

    return `
      <div class="item-carrito">
        <div class="item-carrito-descripcion">
          <div><strong>${item.codigo}</strong> - ${item.nombre || ""}</div>
          <div class="item-carrito-stock">${precioTxt}</div>
        </div>
        <div class="item-carrito-controles">
          <div class="item-carrito-cant">
            <button type="button" onclick="restarCantidad('${item.codigo}')">−</button>
            <span>${item.cantidad}</span>
            <button type="button" onclick="sumarCantidad('${item.codigo}')">+</button>
          </div>
          <div class="item-carrito-precios">
            <span>Subtotal: ${subtotalTxt}</span>
          </div>
          <button type="button" class="btn-eliminar" onclick="eliminarDelCarrito('${item.codigo}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
  }).join("");

  contenedor.innerHTML = `
    <div class="carrito-lista">
      ${htmlItems}
    </div>
    <div class="total-carrito">
      <strong>Total (${totalItems} productos):</strong>
      <div>$ ${total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}</div>
    </div>
  `;

  actualizarMiniCarrito();
}

// Operaciones sobre cantidades
function sumarCantidad(codigo) {
  let carrito = leerCarrito();
  const idx = carrito.findIndex(p => p.codigo === codigo);
  if (idx >= 0) {
    carrito[idx].cantidad += 1;
    guardarCarrito(carrito);
    cargarCarritoPagina();
  }
}

function restarCantidad(codigo) {
  let carrito = leerCarrito();
  const idx = carrito.findIndex(p => p.codigo === codigo);
  if (idx >= 0) {
    if (carrito[idx].cantidad > 1) {
      carrito[idx].cantidad -= 1;
    } else {
      carrito.splice(idx, 1);
    }
    guardarCarrito(carrito);
    cargarCarritoPagina();
  }
}

function eliminarDelCarrito(codigo) {
  let carrito = leerCarrito();
  carrito = carrito.filter(p => p.codigo !== codigo);
  guardarCarrito(carrito);
  cargarCarritoPagina();
}

// Enviar el pedido por WhatsApp
function enviarCarritoWhatsApp() {
  const carrito = leerCarrito();
  if (!carrito.length) {
    alert("Tu carrito está vacío");
    return;
  }

  const lineas = [
    "Hola! Te paso mi pedido mayorista:",
    ""
  ];

  carrito.forEach(item => {
    const precio = Number(item.precio) || 0;
    const subtotal = precio * (item.cantidad || 0);
    const subtotalTxt = subtotal
      ? `$ ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`
      : "Consultar";

    lineas.push(
      `• ${item.codigo} - ${item.nombre || ""} x ${item.cantidad} (${subtotalTxt})`
    );
  });

  const total = carrito.reduce((acc, p) => {
    const precio = Number(p.precio) || 0;
    return acc + precio * (p.cantidad || 0);
  }, 0);

  if (total) {
    lineas.push("", `Total aprox: $ ${total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`);
  }

  lineas.push("", "¿Me confirmás disponibilidad y cantidades mínimas?");

  const mensaje = encodeURIComponent(lineas.join("\n"));

  // Cambiá el número por el tuyo
  const url = `https://wa.me/54911XXXXXXXX?text=${mensaje}`;
  window.open(url, "_blank");
}

// Inicialización en carrito.html
document.addEventListener("DOMContentLoaded", () => {
  cargarCarritoPagina();
  actualizarMiniCarrito();
});
