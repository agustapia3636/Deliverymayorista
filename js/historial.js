// js/historial.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ==============================
// PARÁMETROS DE LA URL
// ==============================
const params = new URLSearchParams(window.location.search);

// Acepta ?clienteId=... o ?cliente=...
const clienteIdFromUrl =
  params.get("clienteId") || params.get("cliente") || "";

// Acepta ?clienteNombre=... o ?nombre=...
const nombreCliente =
  params.get("clienteNombre") || params.get("nombre") || "";

// ==============================
// DOM
// ==============================
const btnLogout = document.getElementById("logoutBtn");
const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");

// Contenedor de tarjetas
const listaHistorial = document.getElementById("listaHistorial");

// Filtros
const inputDesde = document.getElementById("filtroDesde");
const inputHasta = document.getElementById("filtroHasta");
const inputProducto = document.getElementById("filtroProducto");
const selectEstado = document.getElementById("filtroEstado");

// Resumen de totales (un solo bloque)
const resumenTotales = document.getElementById("resumenTotales");

// ==============================
// ESTADO EN MEMORIA
// ==============================
let ventasCliente = [];   // ventas base (todas o del cliente)
let ventasFiltradas = []; // ventas luego de aplicar filtros

// ==============================
// TÍTULO INICIAL
// ==============================
if (nombreCliente && tituloCliente) {
  tituloCliente.textContent = `Historial de compras - ${nombreCliente}`;
} else if (tituloCliente) {
  tituloCliente.textContent = "Historial de compras";
}

// ==============================
// SESIÓN
// ==============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await cargarHistorial();
});

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ==============================
// UTILS
// ==============================
function getDateFromInput(value, endOfDay = false) {
  if (!value) return null; // value viene como "YYYY-MM-DD"
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  const d = new Date(value + suffix);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const f = fecha.toDate ? fecha.toDate() : new Date(fecha);
  const dia = String(f.getDate()).padStart(2, "0");
  const mes = String(f.getMonth() + 1).padStart(2, "0");
  const anio = f.getFullYear();
  const hora = String(f.getHours()).padStart(2, "0");
  const min = String(f.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function estadoCssClass(estadoRaw) {
  const e = (estadoRaw || "").toLowerCase();
  if (e === "completado" || e === "pagado") return "estado-completado";
  if (e === "cancelado") return "estado-cancelado";
  return "estado-pendiente";
}

// ==============================
// CARGAR HISTORIAL
// ==============================
async function cargarHistorial() {
  try {
    const ventasRef = collection(db, "ventas");
    const snap = await getDocs(ventasRef);

    const todasLasVentas = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Si hay nombre o clienteId en la URL → filtramos solo ese cliente.
    if (nombreCliente || clienteIdFromUrl) {
      ventasCliente = todasLasVentas.filter((v) => {
        const nombreVenta = (v.clienteNombre || v.cliente || "").trim();
        const idVenta =
          (v.clienteId || v.idCliente || "").toString().trim();

        const coincideNombre =
          nombreCliente && nombreVenta === nombreCliente;
        const coincideId =
          clienteIdFromUrl && idVenta === clienteIdFromUrl;

        return coincideNombre || coincideId;
      });

      if (subtituloCliente) {
        if (ventasCliente.length > 0) {
          subtituloCliente.textContent =
            "Mostrando las compras del cliente seleccionado.";
        } else {
          subtituloCliente.textContent =
            "No se encontraron ventas para este cliente.";
        }
      }
    } else {
      // Sin cliente específico → historial completo
      ventasCliente = todasLasVentas;
      if (subtituloCliente) {
        subtituloCliente.textContent =
          "Mostrando el historial completo de ventas.";
      }
    }

    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    listaHistorial.innerHTML = `
      <p class="sin-resultados">Ocurrió un error al cargar el historial.</p>
    `;
    if (resumenTotales) resumenTotales.innerHTML = "";
  }
}

// ==============================
// APLICAR FILTROS
// ==============================
function aplicarFiltros() {
  const desdeDate = getDateFromInput(inputDesde?.value || "", false);
  const hastaDate = getDateFromInput(inputHasta?.value || "", true);

  const textoProducto = (inputProducto?.value || "").toLowerCase();
  const estadoSeleccionado = (selectEstado?.value || "todas").toLowerCase();

  ventasFiltradas = ventasCliente.filter((venta) => {
    let ok = true;

    // Fecha
    if (venta.fecha) {
      const fechaJs = venta.fecha.toDate
        ? venta.fecha.toDate()
        : new Date(venta.fecha);

      if (desdeDate && fechaJs < desdeDate) ok = false;
      if (hastaDate && fechaJs > hastaDate) ok = false;
    }

    // Producto (código o nombre)
    if (textoProducto) {
      const codigo = (
        venta.productoCodigo ||
        venta.codigoProducto ||
        ""
      ).toLowerCase();
      const nombreProd = (
        venta.productoNombre ||
        venta.nombreProducto ||
        venta.producto ||
        ""
      ).toLowerCase();

      if (!codigo.includes(textoProducto) && !nombreProd.includes(textoProducto)) {
        ok = false;
      }
    }

    // Estado
    if (estadoSeleccionado !== "todas") {
      const estadoVenta = (venta.estado || "").toLowerCase();
      if (estadoVenta !== estadoSeleccionado) ok = false;
    }

    return ok;
  });

  renderHistorial(ventasFiltradas);
  recalcularTotales();
}

// ==============================
// RENDER TARJETAS PREMIUM
// ==============================
function renderHistorial(lista) {
  listaHistorial.innerHTML = "";

  if (!lista || lista.length === 0) {
    listaHistorial.innerHTML = `
      <p class="sin-resultados">No hay ventas registradas para este cliente con los filtros seleccionados.</p>
    `;
    return;
  }

  lista.forEach((venta) => {
    const fechaTexto = formatearFecha(venta.fecha);

    const codigoProd =
      venta.productoCodigo || venta.codigoProducto || "";

    const nombreProd =
      venta.productoNombre ||
      venta.nombreProducto ||
      venta.producto ||
      "-";

    const imgProd =
      venta.imagenUrl ||
      venta.imagen ||
      "https://via.placeholder.com/52x52?text=%F0%9F%9A%9A";

    const categoriaProd = venta.categoria || "-";
    const subcategoriaProd = venta.subcategoria || "-";

    const cantidad = venta.cantidad || venta.cant || 0;
    const total = venta.total || 0;
    const precioUnit = venta.precioUnitario || venta.precio || 0;
    const estado = venta.estado || "-";
    const notas = venta.notas || "";

    const estadoClass = estadoCssClass(estado);

    const card = document.createElement("div");
    card.className = "hist-card";

    card.innerHTML = `
      <div class="hist-card-left">
        <img src="${imgProd}" alt="${nombreProd}">
      </div>

      <div class="hist-card-main">
        <div>
          <div class="hist-prod-nombre">${nombreProd}</div>
          <div class="hist-prod-codigo">${codigoProd || "Sin código"}</div>
        </div>

        <div class="hist-detalles-row">
          <span>📅 ${fechaTexto}</span>
          <span>🧮 Cant: <strong>${cantidad}</strong></span>
          <span>💲 Unit: $${precioUnit.toLocaleString("es-AR")}</span>
          <span>📦 ${categoriaProd} / ${subcategoriaProd}</span>
        </div>

        ${
          notas
            ? `<div class="hist-notas">📝 ${notas}</div>`
            : ""
        }
      </div>

      <div class="hist-card-right">
        <span class="estado-badge ${estadoClass}">
          ${estado}
        </span>
        <span class="total-tag">
          Total: $${total.toLocaleString("es-AR")}
        </span>
        ${
          codigoProd
            ? `<button class="btn-mini-link"
                  onclick="window.location.href='admin.html?codigo=${encodeURIComponent(
                    codigoProd
                  )}'">
                  Ver producto
               </button>`
            : ""
        }
      </div>
    `;

    listaHistorial.appendChild(card);
  });
}

// ==============================
// TOTALES
// ==============================
function recalcularTotales() {
  const totalCliente = ventasCliente.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );
  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );

  const cantHistorica = ventasCliente.length;
  const cantFiltrada = ventasFiltradas.length;

  const formato = (n) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (resumenTotales) {
    resumenTotales.innerHTML = `
      <span>
        Total gastado (todas las compras de este contexto): 
        <span class="monto">$${formato(totalCliente)}</span>
        (${cantHistorica} venta${cantHistorica !== 1 ? "s" : ""})
      </span>
      <span>
        Total en resultados filtrados: 
        <span class="monto">$${formato(totalFiltrado)}</span>
        (${cantFiltrada} venta${cantFiltrada !== 1 ? "s" : ""})
      </span>
    `;
  }
}

// ==============================
// EVENTOS DE FILTROS
// ==============================
[inputDesde, inputHasta, inputProducto, selectEstado].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", aplicarFiltros);
  el.addEventListener("change", aplicarFiltros);
});
