// js/historial.js
import { auth, db } from './firebase-init.js';

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----------------------
// DOM
// ----------------------
const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");
const tablaHistorial = document.getElementById("tablaHistorial");
const btnLogout = document.getElementById("logoutBtn");

// Filtros
const filtroDesde = document.getElementById("filtroDesde");
const filtroHasta = document.getElementById("filtroHasta");
const filtroProducto = document.getElementById("filtroProducto");
const filtroEstado = document.getElementById("filtroEstado");

// Resumen de totales
const resumenTotales = document.getElementById("resumenTotales");

let ventasCliente = []; // todas las ventas del cliente (sin filtrar)

// ----------------------
// SESIÓN
// ----------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("clienteId");
  const clienteNombre = params.get("clienteNombre");

  if (!clienteId) {
    tituloCliente.textContent = "Historial de compras";
    subtituloCliente.textContent = "Seleccioná un cliente desde el panel de Clientes.";
    ventasCliente = [];
    actualizarTotales([]);
    renderHistorial([]);
    return;
  }

  tituloCliente.textContent = `Historial de compras - ${clienteNombre || ""}`;
  subtituloCliente.textContent = `Cliente: ${clienteNombre || ""}`;

  await cargarHistorial(clienteId);
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ----------------------
// CARGAR HISTORIAL
// ----------------------
async function cargarHistorial(clienteId) {
  tablaHistorial.innerHTML = `
    <tr>
      <td colspan="6">Cargando historial...</td>
    </tr>
  `;

  try {
    const ref = collection(db, "ventas");
    const q = query(
      ref,
      where("clienteId", "==", clienteId),
      orderBy("fecha", "desc")
    );

    const snap = await getDocs(q);

    ventasCliente = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data
      };
    });

    aplicarFiltros();
  } catch (err) {
    console.error(err);
    tablaHistorial.innerHTML = `
      <tr>
        <td colspan="6">Ocurrió un error al cargar el historial.</td>
      </tr>
    `;
    ventasCliente = [];
    actualizarTotales([]);
  }
}

// ----------------------
// RENDER TABLA
// ----------------------
function renderHistorial(lista) {
  tablaHistorial.innerHTML = "";

  if (!lista || lista.length === 0) {
    tablaHistorial.innerHTML = `
      <tr>
        <td colspan="6">No hay ventas registradas para este cliente.</td>
      </tr>
    `;
    return;
  }

  lista.forEach(v => {
    const tr = document.createElement("tr");

    // Fecha formateada
    let fechaTxt = "-";
    if (v.fecha && typeof v.fecha.toDate === "function") {
      const f = v.fecha.toDate();
      fechaTxt =
        f.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }) +
        " " +
        f.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit"
        });
    }

    // Producto: "N0001 - Producto de prueba"
    const productoTxt = `${v.productoCodigo || ""} - ${
      v.productoNombre || ""
    }`.trim();

    const cantidad = v.cantidad || 0;
    const total = v.total || 0;
    const estado = (v.estado || "").toLowerCase();
    const notas = v.notas || "-";

    tr.innerHTML = `
      <td>${fechaTxt}</td>
      <td>${productoTxt}</td>
      <td>${cantidad}</td>
      <td>$${total}</td>
      <td>
        <span class="badge-estado badge-${estado || "pendiente"}">
          ${estado || "pendiente"}
        </span>
      </td>
      <td>${notas}</td>
    `;

    tablaHistorial.appendChild(tr);
  });
}

// ----------------------
// RESUMEN DE TOTALES
// ----------------------
function actualizarTotales(listaFiltrada) {
  // Total histórico del cliente (sin importar filtros)
  const totalHistorico = ventasCliente.reduce((acc, v) => {
    const monto = typeof v.total === "number" ? v.total : parseFloat(v.total) || 0;
    return acc + monto;
  }, 0);

  // Total de las ventas que pasan los filtros actuales
  const totalFiltrado = listaFiltrada.reduce((acc, v) => {
    const monto = typeof v.total === "number" ? v.total : parseFloat(v.total) || 0;
    return acc + monto;
  }, 0);

  // Cantidad de ventas
  const cantHistorica = ventasCliente.length;
  const cantFiltrada = listaFiltrada.length;

  const formato = (n) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  resumenTotales.innerHTML = `
    <span>
      Total gastado (todas las compras): 
      <span class="monto">$${formato(totalHistorico)}</span>
      (${cantHistorica} venta${cantHistorica !== 1 ? "s" : ""})
    </span>
    <span>
      Total en resultados filtrados: 
      <span class="monto">$${formato(totalFiltrado)}</span>
      (${cantFiltrada} venta${cantFiltrada !== 1 ? "s" : ""})
    </span>
  `;
}

// ----------------------
// FILTROS
// ----------------------
function aplicarFiltros() {
  let lista = [...ventasCliente];

  // Filtro por fecha desde
  const desdeVal = filtroDesde.value;
  if (desdeVal) {
    const desde = new Date(desdeVal + "T00:00:00");
    lista = lista.filter(v => {
      if (!v.fecha || typeof v.fecha.toDate !== "function") return false;
      return v.fecha.toDate() >= desde;
    });
  }

  // Filtro por fecha hasta
  const hastaVal = filtroHasta.value;
  if (hastaVal) {
    const hasta = new Date(hastaVal + "T23:59:59");
    lista = lista.filter(v => {
      if (!v.fecha || typeof v.fecha.toDate !== "function") return false;
      return v.fecha.toDate() <= hasta;
    });
  }

  // Filtro por producto (código o nombre)
  const prodQ = filtroProducto.value.trim().toLowerCase();
  if (prodQ) {
    lista = lista.filter(v => {
      const cod = (v.productoCodigo || "").toLowerCase();
      const nom = (v.productoNombre || "").toLowerCase();
      return cod.includes(prodQ) || nom.includes(prodQ);
    });
  }

  // Filtro por estado
  const estadoVal = filtroEstado.value;
  if (estadoVal && estadoVal !== "todas") {
    lista = lista.filter(
      v => (v.estado || "").toLowerCase() === estadoVal
    );
  }

  // Actualizo tabla + totales
  renderHistorial(lista);
  actualizarTotales(lista);
}

// Eventos de filtros
[filtroDesde, filtroHasta, filtroProducto, filtroEstado].forEach(ctrl => {
  ctrl.addEventListener("input", aplicarFiltros);
  ctrl.addEventListener("change", aplicarFiltros);
});
