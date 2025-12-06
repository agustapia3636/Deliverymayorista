// -----------------------------------------
// CARRITO DELIVERY MAYORISTA (global)
// -----------------------------------------

let carrito = [];

// Cargar carrito desde localStorage
function cargarCarrito() {
  try {
    const data = localStorage.getItem("carritoDM");
    carrito = data ? JSON.parse(data) : [];
  } catch (e) {
    carrito = [];
  }
}

// Guardar carrito
function guardarCarrito() {
  localStorage.setItem("carritoDM", JSON.stringify(carrito));
}

// Formatear precio (sin decimales)
function formatearPrecio(valor) {
  return Math.round(valor).toLocaleString("es-AR");
}

// Totales
function calcularTotales() {
  let cantidad = 0;
  let total = 0;

  carrito.forEach(item => {
    cantidad += item.cantidad;
    total += item.cantidad * item.precio;
  });

  return { cantidad, total };
}

// Actualizar mini carrito flotante
function actualizarMiniCarrito() {
  const cantSpan = document.getElementById("mini-carrito-cantidad");
  const totalSpan = document.getElementById("mini-carrito-total");
  const mini = document.getElementById("mini-carrito");

  if (!cantSpan || !totalSpan || !mini) return;

  const { cantidad, total } = calcularTotales();

  cantSpan.textContent = cantidad;
  totalSpan.textContent = formatearPrecio(total);

  mini.style.display = "flex";
}

// Agregar producto al carrito
function addToCart(codigo, descripcion, precio, stock) {
  cargarCarrito(); // por si otra pestaña lo modificó

  precio = Number(precio) || 0;
  stock = Number(stock) || 0;

  let item = carrito.find(p => p.codigo === codigo);

  if (item) {
    if (stock === 0 || item.cantidad < stock) {
      item.cantidad++;
    } else {
      alert("No hay más stock disponible de este producto.");
      return;
    }
  } else {
    if (stock === 0) {
      // Si no manejás stock en ese producto, igual lo dejamos agregar
      stock = 9999;
    }

    carrito.push({
      codigo,
      descripcion,
      precio,
      cantidad: 1,
      stock
    });
  }

  guardarCarrito();
  renderCarrito();
  actualizarMiniCarrito();
}

// Disminuir cantidad
function disminuir(codigo) {
  let item = carrito.find(p => p.codigo === codigo);
  if (!item) return;

  if (item.cantidad > 1) {
    item.cantidad--;
  } else {
    carrito = carrito.filter(p => p.codigo !== codigo);
  }

  guardarCarrito();
  renderCarrito();
  actualizarMiniCarrito();
}

// Eliminar producto del carrito
function eliminar(codigo) {
  carrito = carrito.filter(p => p.codigo !== codigo);
  guardarCarrito();
  renderCarrito();
  actualizarMiniCarrito();
}

// Render de la página del carrito (carrito.html)
function renderCarrito() {
  const contenedor = document.getElementById("carrito");
  if (!contenedor) {
    // No estoy en carrito.html, solo actualizo mini carrito
    actualizarMiniCarrito();
    return;
  }

  cargarCarrito();
  contenedor.innerHTML = "";

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

  const lista = document.createElement("div");
  lista.classList.add("carrito-lista");

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;

    const fila = document.createElement("div");
    fila.classList.add("item-carrito");

    fila.innerHTML = `
      <div class="item-carrito-descripcion">
        <strong>${item.descripcion}</strong><br>
        <span class="item-carrito-codigo">Código: ${item.codigo}</span><br>
        <span class="item-carrito-stock">Stock: ${item.stock}</span>
      </div>

      <div class="item-carrito-controles">
        <div class="item-carrito-cant">
          <button type="button" onclick="disminuir('${item.codigo}')">-</button>
          <span>${item.cantidad}</span>
          <button type="button" onclick="addToCart('${item.codigo}','${item.descripcion}',${item.precio},${item.stock})">+</button>
        </div>
        <div class="item-carrito-precios">
          <span>$${formatearPrecio(item.precio)} c/u</span>
          <span>Subtotal: $${formatearPrecio(subtotal)}</span>
        </div>
        <button type="button" class="btn-eliminar" onclick="eliminar('${item.codigo}')">Quitar</button>
      </div>
    `;

    lista.appendChild(fila);
  });

  const { total } = calcularTotales();

  const totalDiv = document.createElement("div");
  totalDiv.classList.add("total-carrito");
  totalDiv.innerHTML = `
    <hr>
    <h2>Total: $${formatearPrecio(total)}</h2>
  `;

  contenedor.appendChild(lista);
  contenedor.appendChild(totalDiv);
}

// Ir a la página del carrito
function irAlCarrito() {
  window.location.href = "carrito.html";
}

// Generar texto para WhatsApp
function generarTextoCarrito() {
  cargarCarrito();

  if (!carrito.length) return "";

  const { total } = calcularTotales();

  let lineas = [];
  lineas.push("🛒 Pedido Delivery Mayorista");
  lineas.push("");
  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    lineas.push(
      `• x${item.cantidad} ${item.descripcion} (${item.codigo}) - $${formatearPrecio(
        item.precio
      )} c/u = $${formatearPrecio(subtotal)}`
    );
  });
  lineas.push("");
  lineas.push(`Total: $${formatearPrecio(total)}`);

  return encodeURIComponent(lineas.join("\n"));
}

// Enviar carrito por WhatsApp
function enviarCarritoWhatsApp() {
  cargarCarrito();

  if (!carrito.length) {
    alert("Tu carrito está vacío.");
    return;
  }

  const texto = generarTextoCarrito();
  const url = "https://wa.me/?text=" + texto;
  window.open(url, "_blank");
}

// Inicialización general
window.addEventListener("DOMContentLoaded", function () {
  cargarCarrito();
  renderCarrito();
  actualizarMiniCarrito();
});
