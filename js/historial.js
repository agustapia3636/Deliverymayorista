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

// --------------------
// DOM
// --------------------
const btnLogout = document.getElementById("logoutBtn");

const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");

const tbody = document.getElementById("tablaHistorial");

// Filtros
const inputDesde = document.getElementById("filtroDesde");
const inputHasta = document.getElementById("filtroHasta");
const inputProducto = document.getElementById("filtroProducto");
const selectEstado = document.getElementById("filtroEstado");

// Totales
const lblTotalCliente = document.getElementById("totalCliente");
const lblTotalFiltrado = document.getElementById("totalFiltrado");
const lblResumenConteo = document.getElementById("resumenConteo");

// --------------------
// Estado en memoria
// --------------------
let ventasCliente = [];   // todas las ventas del cliente (o globales)
let ventasFiltradas = []; // ventas después de filtros

// --------------------
// Helper: query string
// --------------------
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    nombre: params.get("clienteNombre") || params.get("nombre") || "",
    clienteId: params.get("clienteId") || "",
  };
}

const { nombre: nombreCliente } = getQueryParams();

// Título base
if (nombreCliente) {
  tituloCliente.textContent = `Historial de compras - ${nombreCliente}`;
} else {
  tituloCliente.textContent = "Historial de compras";
}

// --------------------
// SESIÓN
// --------------------
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

// --------------------
// Cargar ventas de Firestore
// --------------------
async function cargarHistorial() {
  try {
    const ventasRef = collection(db, "ventas");
    const snap = await getDocs(ventasRef);

    const todasLasVentas = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (nombreCliente) {
      // Filtrar solo ventas de ese cliente por nombre
      ventasCliente = todasLasVentas.filter((v) => {
        const nombreVenta = (v.clienteNombre || v.cliente || "").trim();
        return nombreVenta === nombreCliente;
      });

      if (subtituloCliente) {
        subtituloCliente.textContent =
          "Mostrando las compras del cliente seleccionado.";
      }
    } else {
      ventasCliente = todasLasVentas;
      if (subtituloCliente) {
        subtituloCliente.textContent =
          "Mostrando el historial completo de ventas.";
      }
    }

    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Ocurrió un error al cargar el historial.</td>
      </tr>
    `;
  }
}

// --------------------
// Filtros
// --------------------
function parseFechaFiltro(valor) {
  // dd/mm/aaaa -> Date
  if (!valor) return null;
  const [d, m, y] = valor.split("/");
  if (!d || !m || !y) return null;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

function aplicarFiltros() {
  const desdeDate = parseFechaFiltro(inputDesde?.value.trim());
  const hastaDateRaw = parseFechaFiltro(inputHasta?.value.trim());
  let hastaDate = hastaDateRaw;
  if (hastaDateRaw) {
    hastaDate = new Date(hastaDateRaw.getTime());
    hastaDate.setHours(23, 59, 59, 999);
  }

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

  renderTabla(ventasFiltradas);
  recalcularTotales();
}

// --------------------
// Render tabla / tarjetas
// --------------------
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

function renderTabla(lista) {
  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No hay ventas registradas para este cliente.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((venta) => {
    const tr = document.createElement("tr");

    const fechaTexto = formatearFecha(venta.fecha);
    const nombreProd =
      venta.productoNombre || venta.nombreProducto || venta.producto || "-";
    const cantidad = venta.cantidad || venta.cant || 0;
    const total = venta.total || 0;
    const estado = venta.estado || "-";
    const notas = venta.notas || "-";

    const totalTexto = `$${total.toLocaleString("es-AR")}`;

    tr.innerHTML = `
      <td data-label="Fecha">${fechaTexto}</td>
      <td data-label="Producto">${nombreProd}</td>
      <td data-label="Cantidad">${cantidad}</td>
      <td data-label="Total">${totalTexto}</td>
      <td data-label="Estado">
        ${
          estado && estado !== "-"
            ? `<span class="estado-pill">${estado}</span>`
            : "-"
        }
      </td>
      <td data-label="Notas">${notas}</td>
    `;

    tbody.appendChild(tr);
  });
}

// --------------------
// Totales
// --------------------
function recalcularTotales() {
  const totalCliente = ventasCliente.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );
  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );

  if (lblTotalCliente) {
    lblTotalCliente.textContent = `$${totalCliente.toLocaleString("es-AR")}`;
  }
  if (lblTotalFiltrado) {
    lblTotalFiltrado.textContent = `$${totalFiltrado.toLocaleString("es-AR")}`;
  }
  if (lblResumenConteo) {
    lblResumenConteo.textContent = `${ventasFiltradas.length} venta(s) en el resultado.`;
  }
}

// --------------------
// Listeners de filtros
// --------------------
[inputDesde, inputHasta, inputProducto, selectEstado].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", aplicarFiltros);
  el.addEventListener("change", aplicarFiltros);
});
