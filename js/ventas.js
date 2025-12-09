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

const modalVenta     = document.getElementById("modalVenta");
const selCliente     = document.getElementById("ventaCliente");
const inpTotal       = document.getElementById("ventaTotal");
const selEstado      = document.getElementById("ventaEstado");
const txtNotas       = document.getElementById("ventaNotas");
const btnCancelar    = document.getElementById("btnCancelarVenta");
const btnGuardar     = document.getElementById("btnGuardarVenta");

let ventas   = [];
let clientes = [];

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
  await cargarVentas();
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

// CARGAR VENTAS
async function cargarVentas() {
  tablaVentas.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;

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
    tablaVentas.innerHTML = `<tr><td colspan="6">No hay ventas registradas.</td></tr>`;
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

// BUSCADOR
buscarVenta.addEventListener("input", () => {
  const q = buscarVenta.value.toLowerCase();
  const filtradas = ventas.filter(v => {
    const cliente = (v.clienteNombre || "").toLowerCase();
    const estado  = (v.estado || "").toLowerCase();
    return cliente.includes(q) || estado.includes(q);
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
  inpTotal.value = "";
  selEstado.value = "pendiente";
  txtNotas.value = "";
  modalVenta.style.display = "flex";
});

btnCancelar.addEventListener("click", () => {
  modalVenta.style.display = "none";
});

btnGuardar.addEventListener("click", async () => {
  const clienteId = selCliente.value;
  const cliente = clientes.find(c => c.id === clienteId);

  const total = parseFloat(inpTotal.value || "0");
  const estado = selEstado.value;
  const notas  = txtNotas.value.trim();

  if (!cliente) {
    alert("Seleccioná un cliente.");
    return;
  }
  if (isNaN(total) || total <= 0) {
    alert("Ingresá un total válido.");
    return;
  }

  await addDoc(collection(db, "ventas"), {
    clienteId,
    clienteNombre: cliente.nombre || cliente.email || "",
    total,
    estado,
    notas,
    fecha: serverTimestamp()
  });

  modalVenta.style.display = "none";
  setMsg("Venta registrada correctamente.");
  await cargarVentas();
});

// UTILIDAD
function setMsg(texto) {
  msgVentas.textContent = texto;
  setTimeout(() => msgVentas.textContent = "", 4000);
}
