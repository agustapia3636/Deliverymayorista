// ================================
// CARRITO - Delivery Mayorista
// ================================

const CLAVE_CARRITO = "dm_carrito";

// CAMBIÁ ESTE NÚMERO POR TU WHATSAPP REAL
const NUMERO_WHATSAPP = "5491112345678";

// -------- UTILIDADES --------

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

function formatearPrecio(valor) {
  if (typeof valor === "string") {
    const limpio = valor.replace(/\./g, "").replace(",", ".");
    const num = Number(limpio);
    if (Number.isFinite(num)) {
      valor = num;
    }
  }
  if (typeof valor !== "number") return "0";

  return valor.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// -------- RENDER DEL CARRITO --------

function renderCarrito() {
  const contenedor = document.getElementById("carrito-lista");
  const spanTotalItems = document.getElementById("carrito-total-items");
  const spanTotalPrecio = document.getElementById("carrito-total-precio");
  const btnVaciar = document.getElementById("btn-vaciar");
  const btnWhatsapp = document.getElementById("btn-whatsapp");

  let carrito = leerCarrito();

  if (!contenedor) return;

  if (!carrito || carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <p>Tu carrito está vacío.</p>
        <a href="catalogo.html" class="btn-volver-catalogo-simple">
          ← Ir al catálogo
        </a>
      </div>
    `;

    if (spanTotalItems) spanTotalItems.textContent = "0";
    if (spanTotalPrecio) spanTotalPrecio.textContent = "0";

    if (btnVaciar) btnVaciar.disabled = true;
    if (btnWhatsapp) {
      btnWhatsapp.classList.add("btn-desactivado");
      btnWhatsapp.removeAttribute("href");
    }
    return;
  }

  // Hay productos
  if (btnVaciar) btnVaciar.disabled = false;

  contenedor.innerHTML = "";

  let totalItems = 0;
  let totalPrecio = 0;

  carrito.forEach((item, idx) => {
    const codigo = item.codigo || "";
    const nombre = item.nombre || "Producto sin nombre";
    const precio = Number(item.precio) || 0;
    const cantidad = Number(item.cantidad) || 1;
    const stock = item.stock ?? null;
    const img = item.img || "";

    totalItems += cantidad;
    totalPrecio += precio * cantidad;

    const subtotalTexto = formatearPrecio(precio * cantidad);
    const precioTexto = formatearPrecio(precio);

    const card = document.createElement("article");
    card.classList.add("carrito-item");

    card.innerHTML = `
      <div class="carrito-item-img">
        ${
          img
            ? `<img src="${img}" alt="${nombre}" loading="lazy" />`
            : `<div class="carrito-item-img-placeholder">?</div>`
        }
      </div>

      <div class="carrito-item-info">
        <h3 class="carrito-item-nombre">${nombre}</h3>
        <p class="carrito-item-codigo">Cod: ${codigo}</p>
        ${
          stock !== null && stock !== undefined
            ? `<p class="carrito-item-stock">Stock disponible: ${stock}</p>`
            : ""
        }
        <p class="carrito-item-precios">
          Unitario: $${precioTexto}<br>
          Subtotal: $${subtotalTexto}
        </p>
      </div>

      <div class="carrito-item-controles" data-index="${idx}">
        <div class="carrito-item-cant-row">
          <button class="btn-cantidad menos">−</button>
          <input
            type="number"
            class="input-cantidad"
            value="${cantidad}"
            min="1"
          />
          <button class="btn-cantidad mas">+</button>
        </div>
        <button class="btn-eliminar">Eliminar</button>
      </div>
    `;

    contenedor.appendChild(card);
  });

  if (spanTotalItems) spanTotalItems.textContent = totalItems.toString();
  if (spanTotalPrecio) spanTotalPrecio.textContent = formatearPrecio(totalPrecio);

  // Actualizar enlace de WhatsApp
  if (btnWhatsapp) {
    if (carrito.length === 0) {
      btnWhatsapp.classList.add("btn-desactivado");
      btnWhatsapp.removeAttribute("href");
    } else {
      btnWhatsapp.classList.remove("btn-desactivado");

      let texto = "Hola! Quiero hacer este pedido mayorista:%0A%0A";
      carrito.forEach((item) => {
        const codigo = item.codigo || "";
        const nombre = item.nombre || "";
        const precio = Number(item.precio) || 0;
        const cantidad = Number(item.cantidad) || 1;
        const subtotal = precio * cantidad;

        texto += `• ${codigo} - ${nombre} x ${cantidad}u = $${formatearPrecio(
          subtotal
        )}%0A`;
      });
      texto += `%0A Total productos: ${totalItems}`;
      texto += `%0A Total estimado: $${formatearPrecio(totalPrecio)}`;

      const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${texto}`;
      btnWhatsapp.href = url;
    }
  }

  // Listeners para botones +, -, eliminar
  contenedor.querySelectorAll(".carrito-item-controles").forEach((cont) => {
    const index = Number(cont.dataset.index);
    const btnMas = cont.querySelector(".btn-cantidad.mas");
    const btnMenos = cont.querySelector(".btn-cantidad.menos");
    const input = cont.querySelector(".input-cantidad");
    const btnEliminar = cont.querySelector(".btn-eliminar");

    if (!Number.isFinite(index)) return;

    const normalizarCantidad = () => {
      let valor = parseInt(input.value, 10);
      if (!Number.isFinite(valor) || valor < 1) valor = 1;

      const item = carrito[index];
      const stock = item.stock ?? null;
      if (stock !== null && Number.isFinite(Number(stock))) {
        const max = Number(stock);
        if (valor > max) valor = max;
      }

      input.value = String(valor);
      carrito[index].cantidad = valor;
      guardarCarrito(carrito);
      renderCarrito();
    };

    if (btnMas) {
      btnMas.addEventListener("click", () => {
        let valor = parseInt(input.value, 10);
        if (!Number.isFinite(valor) || valor < 1) valor = 1;
        valor++;
        input.value = String(valor);
        normalizarCantidad();
      });
    }

    if (btnMenos) {
      btnMenos.addEventListener("click", () => {
        let valor = parseInt(input.value, 10);
        if (!Number.isFinite(valor) || valor <= 1) valor = 1;
        else valor--;
        input.value = String(valor);
        normalizarCantidad();
      });
    }

    if (input) {
      input.addEventListener("input", (ev) => {
        ev.target.value = ev.target.value.replace(/\D/g, "");
      });
      input.addEventListener("blur", normalizarCantidad);
      input.addEventListener("change", normalizarCantidad);
      input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") normalizarCantidad();
      });
    }

    if (btnEliminar) {
      btnEliminar.addEventListener("click", () => {
        carrito.splice(index, 1);
        guardarCarrito(carrito);
        renderCarrito();
      });
    }
  });
}

// -------- BOTÓN VACIAR --------

function configurarBotonVaciar() {
  const btn = document.getElementById("btn-vaciar");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!confirm("¿Vaciar todo el carrito?")) return;
    localStorage.removeItem(CLAVE_CARRITO);
    renderCarrito();
  });
}

// -------- INICIALIZACIÓN --------

document.addEventListener("DOMContentLoaded", () => {
  configurarBotonVaciar();
  renderCarrito();
});