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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// -------------------------------
// DOM
// -------------------------------
const logoutBtn     = document.getElementById("logoutBtn");
const buscarVenta   = document.getElementById("buscarVenta");
const btnNuevaVenta = document.getElementById("btnNuevaVenta");
const tablaVentas   = document.getElementById("tablaVentas");
const msgVentas     = document.getElementById("msgVentas");
const subTitulo     = document.getElementById("subTituloVentas");

// Modal
const modalVenta  = document.getElementById("modalVenta");
const selCliente  = document.getElementById("ventaCliente");
const inpCodigo   = document.getElementById("ventaCodigo");
const inpCantidad = document.getElementById("ventaCantidad");
const selEstado   = document.getElementById("ventaEstado");
const txtNotas    = document.getElementById("ventaNotas");
const btnCancelar = document.getElementById("btnCancelarVenta");
const btnGuardar  = document.getElementById("btnGuardarVenta");

// -------------------------------
// Datos en memoria
// -------------------------------
let ventas    = [];   // ventas combinando carrito + manuales
let clientes  = [];
let productos = [];

// -------------------------------
// SESIÓN / AUTH GUARD
// -------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  init();
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

// -------------------------------
// INIT
// -------------------------------
async function init() {
  await cargarClientesSelect();
  await cargarProductos();
  await cargarVentas();
  aplicarFiltroPorURL();
}

// -------------------------------
// CARGAR CLIENTES PARA EL SELECT
// -------------------------------
async function cargarClientesSelect() {
  if (!selCliente) return;

  selCliente.innerHTML = "";

  const snap = await getDocs(collection(db, "clientes"));
  clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (clientes.length === 0) {
    selCliente.innerHTML = `<option value="">No hay clientes</option>`;
    return;
  }

  clientes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre || c.email || c.id;
    selCliente.appendChild(opt);
  });
}

// -------------------------------
// CARGAR PRODUCTOS A MEMORIA
// -------------------------------
async function cargarProductos() {
  const snap = await getDocs(collection(db, "productos"));
  productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -------------------------------
// CARGAR VENTAS (CARRITO + MANUALES)
// -------------------------------
async function cargarVentas() {
  tablaVentas.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

  const snap = await getDocs(collection(db, "ventas"));

  ventas = snap.docs.map((d) => {
    const data = d.data();

    // Timestamp unificado
    const timestamp = data.creadoEn || data.fecha || null;

    // Items: si viene del carrito tendrá "items" (array)
    let items = [];
    if (Array.isArray(data.items) && data.items.length) {
      items = data.items.map((it) => ({
        codigo:
          it.codigo ||
          it.productoCodigo ||
          it.Codigo ||
          "",
        nombre:
          it.nombre ||
          it.productoNombre ||
          it["Nombre Corto"] ||
          "",
        cantidad: Number(it.cantidad || 0),
        precio: Number(it.precio || it.PrecioMayorista || 0)
      }));
    } else {
      // Venta "vieja" o manual con un solo producto
      const codigo =
        data.productoCodigo ||
        data.codigo ||
        "";
      const nombre =
        data.productoNombre ||
        data.nombre ||
        "";
      const cantidad = Number(data.cantidad || 0);

      // Tratamos de inferir precio unitario
      let precioUnit = 0;
      if (cantidad > 0 && data.total != null) {
        precioUnit = Number(data.total) / cantidad;
      } else {
        const prod = productos.find(
          (p) =>
            p.id === data.productoId ||
            (p.codigo || "").toString().toLowerCase() ===
              codigo.toLowerCase()
        );
        if (prod && prod.precio != null) {
          precioUnit = Number(prod.precio);
        }
      }

      items = [
        {
          codigo,
          nombre,
          cantidad,
          precio: precioUnit
        }
      ];
    }

    const totalCantidad = items.reduce(
      (acc, it) => acc + (Number(it.cantidad) || 0),
      0
    );

    const total =
      data.total != null
        ? Number(data.total)
        : items.reduce(
            (acc, it) =>
              acc +
              (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
            0
          );

    return {
      id: d.id,
      ...data,
      items,
      totalCantidad,
      total,
      timestamp
    };
  });

  // Ordenar por fecha/timestamp (más reciente primero)
  ventas.sort((a, b) => {
    const ta =
      a.timestamp && a.timestamp.toDate
        ? a.timestamp.toDate().getTime()
        : 0;
    const tb =
      b.timestamp && b.timestamp.toDate
        ? b.timestamp.toDate().getTime()
        : 0;
    return tb - ta;
  });

  renderVentas(ventas);
}

// -------------------------------
// RENDER TABLA DE VENTAS
// -------------------------------
function renderVentas(lista) {
  tablaVentas.innerHTML = "";

  if (!lista.length) {
    tablaVentas.innerHTML = `<tr><td colspan="8">No hay ventas registradas.</td></tr>`;
    return;
  }

  lista.forEach((v) => {
    const fecha = v.timestamp?.toDate
      ? v.timestamp.toDate().toLocaleString("es-AR")
      : v.fecha?.toDate
      ? v.fecha.toDate().toLocaleString("es-AR")
      : "-";

    const cliente = v.clienteNombre || v.cliente || "-";

    // Resumen de productos: primer ítem + " (+N más)" si corresponde
    let productoTexto = "-";
    if (Array.isArray(v.items) && v.items.length) {
      const first = v.items[0];
      const cod = first.codigo || "";
      const nom = first.nombre || "";
      if (v.items.length === 1) {
        productoTexto = `${cod} - ${nom}`.trim() || "-";
      } else {
        productoTexto = `${(cod || "").trim()} - ${(nom || "").trim()} (+${
          v.items.length - 1
        } más)`;
      }
    } else {
      const cod = v.productoCodigo || "";
      const nom = v.productoNombre || "";
      productoTexto = `${cod} - ${nom}`.trim() || "-";
    }

    const cantidadTotal =
      v.totalCantidad ??
      v.cantidad ??
      0;

    const totalTexto = (v.total || 0).toLocaleString("es-AR");
    const estado = v.estado || "pendiente";
    const notas = v.notas || v.origen || "-";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${fecha}</td>
      <td>${cliente}</td>
      <td>${productoTexto}</td>
      <td>${cantidadTotal}</td>
      <td>$${totalTexto}</td>
      <td><span class="badge">${estado}</span></td>
      <td>${notas}</td>
      <td>
        <button class="btn-mini estado" data-id="${v.id}">Cambiar estado</button>
        <button class="btn-mini eliminar" data-id="${v.id}">Eliminar</button>
      </td>
    `;
    tablaVentas.appendChild(fila);
  });

  activarBotonesFila();
}

// -------------------------------
// BUSCADOR (cliente + productos + estado + notas/origen)
// -------------------------------
if (buscarVenta) {
  buscarVenta.addEventListener("input", () => {
    const q = buscarVenta.value.toLowerCase().trim();
    if (!q) {
      renderVentas(ventas);
      return;
    }

    const filtradas = ventas.filter((v) => {
      const cliente = (v.clienteNombre || v.cliente || "").toLowerCase();
      const estado = (v.estado || "").toLowerCase();
      const notas = (v.notas || v.origen || "").toLowerCase();

      const codigos = (v.items || [])
        .map(
          (it) =>
            (it.codigo ||
              it.productoCodigo ||
              it.Codigo ||
              "") + ""
        )
        .join(" ")
        .toLowerCase();

      const nombres = (v.items || [])
        .map(
          (it) =>
            (it.nombre ||
              it.productoNombre ||
              it["Nombre Corto"] ||
              "") + ""
        )
        .join(" ")
        .toLowerCase();

      return (
        cliente.includes(q) ||
        estado.includes(q) ||
        notas.includes(q) ||
        codigos.includes(q) ||
        nombres.includes(q)
      );
    });

    renderVentas(filtradas);
  });
}

// -------------------------------
// BOTONES DE TABLA (ELIMINAR / CAMBIAR ESTADO)
// -------------------------------
function activarBotonesFila() {
  // Eliminar
  document.querySelectorAll(".btn-mini.eliminar").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!confirm("¿Eliminar esta venta?")) return;
      await deleteDoc(doc(db, "ventas", id));
      setMsg("Venta eliminada.");
      await cargarVentas();
    });
  });

  // Cambiar estado
  document.querySelectorAll(".btn-mini.estado").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const venta = ventas.find((v) => v.id === id);
      if (!venta) return;

      const nuevoEstado = prompt(
        "Nuevo estado (pendiente, pagado, entregado):",
        venta.estado || "pendiente"
      );
      if (!nuevoEstado) return;

      const estadoNormalizado = nuevoEstado.toLowerCase().trim();

      await updateDoc(doc(db, "ventas", id), {
        estado: estadoNormalizado
      });

      setMsg("Estado actualizado.");
      await cargarVentas();
    });
  });
}

// -------------------------------
// MODAL NUEVA VENTA (MANUAL)
// -------------------------------
if (btnNuevaVenta) {
  btnNuevaVenta.addEventListener("click", () => {
    if (clientes.length === 0) {
      alert("Primero debes cargar al menos un cliente.");
      return;
    }
    inpCodigo.value = "";
    inpCantidad.value = "1";
    selEstado.value = "pendiente";
    txtNotas.value = "";
    modalVenta.style.display = "flex";
  });
}

if (btnCancelar) {
  btnCancelar.addEventListener("click", () => {
    modalVenta.style.display = "none";
  });
}

if (btnGuardar) {
  btnGuardar.addEventListener("click", async () => {
    const clienteId = selCliente.value;
    const cliente = clientes.find((c) => c.id === clienteId);

    const codigo = (inpCodigo.value || "").trim();
    const cantidad = parseInt(inpCantidad.value, 10);
    const estado = selEstado.value;
    const notas = txtNotas.value.trim();

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

    // Buscar producto por código
    const producto = productos.find((p) =>
      (p.codigo || p.id || "").toString().toLowerCase() ===
      codigo.toLowerCase()
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

    const precioUnitario =
      producto.precio ??
      producto.PrecioMayorista ??
      0;
    const total = precioUnitario * cantidad;

    const ts = serverTimestamp();

    // Armamos el ítem para que sea compatible con las ventas del carrito
    const itemVenta = {
      codigo: producto.codigo || producto.id,
      nombre: producto.nombre || "",
      cantidad,
      precio: precioUnitario,
      imagen: producto.imagen || ""
    };

    // Guardar venta con esquema flexible
    await addDoc(collection(db, "ventas"), {
      // datos de cliente
      clienteId,
      clienteNombre: cliente.nombre || cliente.email || "",
      // datos de producto (compatibilidad con versión anterior)
      productoId: producto.id,
      productoCodigo: itemVenta.codigo,
      productoNombre: itemVenta.nombre,
      cantidad,
      // datos unificados
      items: [itemVenta],
      total,
      estado,
      notas,
      origen: "manual_panel",
      fecha: ts,
      creadoEn: ts
    });

    // Descontar stock del producto
    await updateDoc(doc(db, "productos", producto.id), {
      stock: stockActual - cantidad
    });
    producto.stock = stockActual - cantidad;

    modalVenta.style.display = "none";
    setMsg("Venta registrada, stock actualizado.");
    await cargarVentas();
  });
}

// -------------------------------
// UTILIDAD: MENSAJE
// -------------------------------
function setMsg(texto) {
  if (!msgVentas) return;
  msgVentas.textContent = texto;
  setTimeout(() => {
    msgVentas.textContent = "";
  }, 4000);
}

// -------------------------------
// FILTRO POR URL (historial cliente)
// -------------------------------
function aplicarFiltroPorURL() {
  const params = new URLSearchParams(window.location.search);
  const nombreCliente = params.get("nombre");

  if (nombreCliente) {
    if (subTitulo) {
      subTitulo.textContent = `Historial de compras de: ${nombreCliente}`;
    }
    if (buscarVenta) {
      buscarVenta.value = nombreCliente;
      buscarVenta.dispatchEvent(new Event("input"));
    }
  }
}
