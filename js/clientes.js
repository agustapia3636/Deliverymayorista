// js/clientes.js
import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// DOM
const tablaClientes = document.getElementById("tablaClientes");
const buscarCliente = document.getElementById("buscarCliente");

const formCliente = document.getElementById("formCliente");
const clienteIdInput = document.getElementById("clienteId");
const cliNombre = document.getElementById("cliNombre");
const cliTelefono = document.getElementById("cliTelefono");
const cliEmail = document.getElementById("cliEmail");
const cliDireccion = document.getElementById("cliDireccion");
const cliNotas = document.getElementById("cliNotas");
const btnGuardarCliente = document.getElementById("btnGuardarCliente");
const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
const msgCliente = document.getElementById("msgCliente");
const btnLogout = document.getElementById("logoutBtn");

let clientes = [];
let editandoId = null;

// ----------------------
// SESIÓN
// ----------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await cargarClientes();
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ----------------------
// CARGAR CLIENTES
// ----------------------
async function cargarClientes() {
  tablaClientes.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  const ref = collection(db, "clientes");
  const snap = await getDocs(ref);

  clientes = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  renderClientes(clientes);
}

function renderClientes(lista) {
  tablaClientes.innerHTML = "";

  if (lista.length === 0) {
    tablaClientes.innerHTML = `<tr><td colspan="5">No hay clientes cargados.</td></tr>`;
    return;
  }

  lista.forEach(c => {
    const tr = document.createElement("tr");

    const contacto = [
      c.telefono || "",
      c.email || ""
    ].filter(Boolean).join(" · ");

    tr.innerHTML = `
      <td>${c.nombre || ""}</td>
      <td>${contacto || "-"}</td>
      <td>${c.direccion || "-"}</td>
      <td>
        ${c.notas ? `<span class="badge">${c.notas}</span>` : "-"}
      </td>
      <td>
        <button class="btn-mini editar" data-id="${c.id}">Editar</button>
        <button class="btn-mini eliminar" data-id="${c.id}">Eliminar</button>
      </td>
    `;

    tablaClientes.appendChild(tr);
  });

  activarBotonesFila();
}

// ----------------------
// BUSCADOR
// ----------------------
buscarCliente.addEventListener("input", () => {
  const q = buscarCliente.value.toLowerCase();
  const filtrados = clientes.filter(c => {
    const nombre = (c.nombre || "").toLowerCase();
    const tel = (c.telefono || "").toLowerCase();
    const mail = (c.email || "").toLowerCase();
    return nombre.includes(q) || tel.includes(q) || mail.includes(q);
  });
  renderClientes(filtrados);
});

// ----------------------
// FORM ALTA / EDICIÓN
// ----------------------
formCliente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombre: cliNombre.value.trim(),
    telefono: cliTelefono.value.trim(),
    email: cliEmail.value.trim(),
    direccion: cliDireccion.value.trim(),
    notas: cliNotas.value.trim()
  };

  if (!data.nombre) {
    setMsg("El nombre es obligatorio.", "error");
    return;
  }

  btnGuardarCliente.disabled = true;
  setMsg("Guardando...", "ok");

  try {
    if (editandoId) {
      await updateDoc(doc(db, "clientes", editandoId), data);
      setMsg("Cliente actualizado correctamente ✔️", "ok");
    } else {
      await addDoc(collection(db, "clientes"), data);
      setMsg("Cliente creado correctamente ✔️", "ok");
    }

    resetForm();
    await cargarClientes();
  } catch (err) {
    console.error(err);
    setMsg("Error al guardar el cliente.", "error");
  } finally {
    btnGuardarCliente.disabled = false;
  }
});

btnCancelarEdicion.addEventListener("click", () => {
  resetForm();
});

function setMsg(text, type = "error") {
  msgCliente.textContent = text;
  msgCliente.className = "msg " + (type === "ok" ? "ok" : "error");
}

function resetForm() {
  editandoId = null;
  clienteIdInput.value = "";
  formCliente.reset();
  btnGuardarCliente.textContent = "Guardar cliente";
  btnCancelarEdicion.style.display = "none";
}

// ----------------------
// BOTONES EDITAR / ELIMINAR
// ----------------------
function activarBotonesFila() {
  document.querySelectorAll(".btn-mini.editar").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const c = clientes.find(x => x.id === id);
      if (!c) return;

      editandoId = id;
      clienteIdInput.value = id;
      cliNombre.value = c.nombre || "";
      cliTelefono.value = c.telefono || "";
      cliEmail.value = c.email || "";
      cliDireccion.value = c.direccion || "";
      cliNotas.value = c.notas || "";

      btnGuardarCliente.textContent = "Actualizar cliente";
      btnCancelarEdicion.style.display = "block";
      setMsg("Editando cliente...", "ok");
    });
  });

  document.querySelectorAll(".btn-mini.eliminar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const c = clientes.find(x => x.id === id);
      if (!c) return;

      if (!confirm(`¿Eliminar al cliente "${c.nombre}"?`)) return;

      await deleteDoc(doc(db, "clientes", id));
      setMsg("Cliente eliminado.", "ok");
      await cargarClientes();
    });
  });
}
