// js/ventas.js
// Panel de ventas PRO: listado, filtros, estados y alta de ventas
// con soporte para varios productos por venta (mini carrito en el modal)
// DESCARGA AUTOMÁTICA DE STOCK, control de stock insuficiente
// y PANEL DE ESTADÍSTICAS (histórico / hoy / mes) con botón ver/ocultar.

import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const logoutBtn       = document.getElementById("logoutBtn");
const tablaVentasBody = document.getElementById("tablaVentas");
const buscarVenta     = document.getElementById("buscarVenta");
const filtroEstado    = document.getElementById("filtroEstado");
const msgVentas       = document.getElementById("msgVentas");
const subTitulo       = document.getElementById("subTituloVentas");

const btnNuevaVenta    = document.getElementById("btnNuevaVenta");
const modalVenta       = document.getElementById("modalVenta");
const selCliente       = document.getElementById("ventaCliente");
const inpProducto      = document.getElementById("ventaProducto");
const listaProducto    = document.getElementById("ventaProductoLista");
const inpCantidad      = document.getElementById("ventaCantidad");
const selEstado        = document.getElementById("ventaEstado");
const txtNotas         = document.getElementById("ventaNotas");
const btnCancelarVenta = document.getElementById("btnCancelarVenta");
const btnGuardarVenta  = document.getElementById("btnGuardarVenta");
const btnAgregarProd   = document.getElementById("btnAgregarProductoVenta");
const tablaProdBody    = document.getElementById("ventaProductosTabla");
const labelTotalPrev   = document.getElementById("ventaTotalPreview");

// 🔢 DOM estadísticas
const btnToggleEstadisticas   = document.getElementById("btn-toggle-estadisticas");
const panelEstadisticas       = document.getElementById("panel-estadisticas");
const spanTotalHistorico      = document.getElementById("estad-total-historico");
const spanTotalHoy            = document.getElementById("estad-total-hoy");
const spanTotalMes            = document.getElementById("estad-total-mes");

// ---------------------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------------------

let ventas            = [];   // todas las ventas cargadas
let clientes          = [];   // clientes para el combo
let productosCatalogo = [];   // productos para autocomplete
let ventaProductosTmp = [];   // productos de la venta actual {codigo, nombre, precio, cantidad}

// ---------------------------------------------------------------------------
// Auth y carga inicial
// ---------------------------------------------------------------------------

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (subTitulo) {
    subTitulo.textContent =
      "Registro de ventas de " + (user.email || "administrador") + ".";
  }

  cargarClientes();
  cargarVentas();
  cargarEstadisticasVentas();
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// ---------------------------------------------------------------------------
// Utilidades UI
// ---------------------------------------------------------------------------

function mostrarMensaje(texto, esError = false) {
  if (!msgVentas) return;
  msgVentas.textContent = texto || "";
  msgVentas.classList.toggle("error", !!esError);
  if (texto) {
    setTimeout(() => {
      msgVentas.textContent = "";
      msgVentas.classList.remove("error");
    }, 4000);
  }
}

function formatearFecha(fecha) {
  if (!(fecha instanceof Date)) return "-";
  const dia   = String(fecha.getDate()).padStart(2, "0");
  const mes   = String(fecha.getMonth() + 1).padStart(2, "0");
  const año   = fecha.getFullYear();
  const hora  = String(fecha.getHours()).padStart(2, "0");
  const min   = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${año} ${hora}:${min}`;
}

function crearBadgeEstado(estadoRaw) {
  const estado = (estadoRaw || "").toLowerCase();
  const span = document.createElement("span");
  span.classList.add("badge-estado");

  if (estado === "pagado") {
    span.classList.add("estado-pagado");
    span.textContent = "Pagado";
  } else if (estado === "entregado") {
    span.classList.add("estado-entregado");
    span.textContent = "Entregado";
  } else {
    span.classList.add("estado-pendiente");
    span.textContent = "Pendiente";
  }

  return span;
}

// ---------------------------------------------------------------------------
// Carga de CLIENTES
// ---------------------------------------------------------------------------

async function cargarClientes() {
  if (!selCliente) return;

  selCliente.innerHTML = `<option value="">Seleccionar cliente...</option>`;

  try {
    const snap = await getDocs(collection(db, "clientes"));
    clientes = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const id   = docSnap.id;
      const nombre   = data.nombre || data.Nombre || "Sin nombre";
      const telefono = data.telefono || data.Telefono || "";

      clientes.push({ id, nombre, telefono });

      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = telefono
        ? `${nombre} (${telefono})`
        : nombre;
      selCliente.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando clientes:", err);
    mostrarMensaje("Error al cargar clientes.", true);
  }
}

// ---------------------------------------------------------------------------
// Carga de productos para autocomplete
// ---------------------------------------------------------------------------

async function cargarProductosCatalogo() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productosCatalogo = [];

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || "";
      const precio = Number(d.precio ?? d.PrecioMayorista ?? 0) || 0;
      const stock  = Number(d.stock ?? d.Stock ?? 0) || 0;

      if (!codigo) return;

      productosCatalogo.push({
        codigo,
        nombre,
        precio,
        stock,
      });
    });
  } catch (err) {
    console.error("Error cargando catálogo para autocomplete:", err);
  }
}

// ---------------------------------------------------------------------------
// Carga de VENTAS
// ---------------------------------------------------------------------------

async function cargarVentas() {
  if (!tablaVentasBody) return;

  tablaVentasBody.innerHTML = `
    <tr>
      <td colspan="8" class="texto-centro">Cargando ventas...</td>
    </tr>
  `;

  try {
    const ref  = collection(db, "ventas");
    const q    = query(ref, orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    ventas = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      let fecha = null;
      if (data.fecha && typeof data.fecha.toDate === "function") {
        fecha = data.fecha.toDate();
      }

      const clienteId     = data.clienteId || "";
      const clienteNombre = data.clienteNombre || "";
      const total         = Number(data.total) || 0;
      const estado        = data.estado || "pendiente";
      const notas         = data.notas || "";
      const productos     = Array.isArray(data.productos) ? data.productos : [];

      ventas.push({
        id: docSnap.id,
        fecha,
        clienteId,
        clienteNombre,
        total,
        estado,
        notas,
        productos,
      });
    });

    aplicarFiltros();
  } catch (err) {
    console.error("Error cargando ventas:", err);
    tablaVentasBody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">Error al cargar ventas.</td>
      </tr>
    `;
    mostrarMensaje("Error al cargar ventas.", true);
  }
}

// ---------------------------------------------------------------------------
// ESTADÍSTICAS: total histórico / hoy / mes
// ---------------------------------------------------------------------------

async function cargarEstadisticasVentas() {
  try {
    const ref  = collection(db, "ventas");
    const snap = await getDocs(ref);

    let totalHistorico = 0;
    let totalHoy       = 0;
    let totalMes       = 0;

    const ahora      = new Date();
    const inicioDia  = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioMes  = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const totalVenta = Number(data.total) || 0;

      let fecha = null;
      if (data.fecha && typeof data.fecha.toDate === "function") {
        fecha = data.fecha.toDate();
      }

      // Total histórico
      totalHistorico += totalVenta;

      if (fecha) {
        // Total HOY
        if (fecha >= inicioDia) {
          totalHoy += totalVenta;
        }
        // Total MES
        if (fecha >= inicioMes) {
          totalMes += totalVenta;
        }
      }
    });

    const opts = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };

    if (spanTotalHistorico) {
      spanTotalHistorico.textContent =
        "$ " + totalHistorico.toLocaleString("es-AR", opts);
    }
    if (spanTotalHoy) {
      spanTotalHoy.textContent =
        "$ " + totalHoy.toLocaleString("es-AR", opts);
    }
    if (spanTotalMes) {
      spanTotalMes.textContent =
        "$ " + totalMes.toLocaleString("es-AR", opts);
    }
  } catch (err) {
    console.error("Error calculando estadísticas de ventas:", err);
  }
}

// ---------------------------------------------------------------------------
// Filtros y render de tabla
// ---------------------------------------------------------------------------

function aplicarFiltros() {
  const texto        = (buscarVenta?.value || "").toLowerCase();
  const estadoFiltro = (filtroEstado?.value || "").toLowerCase();

  const filtradas = ventas.filter((v) => {
    if (estadoFiltro && v.estado.toLowerCase() !== estadoFiltro) {
      return false;
    }

    if (texto) {
      const cliente = (v.clienteNombre || v.clienteId || "").toLowerCase();
      const estado  = (v.estado || "").toLowerCase();
      const notas   = (v.notas || "").toLowerCase();

      const productosTexto = (v.productos || [])
        .map((p) => `${p.codigo || ""} ${p.nombre || ""}`)
        .join(" ")
        .toLowerCase();

      const hayCoincidencia =
        cliente.includes(texto) ||
        estado.includes(texto) ||
        notas.includes(texto) ||
        productosTexto.includes(texto);

      if (!hayCoincidencia) return false;
    }

    return true;
  });

  mostrarVentas(filtradas);
}

function mostrarVentas(lista) {
  if (!tablaVentasBody) return;

  if (!lista.length) {
    tablaVentasBody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">No se encontraron ventas.</td>
      </tr>
    `;
    return;
  }

  tablaVentasBody.innerHTML = "";

  lista.forEach((v) => {
    const tr = document.createElement("tr");

    const tdFecha = document.createElement("td");
    tdFecha.textContent = v.fecha ? formatearFecha(v.fecha) : "-";

    const tdCliente = document.createElement("td");
    tdCliente.textContent = v.clienteNombre || v.clienteId || "-";

    const tdProductos = document.createElement("td");
    if (!v.productos || !v.productos.length) {
      tdProductos.textContent = "-";
    } else {
      const primero = v.productos[0];
      const resto   = v.productos.length - 1;
      const texto   = `${primero.codigo || "Prod"} x${primero.cantidad || 1}` +
                      (resto > 0 ? ` (+${resto} más)` : "");
      tdProductos.textContent = texto;
    }

    const tdCant = document.createElement("td");
    const totalCant = (v.productos || []).reduce(
      (acc, p) => acc + (Number(p.cantidad) || 0),
      0
    );
    tdCant.textContent = totalCant || "-";

    const tdTotal = document.createElement("td");
    tdTotal.textContent = "$ " + (v.total || 0).toLocaleString("es-AR");

    const tdEstado = document.createElement("td");
    tdEstado.appendChild(crearBadgeEstado(v.estado));

    const tdNotas = document.createElement("td");
    const notas   = v.notas || "";
    const corto   =
      notas.length > 40 ? notas.slice(0, 40).trim() + "…" : notas;
    tdNotas.textContent = corto || "-";
    if (notas) tdNotas.title = notas;

    const tdAcciones = document.createElement("td");

    const btnEstado = document.createElement("button");
    btnEstado.textContent = "Cambiar estado";
    btnEstado.classList.add("btn-mini", "estado");
    btnEstado.addEventListener("click", () => cambiarEstadoVenta(v));

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.classList.add("btn-mini", "eliminar");
    btnEliminar.addEventListener("click", () => eliminarVenta(v));

    tdAcciones.appendChild(btnEstado);
    tdAcciones.appendChild(btnEliminar);

    tr.appendChild(tdFecha);
    tr.appendChild(tdCliente);
    tr.appendChild(tdProductos);
    tr.appendChild(tdCant);
    tr.appendChild(tdTotal);
    tr.appendChild(tdEstado);
    tr.appendChild(tdNotas);
    tr.appendChild(tdAcciones);

    tablaVentasBody.appendChild(tr);
  });
}

// ---------------------------------------------------------------------------
// Cambiar estado / eliminar
// ---------------------------------------------------------------------------

async function cambiarEstadoVenta(v) {
  const estados = ["pendiente", "pagado", "entregado"];
  const actualIndex = estados.indexOf((v.estado || "").toLowerCase());
  const siguiente = estados[(actualIndex + 1) % estados.length];

  const ok = confirm(
    `Estado actual: ${v.estado || "pendiente"}.\n\n¿Cambiar a "${siguiente}"?`
  );
  if (!ok) return;

  try {
    await updateDoc(doc(db, "ventas", v.id), { estado: siguiente });
    v.estado = siguiente;
    mostrarMensaje("Estado actualizado.");
    aplicarFiltros();
    cargarEstadisticasVentas();
  } catch (err) {
    console.error("Error cambiando estado:", err);
    mostrarMensaje("Error al cambiar estado.", true);
  }
}

async function eliminarVenta(v) {
  const ok = confirm(
    `¿Eliminar la venta de ${v.clienteNombre || v.clienteId || "cliente"} por $${v.total}?`
  );
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "ventas", v.id));
    mostrarMensaje("Venta eliminada.");
    ventas = ventas.filter((x) => x.id !== v.id);
    aplicarFiltros();
    cargarEstadisticasVentas();
  } catch (err) {
    console.error("Error eliminando venta:", err);
    mostrarMensaje("Error al eliminar venta.", true);
  }
}

// ---------------------------------------------------------------------------
// Modal NUEVA VENTA (multi-producto)
// ---------------------------------------------------------------------------

async function abrirModalVenta() {
  if (!modalVenta) return;
  modalVenta.style.display = "flex";

  // reset campos
  if (selCliente)  selCliente.value = "";
  if (inpProducto) {
    inpProducto.value = "";
    inpProducto.dataset.codigoReal = "";
  }
  if (listaProducto) {
    listaProducto.style.display = "none";
    listaProducto.innerHTML = "";
  }
  if (inpCantidad) inpCantidad.value = "1";
  if (selEstado)   selEstado.value = "pendiente";
  if (txtNotas)    txtNotas.value = "";

  ventaProductosTmp = [];
  renderProductosModal();

  // cargar catálogo si aún no está
  if (!productosCatalogo.length) {
    await cargarProductosCatalogo();
  }
}

function cerrarModalVenta() {
  if (!modalVenta) return;
  modalVenta.style.display = "none";
}

if (btnNuevaVenta) {
  btnNuevaVenta.addEventListener("click", () => {
    abrirModalVenta();
  });
}
if (btnCancelarVenta) {
  btnCancelarVenta.addEventListener("click", cerrarModalVenta);
}

if (btnGuardarVenta) {
  btnGuardarVenta.addEventListener("click", guardarVenta);
}

// Agregar producto al mini-carrito
if (btnAgregarProd) {
  btnAgregarProd.addEventListener("click", () => {
    agregarProductoALaVenta();
  });
}

function agregarProductoALaVenta() {
  if (!inpProducto || !inpCantidad) return;

  const codigoReal = (inpProducto.dataset.codigoReal || "").trim().toUpperCase();
  const cantidad   = parseInt(inpCantidad.value || "1", 10) || 1;

  if (!codigoReal || cantidad <= 0) {
    mostrarMensaje("Elegí un producto del buscador y poné una cantidad válida.", true);
    return;
  }

  const prod = productosCatalogo.find((p) => p.codigo === codigoReal);
  if (!prod) {
    mostrarMensaje("El producto seleccionado no existe en el catálogo.", true);
    return;
  }

  // ====== CONTROL DE STOCK AL ARMAR EL CARRITO ======
  const existente     = ventaProductosTmp.find((p) => p.codigo === codigoReal);
  const yaEnCarrito   = existente ? existente.cantidad : 0;
  const totalDeseado  = yaEnCarrito + cantidad;

  if (totalDeseado > prod.stock) {
    mostrarMensaje(
      `Stock insuficiente para ${prod.codigo}. Disponible: ${prod.stock}, intentás vender: ${totalDeseado}.`,
      true
    );
    return;
  }
  // ==================================================

  if (existente) {
    existente.cantidad = totalDeseado;
  } else {
    ventaProductosTmp.push({
      codigo: prod.codigo,
      nombre: prod.nombre || "",
      precio: prod.precio || 0,
      cantidad,
    });
  }

  // limpiar inputs
  inpProducto.value = "";
  inpProducto.dataset.codigoReal = "";
  inpCantidad.value = "1";
  if (listaProducto) {
    listaProducto.style.display = "none";
    listaProducto.innerHTML = "";
  }

  renderProductosModal();
}

function quitarProductoDeVenta(codigo) {
  ventaProductosTmp = ventaProductosTmp.filter((p) => p.codigo !== codigo);
  renderProductosModal();
}

function renderProductosModal() {
  if (!tablaProdBody) return;

  if (!ventaProductosTmp.length) {
    tablaProdBody.innerHTML = `
      <tr>
        <td colspan="6" class="texto-centro">Todavía no agregaste productos.</td>
      </tr>
    `;
    if (labelTotalPrev) labelTotalPrev.textContent = "$0";
    return;
  }

  tablaProdBody.innerHTML = "";

  let total = 0;

  ventaProductosTmp.forEach((p) => {
    const subtotal = (p.precio || 0) * (p.cantidad || 0);
    total += subtotal;

    const tr = document.createElement("tr");

    const tdCod = document.createElement("td");
    tdCod.textContent = p.codigo;

    const tdNom = document.createElement("td");
    tdNom.textContent = p.nombre || "-";

    const tdCant = document.createElement("td");
    tdCant.textContent = p.cantidad;

    const tdPrecio = document.createElement("td");
    tdPrecio.classList.add("texto-derecha");
    tdPrecio.textContent = "$ " + (p.precio || 0).toLocaleString("es-AR");

    const tdSub = document.createElement("td");
    tdSub.classList.add("texto-derecha");
    tdSub.textContent = "$ " + subtotal.toLocaleString("es-AR");

    const tdAcc = document.createElement("td");
    tdAcc.classList.add("texto-centro");
    const btnQuitar = document.createElement("button");
    btnQuitar.textContent = "X";
    btnQuitar.classList.add("btn-mini-quitar");
    btnQuitar.addEventListener("click", () => quitarProductoDeVenta(p.codigo));
    tdAcc.appendChild(btnQuitar);

    tr.appendChild(tdCod);
    tr.appendChild(tdNom);
    tr.appendChild(tdCant);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdSub);
    tr.appendChild(tdAcc);

    tablaProdBody.appendChild(tr);
  });

  if (labelTotalPrev) {
    labelTotalPrev.textContent = "$ " + total.toLocaleString("es-AR");
  }
}

// ---------------------------------------------------------------------------
// Guardar venta + DESCUENTO DE STOCK (con control de stock insuficiente)
// ---------------------------------------------------------------------------

async function guardarVenta() {
  try {
    const clienteId = selCliente?.value || "";
    const estado    = selEstado?.value || "pendiente";
    const notas     = txtNotas?.value.trim() || "";

    if (!clienteId) {
      mostrarMensaje("Seleccioná un cliente.", true);
      return;
    }

    if (!ventaProductosTmp.length) {
      mostrarMensaje("Agregá al menos un producto a la venta.", true);
      return;
    }

    const cliente = clientes.find((c) => c.id === clienteId);
    const clienteNombre = cliente ? cliente.nombre : "";

    const productosFinal = [];
    let total = 0;

    const stockUpdates = [];

    // Recorremos cada producto de la venta
    for (const p of ventaProductosTmp) {
      let precioUnit = p.precio || 0;

      try {
        const prodRef  = doc(db, "productos", p.codigo);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const data = prodSnap.data();
          const precioDoc =
            Number(data.precio ?? data.PrecioMayorista ?? 0) || 0;
          if (precioDoc) precioUnit = precioDoc;

          const stockActual =
            Number(data.stock ?? data.Stock ?? 0) || 0;

          // ====== CONTROL DE STOCK EN FIRESTORE ANTES DE GUARDAR ======
          if (p.cantidad > stockActual) {
            mostrarMensaje(
              `No hay stock suficiente para ${p.codigo}. Disponible: ${stockActual}, intentás vender: ${p.cantidad}.`,
              true
            );
            return; // cancelamos toda la venta
          }
          // ==============================================================

          let nuevoStock = stockActual - p.cantidad;
          if (nuevoStock < 0) nuevoStock = 0;

          stockUpdates.push({
            ref: prodRef,
            nuevoStock,
          });
        } else {
          console.warn("Producto no encontrado al actualizar stock:", p.codigo);
        }
      } catch (err) {
        console.error("Error leyendo producto para stock:", p.codigo, err);
      }

      const subtotal = precioUnit * p.cantidad;
      total += subtotal;

      productosFinal.push({
        codigo: p.codigo,
        cantidad: p.cantidad,
        precio: precioUnit,
      });
    }

    const ventaData = {
      fecha: serverTimestamp(),
      clienteId,
      clienteNombre,
      estado,
      notas,
      total,
      productos: productosFinal,
    };

    // 1) Registramos la venta
    await addDoc(collection(db, "ventas"), ventaData);

    // 2) Actualizamos el stock de cada producto
    for (const u of stockUpdates) {
      try {
        await updateDoc(u.ref, { stock: u.nuevoStock });
      } catch (err) {
        console.error("Error actualizando stock para producto:", err);
      }
    }

    mostrarMensaje("Venta registrada y stock actualizado 👍");
    cerrarModalVenta();
    cargarVentas();
    cargarEstadisticasVentas(); // refrescamos totales
  } catch (err) {
    console.error("Error guardando venta:", err);
    mostrarMensaje("Error al guardar la venta.", true);
  }
}

// ---------------------------------------------------------------------------
// Autocomplete de producto (nombre / código)
// ---------------------------------------------------------------------------

if (inpProducto && listaProducto) {
  inpProducto.addEventListener("input", () => {
    const texto = inpProducto.value.trim().toLowerCase();

    inpProducto.dataset.codigoReal = "";

    if (!texto || !productosCatalogo.length) {
      listaProducto.style.display = "none";
      listaProducto.innerHTML = "";
      return;
    }

    const filtrados = productosCatalogo
      .filter((p) => {
        const n = (p.nombre || "").toLowerCase();
        const c = (p.codigo || "").toLowerCase();
        return n.includes(texto) || c.includes(texto);
      })
      .slice(0, 12);

    if (!filtrados.length) {
      listaProducto.style.display = "none";
      listaProducto.innerHTML = "";
      return;
    }

    listaProducto.innerHTML = filtrados
      .map(
        (p) => `
        <div class="autocomplete-item" data-codigo="${p.codigo}">
          <strong>${p.codigo}</strong> — ${p.nombre || "Sin nombre"}
          ${
            Number.isFinite(p.stock)
              ? `<span style="opacity:0.7;"> · stock: ${p.stock}</span>`
              : ""
          }
        </div>`
      )
      .join("");

    listaProducto.style.display = "block";
  });

  listaProducto.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (!item) return;

    const codigo = item.dataset.codigo || "";
    const prod   = productosCatalogo.find((p) => p.codigo === codigo);

    if (!prod) return;

    inpProducto.value = `${prod.codigo} — ${prod.nombre || ""}`.trim();
    inpProducto.dataset.codigoReal = prod.codigo;

    listaProducto.style.display = "none";
    listaProducto.innerHTML = "";
  });

  // Cerrar la lista si clickeás fuera
  document.addEventListener("click", (e) => {
    if (
      !listaProducto.contains(e.target) &&
      e.target !== inpProducto
    ) {
      listaProducto.style.display = "none";
    }
  });
}

// ---------------------------------------------------------------------------
// Eventos de filtros
// ---------------------------------------------------------------------------

if (buscarVenta) {
  buscarVenta.addEventListener("input", aplicarFiltros);
}
if (filtroEstado) {
  filtroEstado.addEventListener("change", aplicarFiltros);
}

// ---------------------------------------------------------------------------
// VER / OCULTAR PANEL DE ESTADÍSTICAS
// ---------------------------------------------------------------------------

function initToggleEstadisticas() {
  if (!btnToggleEstadisticas || !panelEstadisticas) return;

  // Estado inicial: oculto (la clase .oculto ya viene desde el HTML/CSS)
  panelEstadisticas.classList.add("oculto");
  btnToggleEstadisticas.textContent = "👁️ Ver estadísticas";

  btnToggleEstadisticas.addEventListener("click", () => {
    const estaOculto = panelEstadisticas.classList.toggle("oculto");

    if (estaOculto) {
      btnToggleEstadisticas.textContent = "👁️ Ver estadísticas";
    } else {
      btnToggleEstadisticas.textContent = "🙈 Ocultar estadísticas";
    }
  });
}

// Como el script está al final del body, el DOM ya está listo:
initToggleEstadisticas();
