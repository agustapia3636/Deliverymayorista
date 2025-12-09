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

const tbody = document.getElementById("tablaHistorial");

// Filtros
const inputDesde = document.getElementById("filtroDesde");
const inputHasta = document.getElementById("filtroHasta");
const inputProducto = document.getElementById("filtroProducto");
const selectEstado = document.getElementById("filtroEstado");

// Totales (si no existen en el HTML, quedan en null y no pasa nada)
const lblTotalCliente = document.getElementById("totalCliente");
const lblTotalFiltrado = document.getElementById("totalFiltrado");
const lblResumenConteo = document.getElementById("resumenConteo");

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
// CARGAR VENTAS DESDE FIRESTORE
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

        // Coincide por nombre o por id
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
      // Sin cliente en URL → mostrar todas las ventas
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

// ==============================
// FILTROS
// ==============================
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

    // ----- Fecha -----
    if (venta.fecha) {
      const fechaJs = venta.fecha.toDate
        ? venta.fecha.toDate()
        : new Date(venta.fecha);

      if (desdeDate && fechaJs < desdeDate) ok = false;
      if (hastaDate && fechaJs > hastaDate) ok = false;
    }

    // ----- Producto (código o nombre) -----
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

    // ----- Estado -----
    if (estadoSeleccionado !== "todas") {
      const estadoVenta = (venta.estado || "").toLowerCase();
      if (estadoVenta !== estadoSeleccionado) ok = false;
    }

    return ok;
  });

  renderTabla(ventasFiltradas);
  recalcularTotales();
}

// ==============================
// RENDER TABLA
// ==============================
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
      venta.productoNombre ||
      venta.nombreProducto ||
      venta.producto ||
      "-";
    const cantidad = venta.cantidad || venta.cant || 0;
    const total = venta.total || 0;
    const estado = venta.estado || "-";
    const notas = venta.notas || "-";

    tr.innerHTML = `
      <td>${fechaTexto}</td>
      <td>${nombreProd}</td>
      <td>${cantidad}</td>
      <td>$${total.toLocaleString("es-AR")}</td>
      <td>${estado}</td>
      <td>${notas}</td>
    `;

    tbody.appendChild(tr);
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

// ==============================
// LISTENERS DE FILTROS
// ==============================
[inputDesde, inputHasta, inputProducto, selectEstado].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", aplicarFiltros);
  el.addEventListener("change", aplicarFiltros);
});
