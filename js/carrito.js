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

  // De momento lo dejamos siempre visible
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
  actualizarMiniCarrito();
}

// Eliminar producto del carrito
function eliminar(codigo) {
  carrito = carrito.filter(p => p.codigo !== codigo);
  guardarCarrito();
  actualizarMiniCarrito();
}

// Ir a la página del carrito (la vamos a crear después)
function irAlCarrito() {
  window.location.href = "carrito.html";
}

// Inicialización general
window.addEventListener("DOMContentLoaded", function () {
  cargarCarrito();
  actualizarMiniCarrito();
});
