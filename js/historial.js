// js/historial.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
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
const selectPago = document.getElementById("filtroPago");
const selectEstado = document.getElementById("filtroEstado");

// Totales
const lblTotalCliente = document.getElementById("totalCliente");
const lblTotalFiltrado = document.getElementById("totalFiltrado");
const lblResumenConteo = document.getElementById("resumenConteo");

const lblSumEf = document.getElementById("sumEf");
const lblSumTr = document.getElementById("sumTr");
const lblSumMx = document.getElementById("sumMx");

// Modal comprobante
const modalDetalle = document.getElementById("modalDetalle");
const lblDetalleNumero = document.getElementById("detalleNumero");
const lblDetalleCliente = document.getElementById("detalleCliente");
const lblDetalleFecha = document.getElementById("detalleFecha");
const lblDetallePago = document.getElementById("detallePago");
const lblDetalleEstado = document.getElementById("detalleEstado");
const tbodyDetalleProductos = document.getElementById("detalleProductos");
const lblDetalleTotal = document.getElementById("detalleTotal");
const lblDetalleNotas = document.getElementById("detalleNotas");
const boxAudit = document.getElementById("detalleAudit");

const btnCerrarModalX = document.getElementById("cerrarModalDetalle");
const btnCerrarModal = document.getElementById("btnCerrarDetalle");
const btnImprimir = document.getElementById("btnImprimir");
const btnCompartirWhatsapp = document.getElementById("btnCompartirWhatsapp");

const btnAnular = document.getElementById("btnAnular");
const btnRestaurar = document.getElementById("btnRestaurar");

// --------------------
// Estado en memoria
// --------------------
let ventasCliente = [];     // todas las ventas del cliente (o globales)
let ventasFiltradas = [];   // ventas después de filtros
let productosCatalogo = []; // productos desde colección "productos"
let ventaActualDetalle = null;

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
// Helpers generales
// --------------------
function money(n) {
  return `$${Number(n || 0).toLocaleString("es-AR")}`;
}

function normPago(raw) {
  const p = String(raw || "").toLowerCase();
  if (p.includes("efec")) return "efectivo";
  if (p.includes("transf")) return "transferencia";
  if (p.includes("mixt")) return "mixto";
  return p || "—";
}

function pickClienteNombre(v) {
  const c = v.clienteNombre ?? v.cliente ?? v.clienteInfo ?? v.clienteData ?? "";
  if (typeof c === "string") return c.trim() || "Cliente";
  if (c && typeof c === "object") {
    return (c.nombre || c.name || c.razonSocial || c.apellido || "Cliente").toString();
  }
  return "Cliente";
}

function getLineasVenta(v) {
  // Soporta: v.productos (historial viejo) o v.items (ventas.html)
  if (Array.isArray(v.productos) && v.productos.length) {
    return v.productos.map(p => ({
      id: p.id || null,
      codigo: (p.codigo || "").toString(),
      nombre: "",
      precio: Number(p.precio || 0),
      cant: Number(p.cantidad || 0),
    }));
  }
  if (Array.isArray(v.items) && v.items.length) {
    return v.items.map(it => ({
      id: it.id || null,
      codigo: (it.codigo || "").toString(),
      nombre: (it.nombre || "").toString(),
      precio: Number(it.precio || 0),
      cant: Number(it.cant || it.cantidad || 0),
    }));
  }

  // Compatibilidad con venta de 1 producto
  const codigo = (v.productoCodigo || v.codigoProducto || "").toString();
  const nombre = (v.productoNombre || v.nombreProducto || v.producto || "").toString();
  const cant = Number(v.cantidad || v.cant || 0);
  const precio = Number(v.precio || 0);
  return [{ id: null, codigo, nombre, precio, cant }];
}

function nombreProductoDesdeCatalogo(codigo) {
  const cat = productosCatalogo.find((c) => c.codigo === codigo);
  return cat?.nombre || "";
}

// --------------------
// Cargar catálogo de productos
// --------------------
async function cargarProductosCatalogo() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productosCatalogo = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || "";
      return { codigo: String(codigo), nombre: String(nombre) };
    });
  } catch (error) {
    console.error("Error cargando catálogo para historial:", error);
    productosCatalogo = [];
  }
}

// --------------------
// Cargar ventas de Firestore
// --------------------
async function cargarHistorial() {
  try {
    await cargarProductosCatalogo();

    const snap = await getDocs(collection(db, "ventas"));
    const todasLasVentas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (nombreCliente) {
      ventasCliente = todasLasVentas.filter((v) => pickClienteNombre(v) === nombreCliente);

      subtituloCliente && (subtituloCliente.textContent =
        "Mostrando las compras del cliente seleccionado.");
    } else {
      ventasCliente = todasLasVentas;
      subtituloCliente && (subtituloCliente.textContent =
        "Mostrando el historial completo de ventas.");
    }

    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9">Ocurrió un error al cargar el historial.</td></tr>`;
    }
  }
}

// --------------------
// Filtros
// --------------------
function parseFechaFiltro(valor) {
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
  const pagoSeleccionado = (selectPago?.value || "todas").toLowerCase();
  const estadoSeleccionado = (selectEstado?.value || "todas").toLowerCase();

  ventasFiltradas = ventasCliente.filter((venta) => {
    let ok = true;

    // Fecha
    if (venta.fecha) {
      const fechaJs = venta.fecha.toDate ? venta.fecha.toDate() : new Date(venta.fecha);
      if (desdeDate && fechaJs < desdeDate) ok = false;
      if (hastaDate && fechaJs > hastaDate) ok = false;
    }

    // Producto (código o nombre)
    if (textoProducto) {
      let coincideProducto = false;

      const lineas = getLineasVenta(venta);
      for (const it of lineas) {
        const cod = (it.codigo || "").toLowerCase();
        const nom = (it.nombre || nombreProductoDesdeCatalogo(it.codigo) || "").toLowerCase();
        if (cod.includes(textoProducto) || nom.includes(textoProducto)) {
          coincideProducto = true;
          break;
        }
      }

      if (!coincideProducto) ok = false;
    }

    // Pago
    if (pagoSeleccionado !== "todas") {
      const p = normPago(venta.pago || venta.metodoPago || "");
      if (p !== pagoSeleccionado) ok = false;
    }

    // Estado (incluye anulada)
    const esAnulada = !!venta.anulada;
    if (estadoSeleccionado !== "todas") {
      if (estadoSeleccionado === "anulada") {
        if (!esAnulada) ok = false;
      } else {
        const estadoVenta = String(venta.estado || "").toLowerCase();
        if (estadoVenta !== estadoSeleccionado) ok = false;
      }
    }

    return ok;
  });

  renderTabla(ventasFiltradas);
  recalcularTotales();
}

// --------------------
// Render tabla
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

function obtenerResumenProductos(venta) {
  const lineas = getLineasVenta(venta).filter(x => x.cant > 0 || x.codigo || x.nombre);

  const totalCantidad = lineas.reduce((acc, it) => acc + (Number(it.cant) || 0), 0);

  if (!lineas.length) return { textoProducto: "—", totalCantidad: 0 };

  const primero = lineas[0];
  const nom = (primero.nombre || nombreProductoDesdeCatalogo(primero.codigo) || primero.codigo || "—");
  const textoBase = `${nom} x${primero.cant || 1}`;
  const resto = lineas.length - 1;
  const textoProducto = resto > 0 ? `${textoBase} (+${resto} más)` : textoBase;

  return { textoProducto, totalCantidad };
}

function pillPago(p) {
  const x = normPago(p);
  if (x === "efectivo") return `<span class="pill ok">efectivo</span>`;
  if (x === "transferencia") return `<span class="pill neutral">transferencia</span>`;
  if (x === "mixto") return `<span class="pill neutral">mixto</span>`;
  return `<span class="pill neutral">${x || "—"}</span>`;
}

function pillEstado(v) {
  if (v.anulada) return `<span class="pill bad">anulada</span>`;
  const e = String(v.estado || "—").toLowerCase();
  if (e === "pagado" || e === "entregado") return `<span class="pill ok">${e}</span>`;
  return `<span class="pill neutral">${e}</span>`;
}

function renderTabla(lista) {
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">No hay ventas para estos filtros.</td></tr>`;
    return;
  }

  // Orden desc por fecha
  const ordenadas = [...lista].sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
    return fb - fa;
  });

  ordenadas.forEach((venta) => {
    const tr = document.createElement("tr");

    const fechaTexto = formatearFecha(venta.fecha);
    const { textoProducto, totalCantidad } = obtenerResumenProductos(venta);

    const cliente = pickClienteNombre(venta);
    const total = Number(venta.total || 0);
    const notas = venta.notas || venta.motivoAnulacion || "—";

    tr.innerHTML = `
      <td data-label="Fecha">${fechaTexto}</td>
      <td data-label="N° Interno">${venta.numeroInterno || "—"}</td>
      <td data-label="Cliente">${cliente}</td>
      <td data-label="Producto(s)">${textoProducto}</td>
      <td data-label="Cantidad">${totalCantidad}</td>
      <td data-label="Total">${money(total)}</td>
      <td data-label="Pago">${pillPago(venta.pago || venta.metodoPago || "")}</td>
      <td data-label="Estado">${pillEstado(venta)}</td>
      <td data-label="Notas">${notas || "—"}</td>
    `;

    tr.addEventListener("click", () => abrirDetalleVenta(venta));
    tbody.appendChild(tr);
  });
}

// --------------------
// Totales
// --------------------
function recalcularTotales() {
  // Totales globales del cliente: excluye anuladas
  const totalCliente = ventasCliente.reduce((acc, v) => {
    if (v.anulada) return acc;
    return acc + Number(v.total || 0);
    }, 0);

  // Totales filtrados: excluye anuladas (para caja)
  const totalFiltrado = ventasFiltradas.reduce((acc, v) => {
    if (v.anulada) return acc;
    return acc + Number(v.total || 0);
  }, 0);

  let ef = 0, tr = 0, mx = 0;
  ventasFiltradas.forEach(v => {
    if (v.anulada) return;
    const t = Number(v.total || 0);
    const p = normPago(v.pago || v.metodoPago || "");
    if (p === "efectivo") ef += t;
    else if (p === "transferencia") tr += t;
    else if (p === "mixto") mx += t;
  });

  lblTotalCliente && (lblTotalCliente.textContent = money(totalCliente));
  lblTotalFiltrado && (lblTotalFiltrado.textContent = money(totalFiltrado));
  lblResumenConteo && (lblResumenConteo.textContent = `${ventasFiltradas.length} venta(s) en el resultado.`);

  lblSumEf && (lblSumEf.textContent = money(ef));
  lblSumTr && (lblSumTr.textContent = money(tr));
  lblSumMx && (lblSumMx.textContent = money(mx));
}

// --------------------
// Detalle / comprobante
// --------------------
function abrirDetalleVenta(venta) {
  if (!modalDetalle) return;

  ventaActualDetalle = venta;

  lblDetalleNumero && (lblDetalleNumero.textContent = venta.numeroInterno || "—");
  lblDetalleCliente && (lblDetalleCliente.textContent = pickClienteNombre(venta));
  lblDetalleFecha && (lblDetalleFecha.textContent = formatearFecha(venta.fecha));
  lblDetallePago && (lblDetallePago.textContent = normPago(venta.pago || venta.metodoPago || "—"));
  lblDetalleEstado && (lblDetalleEstado.textContent = venta.anulada ? "anulada" : (venta.estado || "—"));
  lblDetalleTotal && (lblDetalleTotal.textContent = money(venta.total || 0));
  lblDetalleNotas && (lblDetalleNotas.textContent = venta.notas || "—");

  // Audit box
  if (boxAudit) {
    if (venta.anulada) {
      const motivo = venta.motivoAnulacion || "—";
      const por = venta.anuladaPor || "—";
      const turno = venta.anuladaTurno || "—";
      boxAudit.style.display = "block";
      boxAudit.innerHTML = `
        <div><b>Venta ANULADA</b></div>
        <div style="margin-top:6px;">Motivo: <b>${motivo}</b></div>
        <div style="margin-top:6px;">Por: <b>${por}</b> • Turno: <b>${turno}</b></div>
      `;
    } else {
      boxAudit.style.display = "none";
      boxAudit.innerHTML = "";
    }
  }

  // Botones Anular / Restaurar
  if (btnAnular) btnAnular.style.display = venta.anulada ? "none" : "inline-flex";
  if (btnRestaurar) btnRestaurar.style.display = venta.anulada ? "inline-flex" : "none";

  // Tabla productos (soporta productos o items)
  if (tbodyDetalleProductos) {
    tbodyDetalleProductos.innerHTML = "";
    const lineas = getLineasVenta(venta);

    if (lineas.length) {
      lineas.forEach((it) => {
        const nombre =
          it.nombre ||
          nombreProductoDesdeCatalogo(it.codigo) ||
          it.codigo ||
          "—";

        const subtotal = Number(it.precio || 0) * Number(it.cant || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${it.codigo || "—"}</td>
          <td>${nombre}</td>
          <td>${Number(it.cant || 0)}</td>
          <td>${money(it.precio || 0)}</td>
          <td>${money(subtotal)}</td>
        `;
        tbodyDetalleProductos.appendChild(tr);
      });
    } else {
      tbodyDetalleProductos.innerHTML = `<tr><td colspan="5">Sin productos.</td></tr>`;
    }
  }

  modalDetalle.style.display = "flex";
}

function cerrarModalDetalle() {
  if (modalDetalle) modalDetalle.style.display = "none";
}

// --------------------
// Listeners de filtros
// --------------------
[inputDesde, inputHasta, inputProducto, selectPago, selectEstado].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", aplicarFiltros);
  el.addEventListener("change", aplicarFiltros);
});

// --------------------
// Listeners del modal
// --------------------
btnCerrarModalX?.addEventListener("click", cerrarModalDetalle);
btnCerrarModal?.addEventListener("click", cerrarModalDetalle);
modalDetalle?.addEventListener("click", (e) => {
  if (e.target === modalDetalle) cerrarModalDetalle();
});

// --------------------
// Imprimir (sin abrir pestaña extra)
// --------------------
function imprimirHTMLSinNuevaPestana(html) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const docu = iframe.contentDocument || iframe.contentWindow.document;
  docu.open();
  docu.write(html);
  docu.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 800);
    }
  }, 250);
}

btnImprimir?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;

  const v = ventaActualDetalle;
  const fechaTexto = formatearFecha(v.fecha);
  const numeroInterno = v.numeroInterno || "—";
  const cliente = pickClienteNombre(v);
  const estado = v.anulada ? "anulada" : (v.estado || "—");
  const pago = normPago(v.pago || v.metodoPago || "—");
  const totalTexto = money(v.total || 0);

  const lineas = getLineasVenta(v);

  let filasProductos = "";
  if (lineas.length) {
    lineas.forEach((it) => {
      const nombre = it.nombre || nombreProductoDesdeCatalogo(it.codigo) || it.codigo || "—";
      const precio = Number(it.precio || 0);
      const cant = Number(it.cant || 0);
      const subtotal = precio * cant;

      filasProductos += `
        <tr>
          <td>${it.codigo || "—"}</td>
          <td>${nombre}</td>
          <td class="num">${cant}</td>
          <td class="num">${money(precio)}</td>
          <td class="num">${money(subtotal)}</td>
        </tr>
      `;
    });
  } else {
    filasProductos = `<tr><td colspan="5">Sin productos.</td></tr>`;
  }

  const notasHtml = v.notas ? `<p style="margin-top:10px;"><strong>Notas:</strong> ${v.notas}</p>` : "";
  const auditHtml = v.anulada
    ? `<p style="margin-top:10px; font-size:12px; color:#6b7280;">
        <strong>Anulada:</strong> ${v.motivoAnulacion || "—"} · ${v.anuladaPor || "—"} · Turno: ${v.anuladaTurno || "—"}
      </p>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Comprobante de Venta</title>
      <style>
        * { box-sizing:border-box; }
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          margin: 18px;
          color:#111827;
          background:#fff;
        }
        h1 { font-size:20px; margin:0 0 4px 0; }
        .sub { font-size:11px; color:#6b7280; margin:0 0 14px 0; }
        .box { border:1px solid #e5e7eb; border-radius:10px; padding:14px; }
        .grid {
          display:grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px 24px;
          font-size: 13px;
          margin-bottom: 10px;
        }
        .grid b { font-weight:700; }
        table { width:100%; border-collapse:collapse; margin-top:8px; font-size:13px; }
        th, td { border-bottom:1px solid #e5e7eb; padding:6px 8px; text-align:left; }
        th { background:#f9fafb; font-weight:700; }
        td.num { text-align:right; white-space:nowrap; }
        .tot { margin-top:10px; text-align:right; font-size:14px; font-weight:800; }
        .foot { margin-top:18px; font-size:11px; color:#6b7280; text-align:center; }
        @media print { body { margin: 12mm; } }
      </style>
    </head>
    <body>
      <h1>Comprobante de Venta</h1>
      <p class="sub">Documento no fiscal · Uso interno</p>

      <div class="box">
        <div class="grid">
          <div><b>Fecha:</b> ${fechaTexto}</div>
          <div><b>N° Interno:</b> ${numeroInterno}</div>
          <div><b>Cliente:</b> ${cliente}</div>
          <div><b>Pago:</b> ${pago}</div>
          <div><b>Estado:</b> ${estado}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${filasProductos}
          </tbody>
        </table>

        <div class="tot">Total: ${totalTexto}</div>
        ${notasHtml}
        ${auditHtml}
      </div>

      <div class="foot">Delivery Mayorista · Comprobante interno de venta</div>
    </body>
    </html>
  `;

  // Cierra el modal (opcional pro) y abre directamente imprimir
  cerrarModalDetalle();
  imprimirHTMLSinNuevaPestana(html);
});

// --------------------
// WhatsApp (usa datos del detalle)
// --------------------
btnCompartirWhatsapp?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;

  const v = ventaActualDetalle;
  let texto = `🧾 *Comprobante - Delivery Mayorista*\n\n`;
  texto += `N° Interno: ${v.numeroInterno || "—"}\n`;
  texto += `👤 Cliente: ${pickClienteNombre(v)}\n`;
  texto += `📅 Fecha: ${formatearFecha(v.fecha)}\n`;
  texto += `💳 Pago: ${normPago(v.pago || v.metodoPago || "—")}\n`;
  texto += `🟢 Estado: ${v.anulada ? "anulada" : (v.estado || "—")}\n\n`;

  texto += `🛒 *Detalle:*\n`;
  const lineas = getLineasVenta(v);
  lineas.forEach((it) => {
    const nombre = it.nombre || nombreProductoDesdeCatalogo(it.codigo) || it.codigo || "—";
    const sub = Number(it.precio || 0) * Number(it.cant || 0);
    texto += `- ${Number(it.cant || 0)} x ${nombre} = ${money(sub)}\n`;
  });

  texto += `\n✅ *TOTAL:* ${money(v.total || 0)}`;

  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
});

// --------------------
// ANULAR / RESTAURAR (con stock)
// --------------------
async function anularVentaActual() {
  const v = ventaActualDetalle;
  if (!v?.id) return;

  const motivo = prompt("Motivo de anulación (obligatorio):");
  if (!motivo || !motivo.trim()) return;

  const ok = confirm(`¿Confirmás anular esta venta?\n\nMotivo: ${motivo.trim()}`);
  if (!ok) return;

  try {
    await runTransaction(db, async (transaction) => {
      const ventaRef = doc(db, "ventas", v.id);
      const snap = await transaction.get(ventaRef);
      if (!snap.exists()) throw new Error("La venta no existe.");
      const data = snap.data();
      if (data.anulada) throw new Error("La venta ya estaba anulada.");

      // Devolver stock
      const lineas = getLineasVenta(data);
      for (const it of lineas) {
        if (!it.id) continue;
        const prodRef = doc(db, "productos", it.id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) continue;

        const stockActual = Number(prodSnap.data().stock || 0);
        const devolver = Number(it.cant || 0);
        transaction.update(prodRef, { stock: stockActual + devolver });
      }

      transaction.update(ventaRef, {
        anulada: true,
        anuladaAt: serverTimestamp(),
        motivoAnulacion: motivo.trim(),
        anuladaPor: (localStorage.getItem("pos_cajero") || "—"),
        anuladaTurno: (localStorage.getItem("pos_turno") || null),
      });
    });

    alert("✅ Venta anulada. Stock restaurado.");
    cerrarModalDetalle();
    await cargarHistorial();
  } catch (e) {
    console.error(e);
    alert("ERROR al anular: " + (e?.message || e));
  }
}

async function restaurarVentaActual() {
  const v = ventaActualDetalle;
  if (!v?.id) return;

  const ok = confirm("¿Restaurar esta venta? (vuelve a descontar stock)");
  if (!ok) return;

  try {
    await runTransaction(db, async (transaction) => {
      const ventaRef = doc(db, "ventas", v.id);
      const snap = await transaction.get(ventaRef);
      if (!snap.exists()) throw new Error("La venta no existe.");
      const data = snap.data();
      if (!data.anulada) throw new Error("La venta no está anulada.");

      // Volver a descontar stock
      const lineas = getLineasVenta(data);
      for (const it of lineas) {
        if (!it.id) continue;
        const prodRef = doc(db, "productos", it.id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) continue;

        const stockActual = Number(prodSnap.data().stock || 0);
        const descontar = Number(it.cant || 0);
        const nuevo = Math.max(0, stockActual - descontar);
        transaction.update(prodRef, { stock: nuevo });
      }

      transaction.update(ventaRef, {
        anulada: false,
        motivoAnulacion: "",
        anuladaAt: null,
        anuladaPor: "",
        anuladaTurno: null,
      });
    });

    alert("✅ Venta restaurada. Stock vuelto a descontar.");
    cerrarModalDetalle();
    await cargarHistorial();
  } catch (e) {
    console.error(e);
    alert("ERROR al restaurar: " + (e?.message || e));
  }
}

btnAnular?.addEventListener("click", anularVentaActual);
btnRestaurar?.addEventListener("click", restaurarVentaActual);

