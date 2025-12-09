import { auth, db } from "./firebase-init.js";
import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// DOM
const logoutBtn      = document.getElementById("logoutBtn");
const buscarVenta    = document.getElementById("buscarVenta");
const btnNuevaVenta  = document.getElementById("btnNuevaVenta");
const tablaVentas    = document.getElementById("tablaVentas");
const msgVentas      = document.getElementById("msgVentas");
const subTitulo      = document.getElementById("subTituloVentas");

// Modal
const modalVenta     = document.getElementById("modalVenta");
const selCliente     = document.getElementById("ventaCliente");
const inpCodigo      = document.getElementById("ventaCodigo");
const inpCantidad    = document.getElementById("ventaCantidad");
const selEstado      = document.getElementById("ventaEstado");
const txtNotas       = document.getElementById("ventaNotas");
const btnCancelar    = document.getElementById("btnCancelarVenta");
const btnGuardar     = document.getElementById("btnGuardarVenta");

// Datos en memoria
let ventas    = [];
let clientes  = [];
let productos = [];

// SESIÓN
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  init();
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// INIT
async function init() {
  await cargarClientesSelect();
  await cargarProductos();
  await cargarVentas();
  aplicarFiltroPorURL();
}

// CARGAR CLIENTES PARA EL SELECT
async function cargarClientesSelect() {
  selCliente.innerHTML = "";

  const snap = await getDocs(collection(db, "clientes"));
  clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (clientes.length === 0) {
    selCliente.innerHTML = `<option value="">No hay clientes</option>`;
    return;
  }

  clientes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre || c.email || c.id;
    selCliente.appendChild(opt);
  });
}

// CARGAR PRODUCTOS A MEMORIA
async function cargarProductos() {
  const snap = await getDocs(collection(db, "productos"));
  productos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// CARGAR VENTAS
async function cargarVentas() {
  tablaVentas.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

  const qVentas = query(collection(db, "ventas"), orderBy("fecha", "desc"));
  const snap = await getDocs(qVentas);

  ventas = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderVentas(ventas);
}

function renderVentas(lista) {
  tablaVentas.innerHTML = "";

  if (lista.length === 0) {
    tablaVentas.innerHTML = `<tr><td colspan="8">No hay ventas registradas.</td></tr>`;
    return;
  }

  lista.forEach(v => {
    const fecha = v.fecha?.toDate
      ? v.fecha.toDate().toLocaleString()
      : "-";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${fecha}</td>
      <td>${v.clienteNombre || "-"}</td>
      <td>${v.productoCodigo || ""} - ${v.productoNombre || "-"}</td>
      <td>${v.cantidad ?? "-"}</td>
      <td>$${(v.total ?? 0).toLocaleString("es-AR")}</td>
      <td><span class="badge">${v.estado || "pendiente"}</span></td>
      <td>${v.notas || "-"}</td>
      <td>
        <button class="btn-mini estado" data-id="${v.id}">Cambiar estado</button>
        <button class="btn-mini eliminar" data-id="${v.id}">Eliminar</button>
      </td>
    `;
    tablaVentas.appendChild(fila);
  });

  activarBotonesFila();
}

// BUSCADOR → esto te da "historial" del cliente si escribís su nombre
buscarVenta.addEventListener("input", () => {
  const q = buscarVenta.value.toLowerCase();
  const filtradas = ventas.filter(v => {
    const cliente  = (v.clienteNombre  || "").toLowerCase();
    const producto = (v.productoNombre || "").toLowerCase();
    const codigo   = (v.productoCodigo || "").toLowerCase();
    const estado   = (v.estado         || "").toLowerCase();
    return (
      cliente.includes(q)  ||
      producto.includes(q) ||
      codigo.includes(q)   ||
      estado.includes(q)
    );
  });
  renderVentas(filtradas);
});

// BOTONES DE TABLA
function activarBotonesFila() {
  document.querySelectorAll(".btn-mini.eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!confirm("¿Eliminar esta venta?")) return;
      await deleteDoc(doc(db, "ventas", id));
      setMsg("Venta eliminada.");
      await cargarVentas();
    });
  });

  document.querySelectorAll(".btn-mini.estado").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const venta = ventas.find(v => v.id === id);
      if (!venta) return;

      const nuevoEstado = prompt(
        'Nuevo estado (pendiente, pagado, entregado):',
        venta.estado || "pendiente"
      );
      if (!nuevoEstado) return;

      await updateDoc(doc(db, "ventas", id), { estado: nuevoEstado.toLowerCase() });
      setMsg("Estado actualizado.");
      await cargarVentas();
    });
  });
}

// MODAL NUEVA VENTA
btnNuevaVenta.addEventListener("click", () => {
  if (clientes.length === 0) {
    alert("Primero debes cargar al menos un cliente.");
    return;
  }
  inpCodigo.value   = "";
  inpCantidad.value = "1";
  selEstado.value   = "pendiente";
  txtNotas.value    = "";
  modalVenta.style.display = "flex";
});

btnCancelar.addEventListener("click", () => {
  modalVenta.style.display = "none";
});

btnGuardar.addEventListener("click", async () => {
  const clienteId = selCliente.value;
  const cliente = clientes.find(c => c.id === clienteId);

  const codigo   = (inpCodigo.value || "").trim();
  const cantidad = parseInt(inpCantidad.value, 10);
  const estado   = selEstado.value;
  const notas    = txtNotas.value.trim();

  if (!cliente) {
    alert("Seleccioná un cliente.");
    return;
  }
  if (!codigo) {
    alert("Ingresá el código del producto.");
    return;
  }
  if (isNaN(cantidad) || cantidad <= 0) {
    alert("Ingresá una cantidad válida.");
    return;
  }

  // Buscar producto por código (campo "codigo" en productos)
  const producto = productos.find(p =>
    (p.codigo || p.id || "").toString().toLowerCase() === codigo.toLowerCase()
  );

  if (!producto) {
    alert("No se encontró ningún producto con ese código.");
    return;
  }

  const stockActual = producto.stock ?? 0;
  if (stockActual < cantidad) {
    alert(`No hay stock suficiente. Stock actual: ${stockActual}`);
    return;
  }

  const precioUnitario = producto.precio ?? 0;  // usamos el campo "precio"
  const total = precioUnitario * cantidad;

  // Guardar venta
  await addDoc(collection(db, "ventas"), {
    clienteId,
    clienteNombre: cliente.nombre || cliente.email || "",
    productoId: producto.id,
    productoCodigo: producto.codigo || producto.id,
    productoNombre: producto.nombre || "",
    cantidad,
    total,
    estado,
    notas,
    fecha: serverTimestamp()
  });

  // Descontar stock automáticamente
  await updateDoc(doc(db, "productos", producto.id), {
    stock: stockActual - cantidad
  });
  // Actualizamos también en memoria
  producto.stock = stockActual - cantidad;

  modalVenta.style.display = "none";
  setMsg("Venta registrada y stock actualizado.");
  await cargarVentas();
});

// UTILIDAD
function setMsg(texto) {
  msgVentas.textContent = texto;
  setTimeout(() => (msgVentas.textContent = ""), 4000);
}

// Permite que en el futuro llames ventas.html?cliente=ID&nombre=Juan
// y te muestre ese cliente en el subtítulo y podés filtrar con su nombre.
function aplicarFiltroPorURL() {
  const params = new URLSearchParams(window.location.search);
  const nombreCliente = params.get("nombre");

  if (nombreCliente) {
    subTitulo.textContent = `Historial de compras de: ${nombreCliente}`;
    buscarVenta.value = nombreCliente;
    buscarVenta.dispatchEvent(new Event("input"));
  }
}
