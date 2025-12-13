// js/historial.js
import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
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
const selectEstado = document.getElementById("filtroEstado");

// búsqueda rápida
const inputBusquedaRapida = document.getElementById("busquedaRapida");

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
const lblResumenPagina = document.getElementById("resumenPagina");

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

const btnCerrarModalX = document.getElementById("cerrarModalDetalle");
const btnCerrarModal = document.getElementById("btnCerrarDetalle");
const btnImprimir = document.getElementById("btnImprimir");
const btnCompartirWhatsapp = document.getElementById("btnCompartirWhatsapp");

/* =========================
   Estado
========================= */
let ventasBase = [];        // ventas “de origen” (cliente o global)
let ventasFiltradas = [];   // luego de filtros/búsqueda
let pagina = 1;

let productosCatalogo = []; // {codigo, nombre}
let ventaActualDetalle = null;

/* =========================
   Helpers
========================= */
const money = (n) => "$" + Number(n || 0).toLocaleString("es-AR");
const norm = (s) => (s || "").toString().trim().toLowerCase();
const digits = (s) => (s || "").toString().replace(/\D+/g, "");

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    nombre: params.get("clienteNombre") || params.get("nombre") || "",
    clienteId: params.get("clienteId") || "",
  };
}

function parseFechaFiltro(valor) {
  // dd/mm/aaaa -> Date (00:00)
  if (!valor) return null;
  const v = valor.trim();
  const [d, m, y] = v.split("/");
  if (!d || !m || !y) return null;
  const dt = new Date(`${y}-${m}-${d}T00:00:00`);
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

function getEstadoPill(estadoRaw, anulada) {
  if (anulada) return `<span class="estado-pill estado-bad">anulada</span>`;

  const e = norm(estadoRaw);
  if (e === "pagado" || e === "entregado") return `<span class="estado-pill estado-ok">${e || "ok"}</span>`;
  if (e === "pendiente") return `<span class="estado-pill estado-warn">pendiente</span>`;
  if (e) return `<span class="estado-pill">${e}</span>`;
  return `<span class="estado-pill">—</span>`;
}

function getPagoPill(pagoRaw) {
  const p = norm(pagoRaw);
  if (!p) return `<span class="pago-pill">—</span>`;
  return `<span class="pago-pill">${p}</span>`;
}

function guessProductoNombre(codigo, fallback) {
  const c = (codigo || "").toString();
  if (!c) return fallback || "-";
  const found = productosCatalogo.find((x) => (x.codigo || "").toString() === c);
  return found?.nombre || fallback || c;
}

/**
 * Normaliza una venta para soportar:
 * - ventas nuevas de ventas.html: { items:[{codigo,nombre,precio,cant}] }
 * - ventas viejas / alternativas: { productos:[{codigo, cantidad, precio}] }
 * - nombres: cliente / clienteNombre
 * - estado: estado (opcional) + anulada (boolean)
 * - numeroInterno (si existe)
 */
function normalizeVenta(v) {
  const cliente = (v.clienteNombre || v.cliente || "Cliente").toString();
  const pago = (v.pago || v.metodoPago || v.formaPago || "").toString();
  const estado = (v.estado || (v.anulada ? "anulada" : "") || "").toString();
  const anulada = !!v.anulada;

  // productos
  let productos = [];
  if (Array.isArray(v.productos) && v.productos.length) {
    productos = v.productos.map((p) => ({
      codigo: p.codigo || "",
      nombre: p.nombre || p.producto || "",
      cantidad: Number(p.cantidad || 0),
      precio: Number(p.precio || 0),
    }));
  } else if (Array.isArray(v.items) && v.items.length) {
    productos = v.items.map((it) => ({
      codigo: it.codigo || it.id || "",
      nombre: it.nombre || "",
      cantidad: Number(it.cant || it.cantidad || 0),
      precio: Number(it.precio || 0),
    }));
  }

  const total =
    Number(v.total || 0) ||
    productos.reduce((acc, p) => acc + (Number(p.precio) || 0) * (Number(p.cantidad) || 0), 0);

  const fecha = v.fecha || v.createdAt || null;

  return {
    id: v.id,
    fecha,
    cliente,
    clienteId: v.clienteId || "",
    tel: v.tel || "",
    pago,
    estado,
    anulada,
    notas: v.notas || "",
    numeroInterno: v.numeroInterno || v.nroInterno || "",
    productos,
    total,
  };
}

function obtenerResumenProductos(v) {
  const arr = v.productos || [];
  if (!arr.length) return { texto: "—", cant: 0 };

  const totalCant = arr.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
  const first = arr[0];
  const nombre = guessProductoNombre(first.codigo, first.nombre || first.codigo || "-");
  const base = `${nombre} x${first.cantidad || 1}`;
  const resto = arr.length - 1;
  return {
    texto: resto > 0 ? `${base} (+${resto})` : base,
    cant: totalCant,
  };
}

function buildCSV(rows) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Fecha",
    "NumeroInterno",
    "Cliente",
    "Pago",
    "Estado",
    "Total",
    "Productos",
    "Notas",
  ].map(esc).join(",");

  const lines = rows.map((v) => {
    const prods = (v.productos || [])
      .map((p) => `${p.codigo || ""} x${p.cantidad || 0}`)
      .join(" | ");

    return [
      formatearFecha(v.fecha),
      v.numeroInterno || "",
      v.cliente || "",
      v.pago || "",
      v.anulada ? "anulada" : (v.estado || ""),
      v.total || 0,
      prods,
      v.notas || "",
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
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // UX: foco búsqueda (Ctrl+K)
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
   Cargar catálogo (para mostrar nombres por código)
========================= */
async function cargarProductosCatalogo() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productosCatalogo = snap.docs.map((docSnap) => {
      const d = docSnap.data() || {};
      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || d.name || "";
      return { codigo: String(codigo), nombre: String(nombre) };
    });
  } catch (e) {
    console.error("Error cargando catálogo para historial:", e);
    productosCatalogo = [];
  }
}

/* =========================
   Cargar ventas (Firestore)
   - Si viene clienteId -> consulta por where('clienteId','==',...)
   - Si viene clienteNombre -> filtra por nombre (fallback)
========================= */
async function cargarHistorial() {
  const { nombre: nombreCliente, clienteId } = getQueryParams();

  try {
    // UI modo
    if (nombreCliente || clienteId) {
      badgeModo.textContent = "Cliente";
      tituloCliente.textContent = `Historial de compras - ${nombreCliente || "Cliente"}`;
      subtituloCliente.textContent = "Mostrando las compras del cliente seleccionado.";
    } else {
      badgeModo.textContent = "Completo";
      tituloCliente.textContent = "Historial de compras";
      subtituloCliente.textContent = "Mostrando el historial completo de ventas.";
    }

    // ✅ Traemos últimas N (para no reventar si crece mucho)
    // Si querés “TODO”, subí el limit. (recomendado mantener límite)
    const ventasRef = collection(db, "ventas");
    let qy;

    if (clienteId) {
      qy = query(ventasRef, where("clienteId", "==", clienteId), orderBy("fecha", "desc"), limit(1500));
    } else {
      qy = query(ventasRef, orderBy("fecha", "desc"), limit(2000));
    }

    const snap = await getDocs(qy);
    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // normalizar
    let all = raw.map(normalizeVenta);

    // fallback: si no hubo clienteId pero hay nombreCliente => filtrar por nombre exacto
    if (!clienteId && nombreCliente) {
      const target = nombreCliente.trim();
      all = all.filter((v) => (v.cliente || "").trim() === target);
    }

    ventasBase = all;
    pagina = 1;

    aplicarFiltros();

  } catch (e) {
    console.error("Error al cargar historial:", e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9">Ocurrió un error al cargar el historial.</td></tr>`;
    }
  }
}

/* =========================
   Filtros + búsqueda + orden
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
  const qRapida = norm(inputBusquedaRapida?.value);

  // orden
  const ord = (selectOrden?.value || "fecha_desc").toLowerCase();

  ventasFiltradas = ventasBase.filter((v) => {
    let ok = true;

    const f = toDateJS(v.fecha);
    if (desdeDate && f && f < desdeDate) ok = false;
    if (hastaDate && f && f > hastaDate) ok = false;

    // estado
    if (estadoSeleccionado !== "todas") {
      if (estadoSeleccionado === "anulada") {
        if (!v.anulada) ok = false;
      } else {
        if (norm(v.estado) !== estadoSeleccionado) ok = false;
      }
    }

    // producto (código o nombre)
    if (textoProducto) {
      const arr = v.productos || [];
      const hit = arr.some((p) => {
        const cod = norm(p.codigo);
        const nom = norm(guessProductoNombre(p.codigo, p.nombre));
        return cod.includes(textoProducto) || nom.includes(textoProducto);
      });
      if (!hit) ok = false;
    }

    // búsqueda rápida (cliente / código / nombre / nro interno)
    if (qRapida) {
      const inCliente = norm(v.cliente).includes(qRapida);
      const inInterno = norm(v.numeroInterno).includes(qRapida);
      const inPago = norm(v.pago).includes(qRapida);
      const inProd = (v.productos || []).some((p) => {
        const cod = norm(p.codigo);
        const nom = norm(guessProductoNombre(p.codigo, p.nombre));
        return cod.includes(qRapida) || nom.includes(qRapida);
      });
      if (!(inCliente || inInterno || inPago || inProd)) ok = false;
    }

    return ok;
  });

  // ordenar
  ventasFiltradas.sort((a, b) => {
    const da = toDateJS(a.fecha)?.getTime() || 0;
    const dbb = toDateJS(b.fecha)?.getTime() || 0;

    if (ord === "fecha_asc") return da - dbb;
    if (ord === "fecha_desc") return dbb - da;

    if (ord === "total_asc") return (Number(a.total) || 0) - (Number(b.total) || 0);
    if (ord === "total_desc") return (Number(b.total) || 0) - (Number(a.total) || 0);

    return dbb - da;
  });

  // si la página queda fuera
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

  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9">Sin resultados.</td></tr>`;
    lblPager.textContent = `0–0 de ${total}`;
    lblResumenPagina.textContent = `1 / 1`;
    lblHint.textContent = "";
    return;
  }

  tbody.innerHTML = slice.map((v) => {
    const { texto, cant } = obtenerResumenProductos(v);

    const estadoHtml = getEstadoPill(v.estado, v.anulada);
    const pagoHtml = getPagoPill(v.pago);

    const notas = (v.notas || "").toString().trim();
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

  // click fila => modal comprobante
  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = tr.dataset.id;
      const v = ventasFiltradas.find((x) => x.id === id);
      if (v) abrirDetalle(v);
    });
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  lblPager.textContent = `${start + 1}–${end} de ${total}`;
  lblResumenPagina.textContent = `${pagina} / ${totalPages}`;
  lblHint.textContent = totalPages > 1 ? `Mostrando pág ${pagina}.` : "";
}

/* =========================
   Totales
========================= */
function recalcularTotales() {
  // total cliente (de base)
  const totalCliente = ventasBase.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  lblTotalCliente.textContent = money(totalCliente);

  // total filtrado
  const totalFiltrado = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  lblTotalFiltrado.textContent = money(totalFiltrado);

  // conteo
  lblResumenConteo.textContent = `${ventasFiltradas.length} ventas`;
}

/* =========================
   Modal detalle
========================= */
function abrirDetalle(v) {
  ventaActualDetalle = v;

  lblDetalleCliente.textContent = v.cliente || "-";
  lblDetalleFecha.textContent = formatearFecha(v.fecha);
  lblDetalleEstado.textContent = v.anulada ? "anulada" : (v.estado || "—");
  lblDetallePago.textContent = v.pago || "—";
  lblDetalleNumero.textContent = v.numeroInterno || "—";

  // productos
  const arr = v.productos || [];
  if (!arr.length) {
    tbodyDetalleProductos.innerHTML = `<tr><td colspan="5">Sin productos.</td></tr>`;
  } else {
    tbodyDetalleProductos.innerHTML = arr.map((p) => {
      const nombre = guessProductoNombre(p.codigo, p.nombre || p.codigo || "-");
      const cant = Number(p.cantidad || 0);
      const precio = Number(p.precio || 0);
      const sub = precio * cant;

      return `
        <tr>
          <td class="mono">${p.codigo || "-"}</td>
          <td>${nombre}</td>
          <td class="num">${cant}</td>
          <td class="num">${money(precio)}</td>
          <td class="num">${money(sub)}</td>
        </tr>
      `;
    }).join("");
  }

  lblDetalleTotal.textContent = money(v.total || 0);
  lblDetalleNotas.textContent = (v.notas && v.notas.toString().trim()) ? v.notas : "-";

  modalDetalle.style.display = "flex";
}

function cerrarModal() {
  modalDetalle.style.display = "none";
  ventaActualDetalle = null;
}

btnCerrarModalX?.addEventListener("click", cerrarModal);
btnCerrarModal?.addEventListener("click", cerrarModal);
modalDetalle?.addEventListener("click", (e) => {
  if (e.target === modalDetalle) cerrarModal();
});
// --------------------
// Imprimir comprobante lindo (SIN abrir pestaña)
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

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Esperar a que renderice y recién imprimir
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // limpiar iframe
    setTimeout(() => {
      iframe.remove();
    }, 800);
  }, 250);
}

btnImprimir?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;

  const v = ventaActualDetalle;

  const fechaTexto = formatearFecha(v.fecha);
  const numeroInterno = v.numeroInterno || "-";
  const cliente = v.clienteNombre || "-";
  const estado = v.estado || "-";
  const totalTexto = "$" + (v.total || 0).toLocaleString("es-AR");

  // filas de productos
  let filasProductos = "";

  if (Array.isArray(v.productos) && v.productos.length > 0) {
    v.productos.forEach((p) => {
      const infoProd = productosCatalogo.find((c) => c.codigo === p.codigo);
      const nombre = infoProd?.nombre || p.codigo || "-";
      const precio = p.precio || 0;
      const cant = p.cantidad || 0;
      const subtotal = precio * cant;

      filasProductos += `
        <tr>
          <td>${p.codigo || "-"}</td>
          <td>${nombre}</td>
          <td class="num">${cant}</td>
          <td class="num">$${precio.toLocaleString("es-AR")}</td>
          <td class="num">$${subtotal.toLocaleString("es-AR")}</td>
        </tr>
      `;
    });
  } else {
    filasProductos = `
      <tr>
        <td colspan="5">Sin productos.</td>
      </tr>
    `;
  }

  const notasHtml = v.notas ? `<p><strong>Notas:</strong> ${v.notas}</p>` : "";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Comprobante de Venta</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          margin: 0;
          padding: 18px;
          color: #111;
        }
        h1 { font-size: 18px; margin: 0 0 4px 0; }
        .subtitulo { font-size: 11px; color: #6b7280; margin: 0 0 16px 0; }
        .header {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px 32px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .header div span { font-weight: 700; }
        .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f9fafb; font-weight: 700; }
        td.num { text-align: right; white-space: nowrap; }
        .totales { margin-top: 10px; text-align: right; font-size: 14px; font-weight: 800; }
        .footer { margin-top: 24px; font-size: 11px; color: #6b7280; text-align: center; }

        @media print {
          body { margin: 14mm; }
        }
      </style>
    </head>
    <body>
      <h1>Comprobante de Venta</h1>
      <p class="subtitulo">Documento no fiscal · Uso interno</p>

      <div class="box">
        <div class="header">
          <div><span>Fecha:</span> ${fechaTexto}</div>
          <div><span>N° Interno:</span> ${numeroInterno}</div>
          <div><span>Cliente:</span> ${cliente}</div>
          <div><span>Estado:</span> ${estado}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th class="num">Cant.</th>
              <th class="num">Precio</th>
              <th class="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${filasProductos}
          </tbody>
        </table>

        <div class="totales">Total: ${totalTexto}</div>
        ${notasHtml}
      </div>

      <div class="footer">Delivery Mayorista · Comprobante interno de venta</div>
    </body>
    </html>
  `;

  imprimirHTMLSinNuevaPestana(html);
});

/* =========================
   WhatsApp (mensaje completo)
========================= */
btnCompartirWhatsapp?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;

  const v = ventaActualDetalle;

  let texto = `🧾 *Comprobante - Delivery Mayorista*\n`;
  texto += `📅 ${formatearFecha(v.fecha)}\n`;
  if (v.numeroInterno) texto += `🔢 N° Interno: *${v.numeroInterno}*\n`;
  texto += `👤 Cliente: *${v.cliente || "Cliente"}*\n`;
  if (v.pago) texto += `💳 Pago: *${v.pago}*\n`;
  texto += `\n🛒 *Detalle*\n`;

  (v.productos || []).forEach((p) => {
    const nombre = guessProductoNombre(p.codigo, p.nombre || p.codigo || "-");
    const cant = Number(p.cantidad || 0);
    const precio = Number(p.precio || 0);
    const sub = cant * precio;
    texto += `- ${cant} x ${nombre} (${money(precio)}) = ${money(sub)}\n`;
  });

  texto += `\n✅ *TOTAL:* ${money(v.total || 0)}\n`;
  if (v.anulada) texto += `🔴 Estado: *anulada*\n`;
  else if (v.estado) texto += `🟢 Estado: *${v.estado}*\n`;

  if (v.notas) texto += `\n📝 Notas: ${v.notas}\n`;

  // Si hay tel (ventas.html guarda tel en la venta), lo usamos. Si no, wa.me sin número.
  const tel = digits(v.tel || "");
  const msg = encodeURIComponent(texto);
  const url = tel ? `https://wa.me/${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, "_blank");
});

/* =========================
   Eventos UI
========================= */
function resetFiltros() {
  inputDesde.value = "";
  inputHasta.value = "";
  inputProducto.value = "";
  selectEstado.value = "todas";
  inputBusquedaRapida.value = "";
  selectOrden.value = "fecha_desc";
  selectPageSize.value = "20";
  pagina = 1;
  aplicarFiltros();
}

btnReset?.addEventListener("click", resetFiltros);
btnRefrescar?.addEventListener("click", async () => {
  await cargarProductosCatalogo();
  await cargarHistorial();
});

[inputDesde, inputHasta, inputProducto, selectEstado, inputBusquedaRapida, selectOrden, selectPageSize]
  .forEach((el) => el?.addEventListener("input", () => {
    pagina = 1;
    aplicarFiltros();
  }));

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
