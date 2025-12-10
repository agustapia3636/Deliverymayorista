// js/ventas.js
// Panel de ventas PRO: listado, filtros, estados y alta rápida de ventas

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

// DOM
const logoutBtn       = document.getElementById("logoutBtn");
const tablaVentasBody = document.getElementById("tablaVentas");
const buscarVenta     = document.getElementById("buscarVenta");
const filtroEstado    = document.getElementById("filtroEstado");
const msgVentas       = document.getElementById("msgVentas");
const subTitulo       = document.getElementById("subTituloVentas");

const btnNuevaVenta   = document.getElementById("btnNuevaVenta");
const modalVenta      = document.getElementById("modalVenta");
const selCliente      = document.getElementById("ventaCliente");
const inpCodigo       = document.getElementById("ventaCodigo");
const inpCantidad     = document.getElementById("ventaCantidad");
const selEstado       = document.getElementById("ventaEstado");
const txtNotas        = document.getElementById("ventaNotas");
const btnCancelarVenta= document.getElementById("btnCancelarVenta");
const btnGuardarVenta = document.getElementById("btnGuardarVenta");

let ventas  = []; // todas las ventas
let clientes = []; // clientes para el combo

// --------- Auth y carga inicial ----------

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
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// --------- Utilidades UI ----------

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

// --------- Cargar CLIENTES para el selector ----------

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

// --------- Cargar VENTAS desde Firestore ----------

async function cargarVentas() {
  if (!tablaVentasBody) return;

  tablaVentasBody.innerHTML = `
    <tr>
      <td colspan="8" class="texto-centro">Cargando ventas...</td>
    </tr>
  `;

  try {
    const ref = collection(db, "ventas");
    const q   = query(ref, orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    ventas = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      let fecha = null;
      if (data.fecha && typeof data.fecha.toDate === "function") {
        fecha = data.fecha.toDate();
      }

      const clienteId   = data.clienteId || "";
      const clienteNombre = data.clienteNombre || "";
      const total       = Number(data.total) || 0;
      const estado      = data.estado || "pendiente";
      const notas       = data.notas || "";
      const productos   = Array.isArray(data.productos) ? data.productos : [];

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

// --------- Filtros y render ----------

function aplicarFiltros() {
  const texto = (buscarVenta?.value || "").toLowerCase();
  const estadoFiltro = (filtroEstado?.value || "").toLowerCase();

  const filtradas = ventas.filter((v) => {
    // filtro estado
    if (estadoFiltro && v.estado.toLowerCase() !== estadoFiltro) {
      return false;
    }

    // búsqueda de texto
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

    // Fecha
    const tdFecha = document.createElement("td");
    tdFecha.textContent = v.fecha ? formatearFecha(v.fecha) : "-";

    // Cliente
    const tdCliente = document.createElement("td");
    tdCliente.textContent = v.clienteNombre || v.clienteId || "-";

    // Productos (primero y resumen)
    const tdProductos = document.createElement("td");
    if (!v.productos || !v.productos.length) {
      tdProductos.textContent = "-";
    } else {
      const primero = v.productos[0];
      const resto = v.productos.length - 1;
      const texto = `${primero.codigo || "Prod"} x${primero.cantidad || 1}` +
                    (resto > 0 ? ` (+${resto} más)` : "");
      tdProductos.textContent = texto;
    }

    // Cantidad total
    const tdCant = document.createElement("td");
    const totalCant = (v.productos || []).reduce(
      (acc, p) => acc + (Number(p.cantidad) || 0),
      0
    );
    tdCant.textContent = totalCant || "-";

    // Total
    const tdTotal = document.createElement("td");
    tdTotal.textContent = "$ " + (v.total || 0).toLocaleString("es-AR");

    // Estado con badge
    const tdEstado = document.createElement("td");
    tdEstado.appendChild(crearBadgeEstado(v.estado));

    // Notas (resumen)
    const tdNotas = document.createElement("td");
    const notas = v.notas || "";
    const corto =
      notas.length > 40 ? notas.slice(0, 40).trim() + "…" : notas;
    tdNotas.textContent = corto || "-";
    if (notas) tdNotas.title = notas;

    // Acciones
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

// --------- Cambiar estado / eliminar ----------

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
  } catch (err) {
    console.error("Error eliminando venta:", err);
    mostrarMensaje("Error al eliminar venta.", true);
  }
}

// --------- Modal NUEVA VENTA ----------

function abrirModalVenta() {
  if (!modalVenta) return;
  modalVenta.style.display = "flex";
  // reset campos
  if (selCliente) selCliente.value = "";
  if (inpCodigo)  inpCodigo.value = "";
  if (inpCantidad) inpCantidad.value = "1";
  if (selEstado)  selEstado.value = "pendiente";
  if (txtNotas)   txtNotas.value = "";
}

function cerrarModalVenta() {
  if (!modalVenta) return;
  modalVenta.style.display = "none";
}

if (btnNuevaVenta) {
  btnNuevaVenta.addEventListener("click", abrirModalVenta);
}
if (btnCancelarVenta) {
  btnCancelarVenta.addEventListener("click", cerrarModalVenta);
}

if (btnGuardarVenta) {
  btnGuardarVenta.addEventListener("click", guardarVenta);
}

async function guardarVenta() {
  try {
    const clienteId = selCliente?.value || "";
    const codigo    = inpCodigo?.value.trim().toUpperCase() || "";
    const cantidad  = parseInt(inpCantidad?.value || "1", 10) || 1;
    const estado    = selEstado?.value || "pendiente";
    const notas     = txtNotas?.value.trim() || "";

    if (!clienteId || !codigo || cantidad <= 0) {
      mostrarMensaje("Completá cliente, código y cantidad.", true);
      return;
    }

    // Buscar info del cliente para guardar nombre
    const cliente = clientes.find((c) => c.id === clienteId);
    const clienteNombre = cliente ? cliente.nombre : "";

    // Buscar producto por código (id del doc = código)
    const prodRef  = doc(db, "productos", codigo);
    const prodSnap = await getDoc(prodRef);

    if (!prodSnap.exists()) {
      mostrarMensaje(`No existe producto con código ${codigo}.`, true);
      return;
    }

    const prodData = prodSnap.data();
    const precioUnit =
      Number(prodData.precio ?? prodData.PrecioMayorista ?? 0) || 0;

    if (!precioUnit) {
      mostrarMensaje(
        "El producto no tiene precio mayorista configurado.",
        true
      );
      return;
    }

    const total = precioUnit * cantidad;

    const ventaData = {
      fecha: serverTimestamp(),
      clienteId,
      clienteNombre,
      estado,
      notas,
      total,
      productos: [
        {
          codigo,
          cantidad,
          precio: precioUnit,
        },
      ],
    };

    await addDoc(collection(db, "ventas"), ventaData);

    mostrarMensaje("Venta registrada correctamente.");
    cerrarModalVenta();
    cargarVentas();
  } catch (err) {
    console.error("Error guardando venta:", err);
    mostrarMensaje("Error al guardar la venta.", true);
  }
}

// --------- Eventos de filtros ----------

if (buscarVenta) {
  buscarVenta.addEventListener("input", aplicarFiltros);
}
if (filtroEstado) {
  filtroEstado.addEventListener("change", aplicarFiltros);
}
