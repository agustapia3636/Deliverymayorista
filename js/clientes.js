// js/clientes.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----------------------
// DOM
// ----------------------
const tablaClientes       = document.getElementById("tablaClientes");
const buscarCliente       = document.getElementById("buscarCliente");

const formCliente         = document.getElementById("formCliente");
const clienteIdInput      = document.getElementById("clienteId");
const cliNombre           = document.getElementById("cliNombre");
const cliTelefono         = document.getElementById("cliTelefono");
const cliEmail            = document.getElementById("cliEmail");
const cliDireccion        = document.getElementById("cliDireccion");
const cliNotas            = document.getElementById("cliNotas");
const btnGuardarCliente   = document.getElementById("btnGuardarCliente");
const btnCancelarEdicion  = document.getElementById("btnCancelarEdicion");
const msgCliente          = document.getElementById("msgCliente");
const btnLogout           = document.getElementById("logoutBtn");

let clientes   = [];
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

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// ----------------------
// CARGAR CLIENTES
// ----------------------
async function cargarClientes() {
  if (!tablaClientes) return;

  tablaClientes.innerHTML =
    `<tr><td colspan="5" class="texto-centro">Cargando clientes...</td></tr>`;

  try {
    const ref  = collection(db, "clientes");
    const snap = await getDocs(ref);

    clientes = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    renderClientes(clientes);
  } catch (err) {
    console.error("Error cargando clientes:", err);
    tablaClientes.innerHTML =
      `<tr><td colspan="5" class="texto-centro">Error al cargar clientes.</td></tr>`;
  }
}

function renderClientes(lista) {
  if (!tablaClientes) return;

  tablaClientes.innerHTML = "";

  if (!lista.length) {
    tablaClientes.innerHTML =
      `<tr><td colspan="5" class="texto-centro">No hay clientes cargados.</td></tr>`;
    return;
  }

  lista.forEach((c) => {
    const tr = document.createElement("tr");

    const contacto = [c.telefono || "", c.email || ""]
      .filter(Boolean)
      .join(" · ");

    tr.innerHTML = `
      <td>${c.nombre || ""}</td>
      <td>${contacto || "-"}</td>
      <td>${c.direccion || "-"}</td>
      <td>${c.notas ? `<span class="badge">${c.notas}</span>` : "-"}</td>
      <td>
        <button class="btn-mini historial"
                data-id="${c.id}"
                data-nombre="${c.nombre || ""}">
          Historial
        </button>
        <button class="btn-mini editar"
                data-id="${c.id}">
          Editar
        </button>
        <button class="btn-mini eliminar"
                data-id="${c.id}">
          Eliminar
        </button>
      </td>
    `;

    tablaClientes.appendChild(tr);
  });

  activarBotonesFila();
}

// ----------------------
// BUSCADOR
// ----------------------
if (buscarCliente) {
  buscarCliente.addEventListener("input", () => {
    const q = buscarCliente.value.toLowerCase();

    const filtrados = clientes.filter((c) => {
      const nombre = (c.nombre || "").toLowerCase();
      const tel    = (c.telefono || "").toLowerCase();
      const mail   = (c.email || "").toLowerCase();
      return (
        nombre.includes(q) ||
        tel.includes(q) ||
        mail.includes(q)
      );
    });

    renderClientes(filtrados);
  });
}

// ----------------------
// FORM ALTA / EDICIÓN
// ----------------------
if (formCliente) {
  formCliente.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      nombre:    cliNombre.value.trim(),
      telefono:  cliTelefono.value.trim(),
      email:     cliEmail.value.trim(),
      direccion: cliDireccion.value.trim(),
      notas:     cliNotas.value.trim(),
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
      console.error("Error al guardar cliente:", err);
      setMsg("Error al guardar el cliente.", "error");
    } finally {
      btnGuardarCliente.disabled = false;
    }
  });
}

if (btnCancelarEdicion) {
  btnCancelarEdicion.addEventListener("click", () => {
    resetForm();
  });
}

// ----------------------
// UTILIDADES UI
// ----------------------
function setMsg(text, type = "error") {
  if (!msgCliente) return;
  msgCliente.textContent = text;
  msgCliente.className = "msg " + (type === "ok" ? "ok" : "error");
}

function resetForm() {
  editandoId = null;
  if (clienteIdInput) clienteIdInput.value = "";
  if (formCliente) formCliente.reset();
  if (btnGuardarCliente) btnGuardarCliente.textContent = "Guardar cliente";
  if (btnCancelarEdicion) btnCancelarEdicion.style.display = "none";
  setMsg("", "ok");
}

// ----------------------
// BOTONES (EDITAR / ELIMINAR / HISTORIAL)
// ----------------------
function activarBotonesFila() {
  // EDITAR
  document.querySelectorAll(".btn-mini.editar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const c  = clientes.find((x) => x.id === id);
      if (!c) return;

      editandoId           = id;
      if (clienteIdInput)  clienteIdInput.value = id;
      if (cliNombre)       cliNombre.value = c.nombre || "";
      if (cliTelefono)     cliTelefono.value = c.telefono || "";
      if (cliEmail)        cliEmail.value = c.email || "";
      if (cliDireccion)    cliDireccion.value = c.direccion || "";
      if (cliNotas)        cliNotas.value = c.notas || "";

      if (btnGuardarCliente)
        btnGuardarCliente.textContent = "Actualizar cliente";
      if (btnCancelarEdicion)
        btnCancelarEdicion.style.display = "block";

      setMsg("Editando cliente...", "ok");
    });
  });

  // ELIMINAR
  document.querySelectorAll(".btn-mini.eliminar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const c  = clientes.find((x) => x.id === id);
      if (!c) return;

      if (!confirm(`¿Eliminar al cliente "${c.nombre}"?`)) return;

      try {
        await deleteDoc(doc(db, "clientes", id));
        setMsg("Cliente eliminado.", "ok");
        await cargarClientes();
      } catch (err) {
        console.error("Error eliminando cliente:", err);
        setMsg("Error al eliminar el cliente.", "error");
      }
    });
  });

  // HISTORIAL
  document.querySelectorAll(".btn-mini.historial").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id     = e.currentTarget.dataset.id;
      const nombre = e.currentTarget.dataset.nombre || "";

      const url = `historial.html?clienteId=${encodeURIComponent(
        id
      )}&nombre=${encodeURIComponent(nombre)}`;

      window.location.href = url;
    });
  });
}
