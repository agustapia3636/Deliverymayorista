// ========================================
//  LÓGICA DE CARRITO (catálogo + carrito)
// ========================================

const CLAVE_CARRITO = "dm_carrito";

// 👉 REEMPLAZAR por tu número en formato internacional SIN + ni 00
// Ejemplo Argentina: 549261XXXXXXX
const TELEFONO_WHATSAPP = "5492610000000";

// Claves detectadas dinámicamente a partir del primer item
let KEY_DESC = null;
let KEY_CODIGO = null;
let KEY_PRECIO = null;
let KEY_CANTIDAD = null;
let KEY_STOCK = null;
let KEY_IMG = null;

// ----------------------------
// Utilidades generales
// ----------------------------
function leerCarrito() {
  try {
    const data = localStorage.getItem(CLAVE_CARRITO);
    if (!data) return [];
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("Error leyendo carrito:", e);
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  actualizarMiniCarrito();
}

function formatearNumero(n) {
  if (!Number.isFinite(n)) n = 0;
  return Math.round(n).toLocaleString("es-AR");
}

function detectarClaves(item) {
  if (!item || typeof item !== "object") return;

  const keys = Object.keys(item).map(k => k.toLowerCase());

  function encontrar(candidatos) {
    for (const c of candidatos) {
      const idx = keys.indexOf(c.toLowerCase());
      if (idx !== -1) return Object.keys(item)[idx];
    }
    return null;
  }

  // Descripción
  KEY_DESC = encontrar(["descripcion", "descripcion_larga", "nombre", "titulo", "desc"]) || "descripcion";
  // Código
  KEY_CODIGO = encontrar(["codigo", "cod", "sku", "id"]);
  // Precio unitario
  KEY_PRECIO = encontrar(["precio", "preciolista", "precio_lista", "price", "unitario", "punitario"]);
  // Cantidad
  KEY_CANTIDAD = encontrar(["cantidad", "qty", "cant"]);
  // Stock
  KEY_STOCK = encontrar(["stock", "existencia", "disponible"]);
  // Imagen
  KEY_IMG = encontrar(["imagen", "img", "foto"]);
}

function obtenerValor(item, key, def) {
  if (!key || !(key in item)) return def;
  return item[key] ?? def;
}

function setCantidad(item, nuevaCant) {
  if (!KEY_CANTIDAD) {
    // si no existía, la creamos como "cantidad"
    KEY_CANTIDAD = "cantidad";
  }
  item[KEY_CANTIDAD] = nuevaCant;
}

// ----------------------------
// Mini carrito (icono flotante)
// ----------------------------
function calcularTotales(carrito) {
  let totalItems = 0;
  let totalGeneral = 0;

  carrito.forEach(it => {
    const cant = Number(obtenerValor(it, KEY_CANTIDAD, 1)) || 1;
    const precio = Number(obtenerValor(it, KEY_PRECIO, 0)) || 0;
    totalItems += cant;
    totalGeneral += cant * precio;
  });

  return { totalItems, totalGeneral };
}

function actualizarMiniCarrito() {
  const carrito = leerCarrito();
  const qtyEl = document.getElementById("mini-carrito-cantidad");
  const totalEl = document.getElementById("mini-carrito-total");

  if (carrito.length === 0) {
    if (qtyEl) qtyEl.textContent = "0";
    if (totalEl) totalEl.textContent = "0";
    return;
  }

  if (!KEY_DESC) detectarClaves(carrito[0]);

  const { totalItems, totalGeneral } = calcularTotales(carrito);

  if (qtyEl) qtyEl.textContent = totalItems;
  if (totalEl) totalEl.textContent = formatearNumero(totalGeneral);
}

function irAlCarrito() {
  window.location.href = "carrito.html";
}

// ----------------------------
// Pintar página de carrito
// ----------------------------
function renderCarritoPagina() {
  const contenedor = document.getElementById("carrito");
  if (!contenedor) return; // No estamos en carrito.html

  const carrito = leerCarrito();

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        Tu carrito está vacío.<br>
        Agregá productos desde el catálogo para verlos acá.
      </div>
    `;
    actualizarMiniCarrito();
    return;
  }

  // Detectar claves según primer item
  if (!KEY_DESC || !KEY_PRECIO) {
    detectarClaves(carrito[0]);
  }

  const { totalItems, totalGeneral } = calcularTotales(carrito);

  let html = `<div class="carrito-lista">`;

  carrito.forEach((item, index) => {
    const desc = String(obtenerValor(item, KEY_DESC, "Producto sin descripción"));
    const cod = obtenerValor(item, KEY_CODIGO, "") || "";
    const cant = Number(obtenerValor(item, KEY_CANTIDAD, 1)) || 1;
    const stock = obtenerValor(item, KEY_STOCK, null);
    const precio = Number(obtenerValor(item, KEY_PRECIO, 0)) || 0;
    const subtotal = cant * precio;
    const img = obtenerValor(item, KEY_IMG, null);

    html += `
      <div class="item-carrito" data-index="${index}">
        <div class="item-carrito-top">
          ${img ? `
            <div class="item-carrito-img">
              <img src="${img}" alt="${desc}">
            </div>
          ` : ""}

          <div class="item-carrito-info">
            <div class="item-carrito-descripcion">${desc}</div>
            ${cod ? `<div class="item-carrito-codigo">Cod: ${cod}</div>` : ""}
            ${stock !== null && stock !== undefined && stock !== "" ? `
              <div class="item-carrito-stock">Stock disponible: ${stock}</div>
            ` : ""}
          </div>
        </div>

        <div class="item-carrito-controles">
          <div class="item-carrito-cant">
            <button type="button" class="btn-restar" data-index="${index}">-</button>
            <span class="item-carrito-cant-valor" id="cant-${index}">${cant}</span>
            <button type="button" class="btn-sumar" data-index="${index}">+</button>
          </div>

          <div class="item-carrito-precios">
            <span>Unitario: $${formatearNumero(precio)}</span>
            <span><strong>Subtotal: $${formatearNumero(subtotal)}</strong></span>
          </div>

          <button type="button" class="btn-eliminar" data-index="${index}">
            Eliminar
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`; // cierre carrito-lista

  html += `
    <div class="total-carrito">
      Total (${totalItems} productos): 
      <span>$${formatearNumero(totalGeneral)}</span>
      <div class="total-carrito-nota">
        Total estimado sujeto a stock y últimas actualizaciones.
      </div>
    </div>
  `;

  contenedor.innerHTML = html;

  // Eventos botones + / - / eliminar
  contenedor.querySelectorAll(".btn-sumar").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      cambiarCantidad(index, +1);
    });
  });

  contenedor.querySelectorAll(".btn-restar").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      cambiarCantidad(index, -1);
    });
  });

  contenedor.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      eliminarItem(index);
    });
  });

  actualizarMiniCarrito();
}

// ----------------------------
// Acciones sobre ítems
// ----------------------------
function cambiarCantidad(index, delta) {
  const carrito = leerCarrito();
  if (!carrito[index]) return;

  if (!KEY_DESC || !KEY_PRECIO) detectarClaves(carrito[0]);

  const item = carrito[index];
  let cantActual = Number(obtenerValor(item, KEY_CANTIDAD, 1)) || 1;
  let nuevaCant = cantActual + delta;

  if (nuevaCant < 1) nuevaCant = 1;

  const stock = obtenerValor(item, KEY_STOCK, null);
  if (stock !== null && stock !== undefined && stock !== "") {
    const stockNum = Number(stock);
    if (Number.isFinite(stockNum) && nuevaCant > stockNum) {
      nuevaCant = stockNum;
    }
  }

  setCantidad(item, nuevaCant);
  guardarCarrito(carrito);
  renderCarritoPagina();
}

function eliminarItem(index) {
  const carrito = leerCarrito();
  if (!carrito[index]) return;
  carrito.splice(index, 1);
  guardarCarrito(carrito);
  renderCarritoPagina();
}

function vaciarCarrito() {
  if (!confirm("¿Vaciar todo el carrito?")) return;
  localStorage.removeItem(CLAVE_CARRITO);
  renderCarritoPagina();
  actualizarMiniCarrito();
}

// ----------------------------
// WhatsApp
// ----------------------------
function enviarCarritoWhatsApp() {
  const carrito = leerCarrito();
  if (carrito.length === 0) {
    alert("Tu carrito está vacío. Agregá productos desde el catálogo.");
    return;
  }

  if (!KEY_DESC || !KEY_PRECIO) detectarClaves(carrito[0]);
  const { totalItems, totalGeneral } = calcularTotales(carrito);

  const lineas = [];
  lineas.push("Hola! Quiero hacer este pedido mayorista desde la web Delivery Mayorista:");
  lineas.push("");

  carrito.forEach(item => {
    const desc = String(obtenerValor(item, KEY_DESC, "Producto sin descripción"));
    const cod = obtenerValor(item, KEY_CODIGO, "");
    const cant = Number(obtenerValor(item, KEY_CANTIDAD, 1)) || 1;
    const precio = Number(obtenerValor(item, KEY_PRECIO, 0)) || 0;
    const subtotal = cant * precio;

    let linea = `• ${cant} x ${desc}`;
    if (cod) linea += ` (Cod: ${cod})`;
    linea += ` - $${formatearNumero(subtotal)}`;

    lineas.push(linea);
  });

  lineas.push("");
  lineas.push(`Total estimado (${totalItems} productos): $${formatearNumero(totalGeneral)}`);
  lineas.push("");
  lineas.push("Datos del cliente:");
  lineas.push("- Nombre / Comercio:");
  lineas.push("- Localidad / Zona:");
  lineas.push("- Forma de entrega / retiro:");

  const mensaje = encodeURIComponent(lineas.join("\n"));

  if (!TELEFONO_WHATSAPP || TELEFONO_WHATSAPP === "5492610000000") {
    alert("⚠️ Falta configurar el número de WhatsApp en carrito.js (const TELEFONO_WHATSAPP).");
    return;
  }

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${mensaje}`;
  window.open(url, "_blank");
}

// ----------------------------
// Inicio
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderCarritoPagina();
  actualizarMiniCarrito();
});

// ----------------------------
// (Opcional) desde catálogo
// ----------------------------
function agregarAlCarrito(producto) {
  const carrito = leerCarrito();

  // Detectar claves si hace falta
  if (!KEY_DESC && producto) {
    detectarClaves(producto);
  }

  const cod = producto && KEY_CODIGO ? producto[KEY_CODIGO] : null;

  if (cod !== null && cod !== undefined) {
    const idx = carrito.findIndex(it => KEY_CODIGO && it[KEY_CODIGO] === cod);
    if (idx !== -1) {
      // Ya existe, sumamos 1
      const item = carrito[idx];
      const cantActual = Number(obtenerValor(item, KEY_CANTIDAD, 1)) || 1;
      setCantidad(item, cantActual + 1);
      guardarCarrito(carrito);
      actualizarMiniCarrito();
      return;
    }
  }

  // Si no existía, lo agregamos con cantidad 1
  const nuevo = { ...producto };
  if (!KEY_CANTIDAD) KEY_CANTIDAD = "cantidad";
  nuevo[KEY_CANTIDAD] = 1;

  carrito.push(nuevo);
  guardarCarrito(carrito);
  actualizarMiniCarrito();
}
