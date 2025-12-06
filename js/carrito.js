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
    detectarClaves(carrit
