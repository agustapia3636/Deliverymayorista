// js/historial.js
import { auth, db } from "./firebase-init.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const logoutBtn = document.getElementById("logoutBtn");
const tablaHistorial = document.getElementById("tablaHistorial");

// Filtros
const filtroDesde = document.getElementById("filtroDesde");
const filtroHasta = document.getElementById("filtroHasta");
const filtroProducto = document.getElementById("filtroProducto");
const filtroEstado = document.getElementById("filtroEstado");

// Totales
const totalGastado = document.getElementById("totalGastado");
const totalFiltrado = document.getElementById("totalFiltrado");

let ventas = [];
let ventasFiltradas = [];
let clienteId = null;

// Obtener ID del cliente desde la URL
const params = new URLSearchParams(window.location.search);
clienteId = params.get("cliente");

// ----------------------
// SESIÓN
// ----------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!clienteId) {
        tablaHistorial.innerHTML = `<tr><td colspan="6">No se seleccionó un cliente.</td></tr>`;
        return;
    }

    await cargarCliente();
    await cargarVentas();
});

// Logout
logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});

// ----------------------
// CARGAR CLIENTE
// ----------------------
async function cargarCliente() {
    const ref = doc(db, "clientes", clienteId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        document.getElementById("tituloCliente").textContent = "Cliente no encontrado";
        return;
    }

    const data = snap.data();
    document.getElementById("tituloCliente").textContent =
        `Historial de compras - ${data.nombre}`;
}

// ----------------------
// CARGAR VENTAS
// ----------------------
async function cargarVentas() {
    const ref = collection(db, "ventas");
    const snap = await getDocs(ref);

    ventas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.clienteId === clienteId);

    calcularTotalGeneral();
    aplicarFiltros();
}

// ----------------------
// FILTROS
// ----------------------
[filtroDesde, filtroHasta, filtroProducto, filtroEstado].forEach(f => {
    f.addEventListener("input", aplicarFiltros);
});

function aplicarFiltros() {
    ventasFiltradas = ventas.filter(v => {

        // Filtro por fecha
        let fecha = new Date(v.fecha);
        if (filtroDesde.value) {
            let desde = new Date(filtroDesde.value);
            if (fecha < desde) return false;
        }
        if (filtroHasta.value) {
            let hasta = new Date(filtroHasta.value);
            if (fecha > hasta) return false;
        }

        // Filtro por producto
        if (filtroProducto.value.trim() !== "") {
            const txt = filtroProducto.value.toLowerCase();
            if (
                !v.producto.toLowerCase().includes(txt) &&
                !v.codigo.toLowerCase().includes(txt)
            ) return false;
        }

        // Filtro por estado
        if (filtroEstado.value !== "todas") {
            if (v.estado !== filtroEstado.value) return false;
        }

        return true;
    });

    renderTabla();
    calcularTotalFiltrado();
}

// ----------------------
// RENDER TABLA
// ----------------------
function renderTabla() {
    tablaHistorial.innerHTML = "";

    if (ventasFiltradas.length === 0) {
        tablaHistorial.innerHTML =
            `<tr><td colspan="6">No hay ventas registradas para este cliente.</td></tr>`;
        return;
    }

    ventasFiltradas.forEach(v => {
        const tr = document.createElement("tr");

        const fecha = new Date(v.fecha).toLocaleString("es-AR");

        tr.innerHTML = `
            <td>${fecha}</td>
            <td>${v.codigo} - ${v.producto}</td>
            <td>${v.cantidad}</td>
            <td>$${v.total}</td>
            <td>${v.estado}</td>
            <td>${v.notas || "-"}</td>
        `;

        tablaHistorial.appendChild(tr);
    });
}

// ----------------------
// TOTAL GENERAL
// ----------------------
function calcularTotalGeneral() {
    const total = ventas.reduce((sum, v) => sum + v.total, 0);
    totalGastado.textContent = `$${total}`;
}

// ----------------------
// TOTAL FILTRADO
// ----------------------
function calcularTotalFiltrado() {
    const total = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
    totalFiltrado.textContent = `$${total}`;
}
