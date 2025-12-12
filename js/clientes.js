// js/clientes.js
import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, limit, getDocs as getDocsQ
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ----------------------
// DOM
// ----------------------
const tablaClientes      = document.getElementById("tablaClientes");
const buscarCliente      = document.getElementById("buscarCliente");

const formCliente        = document.getElementById("formCliente");
const clienteIdInput     = document.getElementById("clienteId");
const cliNombre          = document.getElementById("cliNombre");
const cliTelefono        = document.getElementById("cliTelefono");
const cliEmail           = document.getElementById("cliEmail");
const cliDireccion       = document.getElementById("cliDireccion");
const cliNotas           = document.getElementById("cliNotas");
const cliTipo            = document.getElementById("cliTipo");
const cliCuenta          = document.getElementById("cliCuenta");
const cliNivel           = document.getElementById("cliNivel");

const btnGuardarCliente  = document.getElementById("btnGuardarCliente");
const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
const msgCliente         = document.getElementById("msgCliente");
const btnLogout          = document.getElementById("logoutBtn");

// Duplicados
const dupBox             = document.getElementById("dupBox");
const dupText            = document.getElementById("dupText");
const btnCargarDuplicado = document.getElementById("btnCargarDuplicado");
const btnIgnorarDuplicado= document.getElementById("btnIgnorarDuplicado");

// Stats
const statsTotalClientes = document.getElementById("statsTotalClientes");
const statsConTelefono   = document.getElementById("statsConTelefono");
const statsConEmail      = document.getElementById("statsConEmail");

// Modal historial
const modalHist          = document.getElementById("modalHistCliente");
const mhTitulo           = document.getElementById("mhTitulo");
const mhVentas           = document.getElementById("mhVentas");
const mhTotal            = document.getElementById("mhTotal");
const mhUltima           = document.getElementById("mhUltima");
const mhProm             = document.getElementById("mhProm");
const mhLista            = document.getElementById("mhLista");

let clientes = [];
let editandoId = null;

// Para duplicados
let _dupCandidate = null;
let _ignoreDup = false;

// ----------------------
// Utils
// ----------------------
const money = (n) => "$" + (Number(n || 0)).toLocaleString("es-AR");
const norm = (s) => String(s || "").trim().toLowerCase();
const normPhone = (s) => String(s || "").replace(/[^\d]/g, "");

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
  hideDup();
  cliNombre?.focus();
}

function showDup(cliente, motivo) {
  _dupCandidate = cliente;
  if (!dupBox) return;
  dupText.textContent = `${motivo}: "${cliente.nombre || "Sin nombre"}" (${cliente.telefono || "-"} · ${cliente.email || "-"})`;
  dupBox.style.display = "block";
}
function hideDup() {
  _dupCandidate = null;
  _ignoreDup = false;
  if (!dupBox) return;
  dupBox.style.display = "none";
}

function badgesFromCliente(c) {
  const tipo = (c.tipo || "minorista").toLowerCase();
  const cuenta = (c.cuenta || "ok").toLowerCase();
  const nivel = (c.nivel || "").toLowerCase();

  const out = [];
  out.push({ text: tipo === "mayorista" ? "Mayorista" : "Minorista", cls: "info" });
  out.push({ text: cuenta === "debe" ? "Debe" : "OK", cls: cuenta === "debe" ? "debe" : "ok" });
  if (nivel === "preferente") out.push({ text: "Preferente", cls: "warn" });
  return out;
}

function fillFormFromCliente(c) {
  editandoId = c.id;
  if (clienteIdInput) clienteIdInput.value = c.id;

  cliNombre.value    = c.nombre || "";
  cliTelefono.value  = c.telefono || "";
  cliEmail.value     = c.email || "";
  cliDireccion.value = c.direccion || "";
  cliNotas.value     = c.notas || "";

  if (cliTipo)   cliTipo.value = (c.tipo || "minorista");
  if (cliCuenta) cliCuenta.value = (c.cuenta || "ok");
  if (cliNivel)  cliNivel.value = (c.nivel || "");

  if (btnGuardarCliente) btnGuardarCliente.textContent = "Actualizar cliente";
  if (btnCancelarEdicion) btnCancelarEdicion.style.display = "block";

  setMsg("Editando cliente...", "ok");
  hideDup();
  cliNombre?.focus();
}

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

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ----------------------
// CARGAR CLIENTES
// ----------------------
async function cargarClientes() {
  if (!tablaClientes) return;

  tablaClientes.innerHTML = `<tr><td colspan="6" class="texto-centro">Cargando clientes...</td></tr>`;

  try {
    const ref = collection(db, "clientes");
    const snap = await getDocs(ref);

    clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // orden por nombre
    clientes.sort((a, b) => (a.nombre || "").localeCompare((b.nombre || ""), "es", { sensitivity: "base" }));

    renderClientes(clientes);
    renderStats(clientes);
  } catch (err) {
    console.error("Error cargando clientes:", err);
    tablaClientes.innerHTML = `<tr><td colspan="6" class="texto-centro">Error al cargar clientes.</td></tr>`;
  }
}

function renderStats(lista) {
  statsTotalClientes && (statsTotalClientes.textContent = String(lista.length));
  statsConTelefono && (statsConTelefono.textContent = String(lista.filter(c => normPhone(c.telefono).length > 0).length));
  statsConEmail && (statsConEmail.textContent = String(lista.filter(c => norm(c.email).length > 0).length));
}

// ----------------------
// RENDER TABLA
// ----------------------
function renderClientes(lista) {
  if (!tablaClientes) return;

  tablaClientes.innerHTML = "";

  if (!lista.length) {
    tablaClientes.innerHTML = `<tr><td colspan="6" class="texto-centro">No hay clientes cargados.</td></tr>`;
    return;
  }

  lista.forEach((c) => {
    const tr = document.createElement("tr");

    const contacto = [c.telefono || "", c.email || ""].map(x => String(x).trim()).filter(Boolean).join(" · ");
    const estados = badgesFromCliente(c).map(b => `<span class="badge ${b.cls}">${b.text}</span>`).join("");

    const notas = (c.notas && String(c.notas).trim())
      ? `<span class="badge">${c.notas}</span>`
      : "-";

    const tel = String(c.telefono || "").trim();
    const dir = String(c.direccion || "").trim();

    tr.innerHTML = `
      <td><b>${c.nombre || ""}</b></td>
      <td>${contacto || "-"}</td>
      <td>${dir ? dir : "-"}</td>
      <td>${estados}</td>
      <td>${notas}</td>
      <td>
        <button class="btn-mini historial" data-id="${c.id}" data-nombre="${c.nombre || ""}">Historial</button>
        <button class="btn-mini editar" data-id="${c.id}">Editar</button>
        <button class="btn-mini eliminar" data-id="${c.id}">Eliminar</button>

        <span style="display:inline-block; width:10px;"></span>

        <button class="btn-mini copy" data-copy-tel="${tel}">📋 Tel</button>
        <button class="btn-mini wa" data-wa="${tel}" data-name="${c.nombre || ""}">💬 WA</button>
        <button class="btn-mini copy" data-copy-dir="${dir}">📍 Dir</button>
        <button class="btn-mini venta" data-venta-id="${c.id}" data-venta-nombre="${c.nombre || ""}" data-venta-tel="${tel}">🧾 Venta</button>
      </td>
    `;

    tablaClientes.appendChild(tr);
  });

  activarBotonesFila();
}

// ----------------------
// BUSCADOR
// ----------------------
buscarCliente?.addEventListener("input", () => {
  const q = norm(buscarCliente.value);

  const filtrados = clientes.filter((c) => {
    const nombre = norm(c.nombre);
    const tel = norm(String(c.telefono || ""));
    const mail = norm(c.email);
    const dir = norm(c.direccion);
    const notas = norm(c.notas);

    return (nombre + " " + tel + " " + mail + " " + dir + " " + notas).includes(q);
  });

  renderClientes(filtrados);
  renderStats(filtrados);
});

// ----------------------
// DUPLICADOS (tel/email)
// ----------------------
function checkDuplicado() {
  if (editandoId) return; // si está editando, no joder
  if (_ignoreDup) return;

  const tel = normPhone(cliTelefono?.value);
  const mail = norm(cliEmail?.value);

  if (!tel && !mail) { hideDup(); return; }

  // busca candidato en memoria
  const found = clientes.find(c => {
    if (!c?.id) return false;
    const sameTel = tel && normPhone(c.telefono) === tel;
    const sameMail = mail && norm(c.email) === mail;
    return sameTel || sameMail;
  });

  if (found) {
    const motivo = (tel && normPhone(found.telefono) === tel) ? "Teléfono repetido" : "Email repetido";
    showDup(found, motivo);
  } else {
    hideDup();
  }
}

cliTelefono?.addEventListener("input", checkDuplicado);
cliEmail?.addEventListener("input", checkDuplicado);

btnIgnorarDuplicado?.addEventListener("click", () => {
  _ignoreDup = true;
  hideDup();
  setMsg("Ok, guardo como nuevo (ignorando duplicado).", "ok");
});

btnCargarDuplicado?.addEventListener("click", () => {
  if (_dupCandidate) fillFormFromCliente(_dupCandidate);
});

// ----------------------
// FORM GUARDAR
// ----------------------
formCliente?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombre: (cliNombre.value || "").trim(),
    telefono: (cliTelefono.value || "").trim(),
    email: (cliEmail.value || "").trim(),
    direccion: (cliDireccion.value || "").trim(),
    notas: (cliNotas.value || "").trim(),

    // estados
    tipo: (cliTipo?.value || "minorista"),
    cuenta: (cliCuenta?.value || "ok"),
    nivel: (cliNivel?.value || ""),
  };

  if (!data.nombre) {
    setMsg("El nombre es obligatorio.", "error");
    return;
  }

  // si hay duplicado y no lo ignoró, frenamos con mensaje (pro)
  if (_dupCandidate && !_ignoreDup && !editandoId) {
    setMsg("⚠️ Posible duplicado. Usá “Cargar existente” o “Ignorar”.", "error");
    return;
  }

  btnGuardarCliente.disabled = true;
  setMsg("Guardando...", "ok");

  try {
    if (editandoId) {
      await updateDoc(doc(db, "clientes", editandoId), data);
      setMsg("Cliente actualizado ✔️", "ok");
    } else {
      await addDoc(collection(db, "clientes"), data);
      setMsg("Cliente creado ✔️", "ok");
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

btnCancelarEdicion?.addEventListener("click", resetForm);

// ----------------------
// BOTONES TABLA
// ----------------------
function activarBotonesFila() {
  // EDITAR
  document.querySelectorAll(".btn-mini.editar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const c = clientes.find((x) => x.id === id);
      if (!c) return;
      fillFormFromCliente(c);
    });
  });

  // ELIMINAR
  document.querySelectorAll(".btn-mini.eliminar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const c = clientes.find((x) => x.id === id);
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

  // HISTORIAL (modal rápido)
  document.querySelectorAll(".btn-mini.historial").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const nombre = e.currentTarget.dataset.nombre || "";
      await abrirHistorialRapido({ id, nombre });
    });
  });

  // COPIAR TEL
  document.querySelectorAll("[data-copy-tel]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const val = e.currentTarget.dataset.copyTel || "";
      if (!val) return setMsg("No hay teléfono para copiar.", "error");
      await navigator.clipboard.writeText(val);
      setMsg("Teléfono copiado ✔️", "ok");
    });
  });

  // COPIAR DIR
  document.querySelectorAll("[data-copy-dir]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const val = e.currentTarget.dataset.copyDir || "";
      if (!val) return setMsg("No hay dirección para copiar.", "error");
      await navigator.clipboard.writeText(val);
      setMsg("Dirección copiada ✔️", "ok");
    });
  });

  // WHATSAPP
  document.querySelectorAll("[data-wa]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tel = normPhone(e.currentTarget.dataset.wa || "");
      const name = e.currentTarget.dataset.name || "Cliente";
      if (!tel) return setMsg("No hay teléfono para WhatsApp.", "error");
      const msg = encodeURIComponent(`Hola ${name}!`);
      window.open(`https://wa.me/54${tel}?text=${msg}`, "_blank");
    });
  });

  // CREAR VENTA (cliente cargado automático)
  document.querySelectorAll("[data-venta-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.ventaId || "";
      const nombre = e.currentTarget.dataset.ventaNombre || "";
      const tel = e.currentTarget.dataset.ventaTel || "";
      const url = `ventas.html?clienteId=${encodeURIComponent(id)}&cliente=${encodeURIComponent(nombre)}&tel=${encodeURIComponent(tel)}`;
      window.location.href = url;
    });
  });
}

// ----------------------
// MODAL: HISTORIAL RÁPIDO
// ----------------------
async function abrirHistorialRapido({ id, nombre }) {
  if (!modalHist) return;

  mhTitulo.textContent = `Historial: ${nombre || "Cliente"}`;
  mhVentas.textContent = "-";
  mhTotal.textContent = "-";
  mhUltima.textContent = "-";
  mhProm.textContent = "-";
  mhLista.innerHTML = `<div class="hist-item"><div class="muted">Cargando historial…</div></div>`;

  modalHist.classList.add("active");

  // intentamos 2 estrategias:
  // A) si tu venta guarda clienteId (futuro), usamos eso
  // B) si no existe, usamos cliente == nombre (tu ventas.html hoy guarda "cliente" string) :contentReference[oaicite:2]{index=2}
  try {
    let ventas = [];

    // A) por clienteId
    try {
      const qA = query(
        collection(db, "ventas"),
        where("clienteId", "==", id),
        orderBy("fecha", "desc"),
        limit(20)
      );
      const snapA = await getDocsQ(qA);
      snapA.forEach(d => ventas.push({ _id: d.id, ...d.data() }));
    } catch (e) {
      // puede pedir índice o no existir campo; lo ignoramos y vamos por B
    }

    // B) por nombre (string)
    if (!ventas.length && nombre) {
      const qB = query(
        collection(db, "ventas"),
        where("cliente", "==", nombre),
        orderBy("fecha", "desc"),
        limit(20)
      );
      const snapB = await getDocsQ(qB);
      snapB.forEach(d => ventas.push({ _id: d.id, ...d.data() }));
    }

    if (!ventas.length) {
      mhVentas.textContent = "0";
      mhTotal.textContent = money(0);
      mhUltima.textContent = "—";
      mhProm.textContent = money(0);
      mhLista.innerHTML = `<div class="hist-item"><div class="muted">No hay ventas registradas para este cliente.</div></div>`;
      return;
    }

    let total = 0;
    let ultima = null;

    const itemsHtml = ventas.map(v => {
      const fecha = v.fecha?.toDate ? v.fecha.toDate() : (v.fecha instanceof Date ? v.fecha : null);
      if (!ultima && fecha) ultima = fecha;

      const t = Number(v.total || 0);
      total += t;

      const pago = (v.pago || v.metodo || "—");
      const ftxt = fecha ? fecha.toLocaleString("es-AR") : "—";

      // Si existe items (tu ventas.html guarda items[]) :contentReference[oaicite:3]{index=3}
      const lines = (v.items || []).slice(0, 3).map(it => `${it.cant}× ${it.nombre || it.codigo}`).join(" · ");
      const extra = (v.items && v.items.length > 3) ? ` (+${v.items.length - 3})` : "";

      return `
        <div class="hist-item">
          <div>
            <div><b>${ftxt}</b> <span class="muted">• ${pago}</span></div>
            <div class="muted">${lines ? (lines + extra) : "—"}</div>
          </div>
          <div class="money">${money(t)}</div>
        </div>
      `;
    }).join("");

    mhVentas.textContent = String(ventas.length);
    mhTotal.textContent = money(total);
    mhUltima.textContent = ultima ? ultima.toLocaleDateString("es-AR") : "—";
    mhProm.textContent = money(total / ventas.length);

    mhLista.innerHTML = itemsHtml;
  } catch (err) {
    console.error("Error historial rápido:", err);
    mhLista.innerHTML = `<div class="hist-item"><div class="muted">Error cargando historial. (Puede requerir índice en Firestore).</div></div>`;
  }
}

// cerrar modal desde afuera (ya lo define el HTML)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalHist?.classList.contains("active")) {
    window.__closeHistCliente?.();
  }
});
