// js/historial.js
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --------------------
// DOM
// --------------------
const btnLogout = document.getElementById("logoutBtn");

const tituloCliente = document.getElementById("tituloCliente");
const subtituloCliente = document.getElementById("subtituloCliente");

const tbody = document.getElementById("tablaHistorial");

// Filtros
const inputDesde = document.getElementById("filtroDesde");
const inputHasta = document.getElementById("filtroHasta");
const inputProducto = document.getElementById("filtroProducto");
const selectEstado = document.getElementById("filtroEstado");

// Totales
const lblTotalCliente = document.getElementById("totalCliente");
const lblTotalFiltrado = document.getElementById("totalFiltrado");
const lblResumenConteo = document.getElementById("resumenConteo");

// Modal comprobante
const modalDetalle = document.getElementById("modalDetalle");
const lblDetalleCliente = document.getElementById("detalleCliente");
const lblDetalleFecha = document.getElementById("detalleFecha");
const lblDetalleEstado = document.getElementById("detalleEstado");
const tbodyDetalleProductos = document.getElementById("detalleProductos");
const lblDetalleTotal = document.getElementById("detalleTotal");
const lblDetalleNotas = document.getElementById("detalleNotas");

const btnCerrarModalX = document.getElementById("cerrarModalDetalle");
const btnCerrarModal = document.getElementById("btnCerrarDetalle");
const btnImprimir = document.getElementById("btnImprimir");
const btnCompartirWhatsapp = document.getElementById("btnCompartirWhatsapp");

// --------------------
// Estado en memoria
// --------------------
let ventasCliente = [];     // todas las ventas del cliente (o globales)
let ventasFiltradas = [];   // ventas después de filtros
let productosCatalogo = []; // productos desde colección "productos"
let ventaActualDetalle = null; // venta seleccionada para comprobante

// --------------------
// Helper: query string
// --------------------
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    nombre: params.get("clienteNombre") || params.get("nombre") || "",
    clienteId: params.get("clienteId") || "",
  };
}

const { nombre: nombreCliente } = getQueryParams();

// Título base
if (nombreCliente) {
  tituloCliente.textContent = `Historial de compras - ${nombreCliente}`;
} else {
  tituloCliente.textContent = "Historial de compras";
}

// --------------------
// SESIÓN
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  await cargarHistorial();
});

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------
// Cargar catálogo de productos
// --------------------
async function cargarProductosCatalogo() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productosCatalogo = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      const codigo = d.codigo || docSnap.id || "";
      const nombre = d.nombre || d.Nombre || "";
      return { codigo, nombre };
    });
  } catch (error) {
    console.error("Error cargando catálogo para historial:", error);
    productosCatalogo = [];
  }
}

// --------------------
// Cargar ventas de Firestore
// --------------------
async function cargarHistorial() {
  try {
    // Primero catálogo para poder mostrar nombres de productos
    await cargarProductosCatalogo();

    const ventasRef = collection(db, "ventas");
    const snap = await getDocs(ventasRef);

    const todasLasVentas = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (nombreCliente) {
      // Filtrar solo ventas de ese cliente por nombre
      ventasCliente = todasLasVentas.filter((v) => {
        const nombreVenta = (v.clienteNombre || v.cliente || "").trim();
        return nombreVenta === nombreCliente;
      });

      if (subtituloCliente) {
        subtituloCliente.textContent =
          "Mostrando las compras del cliente seleccionado.";
      }
    } else {
      ventasCliente = todasLasVentas;
      if (subtituloCliente) {
        subtituloCliente.textContent =
          "Mostrando el historial completo de ventas.";
      }
    }

    aplicarFiltros();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">Ocurrió un error al cargar el historial.</td>
        </tr>
      `;
    }
  }
}

// --------------------
// Filtros
// --------------------
function parseFechaFiltro(valor) {
  // dd/mm/aaaa -> Date
  if (!valor) return null;
  const [d, m, y] = valor.split("/");
  if (!d || !m || !y) return null;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

function aplicarFiltros() {
  const desdeDate = parseFechaFiltro(inputDesde?.value.trim());
  const hastaDateRaw = parseFechaFiltro(inputHasta?.value.trim());
  let hastaDate = hastaDateRaw;
  if (hastaDateRaw) {
    hastaDate = new Date(hastaDateRaw.getTime());
    hastaDate.setHours(23, 59, 59, 999);
  }

  const textoProducto = (inputProducto?.value || "").toLowerCase();
  const estadoSeleccionado = (selectEstado?.value || "todas").toLowerCase();

  ventasFiltradas = ventasCliente.filter((venta) => {
    let ok = true;

    // Fecha
    if (venta.fecha) {
      const fechaJs = venta.fecha.toDate
        ? venta.fecha.toDate()
        : new Date(venta.fecha);

      if (desdeDate && fechaJs < desdeDate) ok = false;
      if (hastaDate && fechaJs > hastaDate) ok = false;
    }

    // Producto (código o nombre) – soporta array "productos"
    if (textoProducto) {
      let coincideProducto = false;

      if (Array.isArray(venta.productos) && venta.productos.length > 0) {
        for (const p of venta.productos) {
          const codigo = (p.codigo || "").toLowerCase();
          const cat = productosCatalogo.find((c) => c.codigo === p.codigo);
          const nombreProd = (cat?.nombre || "").toLowerCase();

          if (
            codigo.includes(textoProducto) ||
            nombreProd.includes(textoProducto)
          ) {
            coincideProducto = true;
            break;
          }
        }
      } else {
        // Compatibilidad con ventas viejas (un solo producto)
        const codigo = (
          venta.productoCodigo ||
          venta.codigoProducto ||
          ""
        ).toLowerCase();
        const nombreProd = (
          venta.productoNombre ||
          venta.nombreProducto ||
          venta.producto ||
          ""
        ).toLowerCase();

        if (
          codigo.includes(textoProducto) ||
          nombreProd.includes(textoProducto)
        ) {
          coincideProducto = true;
        }
      }

      if (!coincideProducto) ok = false;
    }

    // Estado
    if (estadoSeleccionado !== "todas") {
      const estadoVenta = (venta.estado || "").toLowerCase();
      if (estadoVenta !== estadoSeleccionado) ok = false;
    }

    return ok;
  });

  renderTabla(ventasFiltradas);
  recalcularTotales();
}

// --------------------
// Render tabla
// --------------------
function formatearFecha(fecha) {
  if (!fecha) return "-";
  const f = fecha.toDate ? fecha.toDate() : new Date(fecha);
  const dia = String(f.getDate()).padStart(2, "0");
  const mes = String(f.getMonth() + 1).padStart(2, "0");
  const anio = f.getFullYear();
  const hora = String(f.getHours()).padStart(2, "0");
  const min = String(f.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function obtenerResumenProductos(venta) {
  if (Array.isArray(venta.productos) && venta.productos.length > 0) {
    const totalCantidad = venta.productos.reduce(
      (acc, p) => acc + (Number(p.cantidad) || 0),
      0
    );

    const primero = venta.productos[0];
    const cat = productosCatalogo.find((c) => c.codigo === primero.codigo);
    const baseNombre = cat?.nombre || primero.codigo || "-";
    const textoBase = `${baseNombre} x${primero.cantidad || 1}`;
    const resto = venta.productos.length - 1;
    const textoProducto =
      resto > 0 ? `${textoBase} (+${resto} más)` : textoBase;

    return { textoProducto, totalCantidad };
  }

  // Esquema viejo
  const nombreProd =
    venta.productoNombre || venta.nombreProducto || venta.producto || "-";
  const cantidad = venta.cantidad || venta.cant || 0;

  return { textoProducto: nombreProd, totalCantidad: cantidad };
}

function renderTabla(lista) {
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">No hay ventas registradas para este cliente.</td>
      </tr>
    `;
    return;
  }

  lista.forEach((venta) => {
    const tr = document.createElement("tr");

    const fechaTexto = formatearFecha(venta.fecha);
    const { textoProducto, totalCantidad } = obtenerResumenProductos(venta);

    const total = venta.total || 0;
    const estado = (venta.estado || "-").toLowerCase();
    const notas = venta.notas || "-";

    const totalTexto = `$${total.toLocaleString("es-AR")}`;

 tr.innerHTML = `
  <td data-label="Fecha">${fechaTexto}</td>
  <td data-label="N° interno">${venta.numeroInterno || "-"}</td>
  <td data-label="Producto(s)">${textoProducto}</td>
  <td data-label="Cantidad">${totalCantidad}</td>
  <td data-label="Total">${totalTexto}</td>
  <td data-label="Estado">
    ${estado ? `<span class="estado-pill">${estado}</span>` : "-"}
  </td>
  <td data-label="Notas">${notas}</td>
`;
    
    tr.addEventListener("click", () => {
      abrirDetalleVenta(venta);
    });

    tbody.appendChild(tr);
  });
}

// --------------------
// Totales
// --------------------
function recalcularTotales() {
  const totalCliente = ventasCliente.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );
  const totalFiltrado = ventasFiltradas.reduce(
    (acc, v) => acc + (v.total || 0),
    0
  );

  if (lblTotalCliente) {
    lblTotalCliente.textContent = `$${totalCliente.toLocaleString("es-AR")}`;
  }
  if (lblTotalFiltrado) {
    lblTotalFiltrado.textContent = `$${totalFiltrado.toLocaleString("es-AR")}`;
  }
  if (lblResumenConteo) {
    lblResumenConteo.textContent = `${ventasFiltradas.length} venta(s) en el resultado.`;
  }
}

// --------------------
// Detalle / comprobante
// --------------------
function abrirDetalleVenta(venta) {
  const lblDetalleNumero = document.getElementById("detalleNumero");
if (lblDetalleNumero) {
  lblDetalleNumero.textContent = venta.numeroInterno || "-";
}
  if (!modalDetalle) return;
 
  ventaActualDetalle = venta;

  if (lblDetalleCliente) {
    lblDetalleCliente.textContent = venta.clienteNombre || "-";
  }
  if (lblDetalleFecha) {
    lblDetalleFecha.textContent = formatearFecha(venta.fecha);
  }
  if (lblDetalleEstado) {
    lblDetalleEstado.textContent = venta.estado || "-";
  }

  if (lblDetalleTotal) {
    lblDetalleTotal.textContent =
      "$" + (venta.total || 0).toLocaleString("es-AR");
  }
  if (lblDetalleNotas) {
    lblDetalleNotas.textContent = venta.notas || "-";
  }

  if (tbodyDetalleProductos) {
    tbodyDetalleProductos.innerHTML = "";

    if (Array.isArray(venta.productos) && venta.productos.length > 0) {
      venta.productos.forEach((p) => {
        const prodInfo = productosCatalogo.find(
          (c) => c.codigo === p.codigo
        );
        const nombre = prodInfo?.nombre || p.codigo || "-";
        const subtotal = (p.precio || 0) * (p.cantidad || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.codigo || "-"}</td>
          <td>${nombre}</td>
          <td>${p.cantidad || 0}</td>
          <td>$${(p.precio || 0).toLocaleString("es-AR")}</td>
          <td>$${subtotal.toLocaleString("es-AR")}</td>
        `;
        tbodyDetalleProductos.appendChild(tr);
      });
    }
  }

  modalDetalle.style.display = "flex";
}

function cerrarModalDetalle() {
  if (modalDetalle) modalDetalle.style.display = "none";
}

// --------------------
// Listeners de filtros
// --------------------
[inputDesde, inputHasta, inputProducto, selectEstado].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", aplicarFiltros);
  el.addEventListener("change", aplicarFiltros);
});

// --------------------
// Listeners del modal
// --------------------
btnCerrarModalX?.addEventListener("click", cerrarModalDetalle);
btnCerrarModal?.addEventListener("click", cerrarModalDetalle);

btnImprimir?.addEventListener("click", () => {
  window.print();
});

// --------------------
// Compartir por WhatsApp
// --------------------
btnCompartirWhatsapp?.addEventListener("click", () => {
  if (!ventaActualDetalle) return;

  const venta = ventaActualDetalle;
  let texto = `🧾 *Comprobante de compra*\n\n`;

  // 👉 NUEVA LÍNEA: NÚMERO INTERNO
  texto += `N° Interno: ${venta.numeroInterno || "-"}\n`;

  texto += `👤 Cliente: ${venta.clienteNombre || "-"}\n`;
  texto += `📅 Fecha: ${formatearFecha(venta.fecha)}\n\n`;

  texto += `🛒 *Productos:*\n`;

  if (Array.isArray(venta.productos) && venta.productos.length > 0) {
    venta.productos.forEach((p) => {
      const subtotal = (p.precio || 0) * (p.cantidad || 0);
      texto += `- ${p.codigo || "-"} x${p.cantidad || 0} = $${subtotal.toLocaleString(
        "es-AR"
      )}\n`;
    });
  }

  texto += `\n💰 Total: $${(venta.total || 0).toLocaleString("es-AR")}\n`;
  texto += `🟢 Estado: ${venta.estado || "-"}\n`;

  if (venta.notas) {
    texto += `\n📝 Notas: ${venta.notas}\n`;
  }

  texto += `\n¡Gracias por su compra! 😊`;

  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
});
