// js/historial.js
import { auth, db } from "./firebase-init.js";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

/* ----------------- helpers ----------------- */
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

const clienteId = getQueryParam("cliente");
const tablaHistorial = document.getElementById("tablaHistorial");
const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");

/* ----------------- auth guard ----------------- */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!clienteId) {
        // No vino ningún id por querystring
        tablaHistorial.innerHTML = `
            <tr>
                <td colspan="6">No se indicó ningún cliente. Volvé al panel de clientes y abrí el historial desde allí.</td>
            </tr>
        `;
        return;
    }

    try {
        // 1) Traer datos del cliente
        const clienteRef = doc(db, "clientes", clienteId);
        const clienteSnap = await getDoc(clienteRef);

        if (clienteSnap.exists()) {
            const datosCliente = clienteSnap.data();
            tituloCliente.textContent = `Historial de compras - ${datosCliente.nombre || ""}`;
            subtituloCliente.textContent = `Cliente: ${datosCliente.nombre || ""}`;
        } else {
            subtituloCliente.textContent = "Cliente no encontrado.";
        }

        // 2) Traer ventas de ese cliente
        const ventasRef = collection(db, "ventas");
        const q = query(
            ventasRef,
            where("clienteId", "==", clienteId),
            orderBy("fecha", "desc")
        );

        const snap = await getDocs(q);

        tablaHistorial.innerHTML = "";

        if (snap.empty) {
            tablaHistorial.innerHTML = `
                <tr>
                    <td colspan="6">Este cliente todavía no tiene ventas registradas.</td>
                </tr>
            `;
            return;
        }

        snap.forEach((docVenta) => {
            const v = docVenta.data();

            // fecha: soporta timestamp de Firestore o string
            let fechaTexto = "";
            if (v.fecha && typeof v.fecha.toDate === "function") {
                fechaTexto = v.fecha.toDate().toLocaleString("es-AR");
            } else if (v.fecha) {
                fechaTexto = v.fecha;
            }

            const productoTexto = `${v.productoCodigo || ""} - ${v.productoNombre || ""}`.trim();

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${fechaTexto}</td>
                <td>${productoTexto}</td>
                <td>${v.cantidad ?? ""}</td>
                <td>$ ${v.total != null ? Number(v.total).toLocaleString("es-AR") : ""}</td>
                <td>${v.estado || ""}</td>
                <td>${v.notas || "-"}</td>
            `;
            tablaHistorial.appendChild(tr);
        });
    } catch (error) {
        console.error("Error cargando historial:", error);
        tablaHistorial.innerHTML = `
            <tr>
                <td colspan="6">Ocurrió un error al cargar el historial.</td>
            </tr>
        `;
    }
});

/* ----------------- logout ----------------- */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
}
