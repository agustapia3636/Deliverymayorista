// js/historial.js
import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection, getDocs, query, where, orderBy, limit,
  doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* =========================
   DOM
========================= */
const btnLogout = document.getElementById("logoutBtn");

const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");
const badgeModo = document.getElementById("badgeModo");

const tbody = document.getElementById("tablaHistorial");

// filtros
const inputDesde = document.getElementById("filtroDesde");
const inputHasta = document.getElementById("filtroHasta");
const inputProducto = document.getElementById("filtroProducto");
const selectPago = document.getElementById("filtroPago");
const selectEstado = document.getElementById("filtroEstado");

// búsqueda rápida
const inputBusquedaRapida = document.getElementById("busquedaRapida");

// ocultar anuladas
const toggleOcultarAnuladas = document.getElementById("toggleOcultarAnuladas");

// orden/paginación
const selectOrden = document.getElementById("selectOrden");
const selectPageSize = document.getElementById("selectPageSize");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const lblPager = document.getElementById("lblPager");
const lblHint = document.getElementById("lblHint");

const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");
const btnRefrescar = document.getElementById("btnRefrescar");

// totales
const lblTotalCliente = document.getElementById("totalCliente");
const lblTotalFiltrado = document.getElementById("totalFiltrado");
const lblResumenConteo = document.getElementById("resumenConteo");
const lblSumEf = document.getElementById("sumEf");
const lblSumTr = document.getElementById("sumTr");
const lblSumMx = document.getElementById("sumMx");

// modal
const modalDetalle = document.getElementById("modalDetalle");
const lblDetalleCliente = document.getElementById("detalleCliente");
const lblDetalleFecha = document.getElementById("detalleFecha");
const lblDetalleEstado = document.getElementById("detalleEstado");
const lblDetallePago = document.getElementById("detallePago");
const lblDetalleNumero = document.getElementById("detalleNumero");
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

/* =========================
   Estado
========================= */
let ventasBase = [];
let ventasFiltradas = [];
let pagina = 1;

let productosCatalogo = []; // {id,codigo,nombre}
let ventaActualDetalle = null;

/* =========================
   Helpers
========================= */
const money = (n) => "$" + Number(n || 0).toLocaleString("es-AR");
const norm = (s) => (s || "").toString().trim().toLowerCase();

function normPago(raw){
  const p = norm(raw);
  if (p.includes("efec")) return "efectivo";
  if (p.includes("transf")) return "transferencia";
  if (p.includes("mixt")) return "mixto";
  return p || "";
}

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    nombre: params.get("clienteNombre") || params.get("nombre") || "",
    clienteId: params.get("clienteId") || "",
  };
}

/* ✅ type="date" devuelve YYYY-MM-DD */
function parseFechaFiltro(valor) {
  if (!valor) return null;
  const dt = new Date(valor + "T00:00:00");
  return isNaN(dt.getTime()) ? null : dt;
}

function toDateJS(fecha) {
  if (!fecha) return null;
  if (typeof fecha?.toDate === "function") return fecha.toDate();
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? null : d;
}

function formatearFecha(fecha) {
  const f = toDateJS(fecha);
  if (!f) return "-";
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const yy = f.getFullYear();
  const hh = String(f.getHours()).padStart(2, "0");
  const mi = String(f.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

/* FIX: cliente puede venir como objeto */
function pickClienteNombre(v){
  const c = v.clienteNombre ?? v.cliente ?? v.clienteInfo ?? v.clienteData ?? "";
  if (typeof c === "string") return c.trim() || "Cliente";
  if (c && typeof c === "object") return (c.nombre || c.name || c.razonSocial || c.apellido || "Cliente").toString();
  return "Cliente";
}

/* items/productos + compat */
function extractLineas(v){
  if (Array.isArray(v.items) && v.items.length){
    return v.items.map(it => ({
      productoId: it.id || it.productoId || null,
      codigo: (it.codigo || "").toString(),
      nombre: (it.nombre || "").toString(),
      cant: Number(it.cant || it.cantidad || 0),
      precio: Number(it.precio || 0),
    }));
  }
  if (Array.isArray(v.productos) && v.productos.length){
    return v.productos.map(p => ({
      productoId: p.id || p.productoId || null,
      codigo: (p.codigo || "").toString(),
      nombre: (p.nombre || p.producto || "").toString(),
      cant: Number(p.cantidad || 0),
      precio: Number(p.precio || 0),
    }));
  }
  return [{
    productoId: v.productoId || null,
    codigo: (v.codigo || v.productoCodigo || "").toString(),
    nombre: (v.nombre || v.productoNombre || "").toString(),
    cant: Number(v.cantidad || 0),
    precio: Number(v.precio || 0),
  }];
}

function guessProductoNombre(codigo, fallback) {
  const c = (codigo || "").toString();
  const found = productosCatalogo.find((x) => (x.codigo || "").toString() === c);
  return found?.nombre || fallback || c || "-";
}

function guessProductoIdFromCodigo(codigo){
  const c = (codigo || "").toString();
  return productosCatalogo.find(p => (p.codigo||"").toString() === c)?.id || null;
}

function normalizeVenta(v) {
  const cliente = pickClienteNombre(v);
  const pago = (v.pago || v.metodoPago || v.formaPago || "").toString();
  const estado = (v.estado || "").toString();
  const anulada = !!v.anulada;

  const lineas = extractLineas(v);
  const total =
    Number(v.total || 0) ||
    lineas.reduce((acc, it) => acc + (Number(it.precio)||0) * (Number(it.cant)||0), 0);

  return {
    id: v.id,
    fecha: v.fecha || v.createdAt || null,
    cliente,
    clienteId: v.clienteId || "",
    tel: v.tel || "",
    pago,
    estado,
    anulada,
    notas: v.notas || "",
    numeroInterno: v.numeroInterno || v.nroInterno || "",
    lineas,
    total,
    anuladaAt: v.anuladaAt || null,
    anuladaPor: v.anuladaPor || "",
    anuladaTurno: v.anuladaTurno || null,
    motivoAnulacion: v.motivoAnulacion || "",
  };
}

function getEstadoPill(estadoRaw, anulada) {
  if (anulada) return `<span class="estado-pill estado-bad anulada" data-estado="anulada">anulada</span>`;
  const e = norm(estadoRaw);
  if (e === "pagado" || e === "entregado") return `<span class="estado-pill estado-ok">${e}</span>`;
  if (e === "pendiente") return `<span class="estado-pill estado-warn">pendiente</span>`;
  return `<span class="estado-pill">—</span>`;
}

function getPagoPill(pagoRaw) {
  const p = normPago(pagoRaw);
  return p ? `<span class="pago-pill">${p}</span>` : `<span class="pago-pill">—</span>`;
}

function obtenerResumenProductos(v) {
  const arr = v.lineas || [];
  if (!arr.length) return { texto: "—", cant: 0 };
  const totalCant = arr.reduce((acc, it) => acc + (Number(it.cant) || 0), 0);
  const first = arr[0];
  const nombre = guessProductoNombre(first.codigo, first.nombre);
  const base = `${nombre} x${first.cant || 1}`;
  const resto = arr.length - 1;
  return { texto: resto > 0 ? `${base} (+${resto})` : base, cant: totalCant };
}

function buildCSV(rows) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = ["Fecha","NumeroInterno","Cliente","Pago","Estado","Total","Productos","Notas"].map(esc).join(",");
  const lines = rows.map((v) => {
    const prods = (v.lineas || []).map((it) => `${it.codigo || ""} x${it.cant || 0}`).join(" | ");
    return [
      formatearFecha(v.fecha),
      v.numeroInterno || "",
      v.cliente || "",
      normPago(v.pago),
      v.anulada ? "anulada" : (v.estado || ""),
      v.total || 0,
      prods,
      v.notas || v.motivoAnulacion || "",
    ].map(esc).join(",");
  });
  return [header, ...lines].join("\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   Sesión
========================= */
btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      inputBusquedaRapida?.focus();
    }
    if (e.key === "Escape") cerrarModal();
  });

  await cargarProductosCatalogo();
  await cargarHistorial();
});

/* =========================
   Cargar catálogo (con ID)
========================= */
async function cargarProductosCatalogo() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productosCatalogo = snap.docs.map((docSnap) => {
      const d = docSnap.data() || {};
      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || d.name || "";
      return { id: docSnap.id, codigo: String(codigo), nombre: String(nombre) };
    });
  } catch (e) {
    console.error("Error cargando catálogo:", e);
    productosCatalogo = [];
  }
}

/* =========================
   Cargar ventas
========================= */
async function cargarHistorial() {
  const { nombre: nombreCliente, clienteId } = getQueryParams();

  try {
    if (nombreCliente || clienteId) {
      badgeModo.textContent = "Cliente";
      tituloCliente.textContent = `Historial de compras - ${nombreCliente || "Cliente"}`;
      subtituloCliente.textContent = "Mostrando las compras del cliente seleccionado.";
    } else {
      badgeModo.textContent = "Completo";
      tituloCliente.textContent = "Historial de compras";
      subtituloCliente.textContent = "Mostrando el historial completo de ventas.";
    }

    const ventasRef = collection(db, "ventas");
    let qy;

    if (clienteId) {
      qy = query(ventasRef, where("clienteId", "==", clienteId), orderBy("fecha", "desc"), limit(2000));
    } else {
      qy = query(ventasRef, orderBy("fecha", "desc"), limit(2500));
    }

    const snap = await getDocs(qy);
    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let all = raw.map(normalizeVenta);

    if (!clienteId && nombreCliente) {
      const target = nombreCliente.trim();
      all = all.filter((v) => (v.cliente || "").trim() === target);
    }

    ventasBase = all;
    pagina = 1;
    aplicarFiltros();

  } catch (e) {
    console.error("Error al cargar historial:", e);
    tbody.innerHTML = `<tr><td colspan="9">Ocurrió un error al cargar el historial.</td></tr>`;
  }
}

/* =========================
   Filtros + orden
========================= */
function aplicarFiltros() {
  const desdeDate = parseFechaFiltro(inputDesde?.value);
  const hastaDateRaw = parseFechaFiltro(inputHasta?.value);

  let hastaDate = hastaDateRaw;
  if (hastaDateRaw) {
    hastaDate = new Date(hastaDateRaw.getTime());
    hastaDate.setHours(23, 59, 59, 999);
  }

  const textoProducto = norm(inputProducto?.value);
  const estadoSeleccionado = norm(selectEstado?.value || "todas");
  const pagoSeleccionado = norm(selectPago?.value || "todas");
  const qRapida = norm(inputBusquedaRapida?.value);
  const ocultarAnuladas = !!toggleOcultarAnuladas?.checked;

  const ord = (selectOrden?.value || "fecha_desc").toLowerCase();

  ventasFiltradas = ventasBase.filter((v) => {
    if (ocultarAnuladas && v.anulada) return false;

    const f = toDateJS(v.fecha);
    if (desdeDate && f && f < desdeDate) return false;
    if (hastaDate && f && f > hastaDate) return false;

    if (estadoSeleccionado !== "todas") {
      if (estadoSeleccionado === "anulada") {
        if (!v.anulada) return false;
      } else {
        if (norm(v.estado) !== estadoSeleccionado) return false;
      }
    }

    if (pagoSeleccionado !== "todas") {
      if (normPago(v.pago) !== pagoSeleccionado) return false;
    }

    if (textoProducto) {
      const hit = (v.lineas || []).some((it) => {
        const cod = norm(it.codigo);
        const nom = norm(guessProductoNombre(it.codigo, it.nombre));
        return cod.includes(textoProducto) || nom.includes(textoProducto);
      });
      if (!hit) return false;
    }

    if (qRapida) {
      const inCliente = norm(v.cliente).includes(qRapida);
      const inInterno = norm(v.numeroInterno).includes(qRapida);
      const inPago = norm(normPago(v.pago)).includes(qRapida);
      const inProd = (v.lineas || []).some((it) => {
        const cod = norm(it.codigo);
        const nom = norm(guessProductoNombre(it.codigo, it.nombre));
        return cod.includes(qRapida) || nom.includes(qRapida);
      });
      if (!(inCliente || inInterno || inPago || inProd)) return false;
    }

    return true;
  });

  ventasFiltradas.sort((a, b) => {
    const da = toDateJS(a.fecha)?.getTime() || 0;
    const dbb = toDateJS(b.fecha)?.getTime() || 0;

    if (ord === "fecha_asc") return da - dbb;
    if (ord === "fecha_desc") return dbb - da;
    if (ord === "total_asc") return (Number(a.total) || 0) - (Number(b.total) || 0);
    if (ord === "total_desc") return (Number(b.total) || 0) - (Number(a.total) || 0);
    return dbb - da;
  });

  const pageSize = Number(selectPageSize?.value || 20);
  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / pageSize));
  if (pagina > totalPages) pagina = totalPages;

  renderTabla();
  recalcularTotales();
}

/* =========================
   Render tabla + paginación
========================= */
function renderTabla() {
  const pageSize = Number(selectPageSize?.value || 20);
  const total = ventasFiltradas.length;

  const start = (pagina - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const slice = ventasFiltradas.slice(start, end);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9">Sin resultados.</td></tr>`;
    lblPager.textContent = `0–0 de ${total}`;
    lblHint.textContent = "";
    return;
  }

  tbody.innerHTML = slice.map((v) => {
    const { texto, cant } = obtenerResumenProductos(v);
    const estadoHtml = getEstadoPill(v.estado, v.anulada);
    const pagoHtml = getPagoPill(v.pago);

    const notas = (v.notas || v.motivoAnulacion || "").toString().trim();
    const notasShort = notas.length > 26 ? notas.slice(0, 26) + "…" : (notas || "—");

    return `
      <tr data-id="${v.id}">
        <td>${formatearFecha(v.fecha)}</td>
        <td class="mono">${v.numeroInterno || "—"}</td>
        <td>${v.cliente || "—"}</td>
        <td>${texto}</td>
        <td class="num">${cant || 0}</td>
        <td class="num">${money(v.total || 0)}</td>
        <td>${pagoHtml}</td>
        <td>${estadoHtml}</td>
        <td class="muted" title="${notas.replaceAll('"', "'")}">${notasShort}</td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.dataset.id;
      const v = ventasFiltradas.find((x) => x.id === id);
      if (v) abrirDetalle(v);
    });
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  lblPager.textContent = `${start + 1}–${end} de ${total}`;
  lblHint.textContent = totalPages > 1 ? `Mostrando pág ${pagina}/${totalPages}` : "";
}

/* =========================
   Totales (excluye anuladas)
========================= */
function recalcularTotales() {
  const totalCliente = ventasBase.reduce((acc, v) => acc + (v.anulada ? 0 : (Number(v.total) || 0)), 0);
  lblTotalCliente.textContent = money(totalCliente);

  const totalFiltrado = ventasFiltradas.reduce((acc, v) => acc + (v.anulada ? 0 : (Number(v.total) || 0)), 0);
  lblTotalFiltrado.textContent = money(totalFiltrado);

  lblResumenConteo.textContent = `${ventasFiltradas.length} ventas`;

  let ef=0,tr=0,mx=0;
  ventasFiltradas.forEach(v => {
    if (v.anulada) return;
    const t = Number(v.total || 0);
    const p = normPago(v.pago);
    if (p === "efectivo") ef += t;
    else if (p === "transferencia") tr += t;
    else if (p === "mixto") mx += t;
  });

  lblSumEf.textContent = money(ef);
  lblSumTr.textContent = money(tr);
  lblSumMx.textContent = money(mx);
}

/* =========================
   Modal (sin cambios)
========================= */
function abrirDetalle(v) {
  ventaActualDetalle = v;

  lblDetalleCliente.textContent = v.cliente || "-";
  lblDetalleFecha.textContent = formatearFecha(v.fecha);
  lblDetalleEstado.textContent = v.anulada ? "anulada" : (v.estado || "—");
  lblDetallePago.textContent = normPago(v.pago) || "—";
  lblDetalleNumero.textContent = v.numeroInterno || "—";

  const arr = v.lineas || [];
  if (!arr.length) {
    tbodyDetalleProductos.innerHTML = `<tr><td colspan="5">Sin productos.</td></tr>`;
  } else {
    tbodyDetalleProductos.innerHTML = arr.map((it) => {
      const nombre = guessProductoNombre(it.codigo, it.nombre || it.codigo || "-");
      const cant = Number(it.cant || 0);
      const precio = Number(it.precio || 0);
      const sub = precio * cant;
      return `
        <tr>
          <td class="mono">${it.codigo || "-"}</td>
          <td>${nombre}</td>
          <td class="num">${cant}</td>
          <td class="num">${money(precio)}</td>
          <td class="num">${money(sub)}</td>
        </tr>
      `;
    }).join("");
  }

  lblDetalleTotal.textContent = money(v.total || 0);
  lblDetalleNotas.textContent = (v.notas && v.notas.toString().trim()) ? v.notas : (v.motivoAnulacion || "-");

  if (v.anulada) {
    boxAudit.style.display = "block";
    boxAudit.innerHTML = `
      <div><b>Venta ANULADA</b></div>
      <div style="margin-top:6px;">Motivo: <b>${(v.motivoAnulacion || "—")}</b></div>
      <div style="margin-top:6px;">Por: <b>${(v.anuladaPor || "—")}</b> · Turno: <b>${(v.anuladaTurno ?? "—")}</b></div>
    `;
  } else {
    boxAudit.style.display = "none";
    boxAudit.innerHTML = "";
  }

  btnAnular.style.display = v.anulada ? "none" : "inline-flex";
  btnRestaurar.style.display = v.anulada ? "inline-flex" : "none";

  modalDetalle.style.display = "flex";
}

function cerrarModal() {
  modalDetalle.style.display = "none";
  ventaActualDetalle = null;
}

btnCerrarModalX?.addEventListener("click", cerrarModal);
btnCerrarModal?.addEventListener("click", cerrarModal);
modalDetalle?.addEventListener("click", (e) => { if (e.target === modalDetalle) cerrarModal(); });

/* =========================
   (Imprimir / WhatsApp / Anular / Restaurar)
   👉 pegás acá tu bloque actual tal cual (no cambia por el calendario)
========================= */
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

  const filas = (v.lineas || []).length
    ? (v.lineas || []).map(it => {
        const nombre = guessProductoNombre(it.codigo, it.nombre || it.codigo || "—");
        const cant = Number(it.cant || 0);
        const precio = Number(it.precio || 0);
        const sub = cant * precio;
        return `
          <tr>
            <td>${it.codigo || "—"}</td>
            <td>${nombre}</td>
            <td class="num">${cant}</td>
            <td class="num">${money(precio)}</td>
            <td class="num">${money(sub)}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5">Sin productos.</td></tr>`;

  const audit = v.anulada ? `<p style="margin-top:10px; font-size:12px; color:#6b7280;">
    <b>Anulada:</b> ${v.motivoAnulacion || "—"} · ${v.anuladaPor || "—"} · Turno: ${v.anuladaTurno ?? "—"}
  </p>` : "";

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Comprobante</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:18px;color:#111827}
      h1{font-size:20px;margin:0 0 4px}
      .sub{font-size:11px consider; color:#6b7280;margin:0 0 14px}
      .box{border:1px solid #e5e7eb;border-radius:10px;padding:14px}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 24px;font-size:13px;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
      th,td{border-bottom:1px solid #e5e7eb;padding:6px 8px;text-align:left}
      th{background:#f9fafb;font-weight:700}
      td.num{text-align:right;white-space:nowrap}
      .tot{margin-top:10px;text-align:right;font-size:14px;font-weight:800}
      .foot{margin-top:18px;font-size:11px;color:#6b7280;text-align:center}
      @media print{body{margin:12mm}}
    </style>
  </head>
  <body>
    <h1>Comprobante de Venta</h1>
    <p class="sub">Documento no fiscal · Uso interno</p>

    <div class="box">
      <div class="grid">
        <div><b>Fecha:</b> ${formatearFecha(v.fecha)}</div>
        <div><b>N° Interno:</b> ${v.numeroInterno || "—"}</div>
        <div><b>Cliente:</b> ${v.cliente || "—"}</div>
        <div><b>Pago:</b> ${normPago(v.pago) || "—"}</div>
        <div><b>Estado:</b> ${v.anulada ? "anulada" : (v.estado || "—")}</div>
      </div>

      <table>
        <thead>
          <tr><th>Código</th><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div class="tot">Total: ${money(v.total || 0)}</div>
      ${v.notas ? `<p style="margin-top:10px;"><b>Notas:</b> ${v.notas}</p>` : ""}
      ${audit}
    </div>

    <div class="foot">Delivery Mayorista · Comprobante interno de venta</div>
  </body>
  </html>`;

  cerrarModal();
  imprimirHTMLSinNuevaPestana(html);
});

/* =========================
   WhatsApp
========================= */
btnCompartirWhatsapp?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;
  const v = ventaActualDetalle;

  let texto = `🧾 *Comprobante - Delivery Mayorista*\n\n`;
  texto += `N° Interno: ${v.numeroInterno || "—"}\n`;
  texto += `👤 Cliente: ${v.cliente || "—"}\n`;
  texto += `📅 Fecha: ${formatearFecha(v.fecha)}\n`;
  texto += `💳 Pago: ${normPago(v.pago) || "—"}\n`;
  texto += `🟢 Estado: ${v.anulada ? "anulada" : (v.estado || "—")}\n\n`;
  texto += `🛒 *Detalle:*\n`;

  (v.lineas || []).forEach(it => {
    const nombre = guessProductoNombre(it.codigo, it.nombre || it.codigo || "—");
    const sub = (Number(it.precio||0) * Number(it.cant||0));
    texto += `- ${Number(it.cant||0)} x ${nombre} = ${money(sub)}\n`;
  });

  texto += `\n✅ *TOTAL:* ${money(v.total || 0)}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
});

/* =========================
   ANULAR / RESTAURAR (con stock si se puede)
========================= */
async function anularVentaActual() {
  if (!ventaActualDetalle?.id) return;

  const motivo = prompt("Motivo de anulación (obligatorio):");
  if (!motivo || !motivo.trim()) return;

  if (!confirm(`¿Confirmás anular esta venta?\n\nMotivo: ${motivo.trim()}`)) return;

  const v = ventaActualDetalle;

  try {
    await runTransaction(db, async (tx) => {
      const ventaRef = doc(db, "ventas", v.id);
      const snap = await tx.get(ventaRef);
      if (!snap.exists()) throw new Error("La venta no existe.");
      const data = snap.data();
      if (data.anulada) throw new Error("La venta ya estaba anulada.");

      const lineas = extractLineas(data);

      for (const it of lineas) {
        const pid = it.productoId || guessProductoIdFromCodigo(it.codigo);
        if (!pid) continue;

        const prodRef = doc(db, "productos", pid);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) continue;

        const stockActual = Number(prodSnap.data().stock || 0);
        const devolver = Number(it.cant || 0);
        tx.update(prodRef, { stock: stockActual + devolver });
      }

      tx.update(ventaRef, {
        anulada: true,
        anuladaAt: serverTimestamp(),
        motivoAnulacion: motivo.trim(),
        anuladaPor: (localStorage.getItem("pos_cajero") || "—"),
        anuladaTurno: (localStorage.getItem("pos_turno") || null),
      });
    });

    alert("✅ Venta anulada. (Stock restaurado si estaba linkeado al producto)");
    cerrarModal();
    await cargarProductosCatalogo();
    await cargarHistorial();
  } catch (e) {
    console.error(e);
    alert("ERROR al anular: " + (e?.message || e));
  }
}

async function restaurarVentaActual() {
  if (!ventaActualDetalle?.id) return;
  if (!confirm("¿Restaurar esta venta? (vuelve a descontar stock si se puede)")) return;

  const v = ventaActualDetalle;

  try {
    await runTransaction(db, async (tx) => {
      const ventaRef = doc(db, "ventas", v.id);
      const snap = await tx.get(ventaRef);
      if (!snap.exists()) throw new Error("La venta no existe.");
      const data = snap.data();
      if (!data.anulada) throw new Error("La venta no está anulada.");

      const lineas = extractLineas(data);

      for (const it of lineas) {
        const pid = it.productoId || guessProductoIdFromCodigo(it.codigo);
        if (!pid) continue;

        const prodRef = doc(db, "productos", pid);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) continue;

        const stockActual = Number(prodSnap.data().stock || 0);
        const descontar = Number(it.cant || 0);
        tx.update(prodRef, { stock: Math.max(0, stockActual - descontar) });
      }

      tx.update(ventaRef, {
        anulada: false,
        motivoAnulacion: "",
        anuladaAt: null,
        anuladaPor: "",
        anuladaTurno: null,
      });
    });

    alert("✅ Venta restaurada. (Stock descontado si estaba linkeado al producto)");
    cerrarModal();
    await cargarProductosCatalogo();
    await cargarHistorial();
  } catch (e) {
    console.error(e);
    alert("ERROR al restaurar: " + (e?.message || e));
  }
}

btnAnular?.addEventListener("click", anularVentaActual);
btnRestaurar?.addEventListener("click", restaurarVentaActual);

/* =========================
   UI: paginación / reset / export / refrescar / switch
========================= */
function resetFiltros() {
  inputDesde.value = "";
  inputHasta.value = "";
  inputProducto.value = "";
  selectPago.value = "todas";
  selectEstado.value = "todas";
  inputBusquedaRapida.value = "";
  selectOrden.value = "fecha_desc";
  selectPageSize.value = "20";
  if (toggleOcultarAnuladas) toggleOcultarAnuladas.checked = true;
  pagina = 1;
  aplicarFiltros();
}

btnReset?.addEventListener("click", resetFiltros);

btnRefrescar?.addEventListener("click", async () => {
  await cargarProductosCatalogo();
  await cargarHistorial();
});

btnPrev?.addEventListener("click", () => {
  const pageSize = Number(selectPageSize.value || 20);
  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / pageSize));
  pagina = Math.max(1, pagina - 1);
  if (pagina > totalPages) pagina = totalPages;
  renderTabla();
});

btnNext?.addEventListener("click", () => {
  const pageSize = Number(selectPageSize.value || 20);
  const totalPages = Math.max(1, Math.ceil(ventasFiltradas.length / pageSize));
  pagina = Math.min(totalPages, pagina + 1);
  renderTabla();
});

btnExport?.addEventListener("click", () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const csv = buildCSV(ventasFiltradas);
  downloadText(`historial-${stamp}.csv`, csv);
});

toggleOcultarAnuladas?.addEventListener("change", () => {
  pagina = 1;
  aplicarFiltros();
});

[inputDesde, inputHasta, inputProducto, selectPago, selectEstado, inputBusquedaRapida, selectOrden, selectPageSize]
  .forEach((el) => el?.addEventListener("input", () => {
    pagina = 1;
    aplicarFiltros();
  }));
