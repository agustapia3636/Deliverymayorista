// js/admin.js
// Panel administrativo PRO: productos + estadísticas con gráficos

import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- DOM: Productos ----------
const tbody            = document.getElementById("tablaProductosBody");
const buscador         = document.getElementById("buscadorProductos");
const filtroCategoria  = document.getElementById("filtroCategoria");
const filtroSubcat     = document.getElementById("filtroSubcategoria");
const chkSoloSinStock  = document.getElementById("filtroSoloSinStock");
const btnNuevoProducto = document.getElementById("btnNuevoProducto");
const lblUsuario       = document.getElementById("nombreUsuario");
const btnLogout        = document.getElementById("btnLogout");

let productos = [];

// ---------- DOM: Estadísticas Ventas ----------
const statsTotalMonto   = document.getElementById("stats-total-monto");
const statsTotalPedidos = document.getElementById("stats-total-pedidos");
const statsClientes     = document.getElementById("stats-clientes");
const statsHoy          = document.getElementById("stats-hoy");
const statsMes          = document.getElementById("stats-mes");
const statsRanking      = document.getElementById("stats-ranking");

// Panel y charts
const chartsGrid         = document.querySelector(".charts-grid");
const canvasVentasDias   = document.getElementById("chart-ventas-dias");
const canvasProductosTop = document.getElementById("chart-productos-top");

// Instances de Chart
let chartVentasDias = null;
let chartTopProductos = null;

// ---------- Auth ----------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (lblUsuario) {
    lblUsuario.textContent = user.email || "Admin";
  }

  cargarProductos();
  cargarEstadisticasVentas();
});

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });
}

if (btnNuevoProducto) {
  btnNuevoProducto.addEventListener("click", () => {
    window.location.href = "editor.html";
  });
}

// ============================================================================
//  PRODUCTOS
// ============================================================================

async function cargarProductos() {
  if (!tbody) {
    console.error("No se encontró <tbody id='tablaProductosBody'>");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="texto-centro">Cargando productos...</td>
    </tr>
  `;

  try {
    const ref  = collection(db, "productos");
    const q    = query(ref, orderBy("nombre"));
    const snap = await getDocs(q);

    productos.length = 0;

    const categorias = new Set();
    const subcats    = new Set();

    snap.forEach((docSnap) => {
      const data = docSnap.data();

      const codigo       = data.codigo || docSnap.id || "";
      const nombre       = data.nombre || data.Nombre || "";
      const categoria    = data.categoria || data.Categoria_Princ || "";
      const subcategoria = data.subcategoria || data.Sub_Categoria || "";
      const precio       = data.precio ?? data.PrecioMayorista ?? 0;
      const stock        = data.stock ?? data.Stock ?? 0;
      const imagen       = data.imagen || data.Imagen || "";
      const destacado    = !!data.destacado;

      productos.push({
        id: docSnap.id,
        codigo,
        nombre,
        categoria,
        subcategoria,
        precio,
        stock,
        imagen,
        destacado,
      });

      if (categoria)    categorias.add(categoria);
      if (subcategoria) subcats.add(subcategoria);
    });

    poblarFiltros(categorias, subcats);
    aplicarFiltros();

  } catch (err) {
    console.error("Error cargando productos:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">Error al cargar productos.</td>
      </tr>
    `;
  }
}

function poblarFiltros(setCategorias, setSubcats) {
  if (filtroCategoria) {
    filtroCategoria.innerHTML = `<option value="">Todas las categorías</option>`;
    Array.from(setCategorias)
      .sort()
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
      });
  }

  if (filtroSubcat) {
    filtroSubcat.innerHTML = `<option value="">Todas las subcategorías</option>`;
    Array.from(setSubcats)
      .sort()
      .forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        filtroSubcat.appendChild(opt);
      });
  }
}

function aplicarFiltros() {
  const texto        = (buscador?.value || "").toLowerCase();
  const cat          = filtroCategoria?.value || "";
  const sub          = filtroSubcat?.value || "";
  const soloSinStock = !!(chkSoloSinStock?.checked);

  const filtrados = productos.filter((p) => {
    const matchTexto = (() => {
      if (!texto) return true;
      const codigo = (p.codigo || "").toLowerCase();
      const nombre = (p.nombre || "").toLowerCase();
      const catP   = (p.categoria || "").toLowerCase();
      const subP   = (p.subcategoria || "").toLowerCase();
      return (
        codigo.includes(texto) ||
        nombre.includes(texto) ||
        catP.includes(texto) ||
        subP.includes(texto)
      );
    })();

    if (!matchTexto) return false;
    if (cat && p.categoria !== cat) return false;
    if (sub && p.subcategoria !== sub) return false;
    if (soloSinStock && (p.stock || 0) > 0) return false;

    return true;
  });

  mostrarProductos(filtrados);
}

function crearBadgeStock(stock) {
  const span  = document.createElement("span");
  const valor = Number.isFinite(stock) ? stock : 0;
  span.textContent = valor;

  span.classList.add("badge-stock");
  if (valor <= 0) {
    span.classList.add("stock-cero");
  } else if (valor <= 5) {
    span.classList.add("stock-bajo");
  } else {
    span.classList.add("stock-ok");
  }

  return span;
}

function crearThumbImagen(url) {
  const cont = document.createElement("div");
  cont.classList.add("thumb-contenedor");

  if (!url) {
    cont.textContent = "Sin imagen";
    cont.classList.add("thumb-vacio");
    return cont;
  }

  const img = document.createElement("img");
  img.src = url;
  img.alt = "Imagen producto";
  img.classList.add("thumb-img-admin");

  img.onerror = () => {
    cont.textContent = "No válida";
    cont.classList.add("thumb-error");
    img.remove();
  };

  cont.appendChild(img);
  return cont;
}

function mostrarProductos(lista) {
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="texto-centro">No se encontraron productos con esos filtros.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  lista.forEach((p) => {
    const tr = document.createElement("tr");
    if (p.stock <= 0) {
      tr.classList.add("fila-sin-stock");
    }

    const tdCodigo = document.createElement("td");
    tdCodigo.textContent = p.codigo;

    const tdNombre = document.createElement("td");
    tdNombre.textContent = p.nombre || "-";
    if (p.destacado) {
      const badge = document.createElement("span");
      badge.textContent = "★";
      badge.classList.add("badge-destacado");
      tdNombre.prepend(badge);
    }

    const tdCategoria = document.createElement("td");
    tdCategoria.textContent = p.categoria || "";

    const tdSubcat = document.createElement("td");
    tdSubcat.textContent = p.subcategoria || "";

    const tdPrecio = document.createElement("td");
    tdPrecio.textContent =
      p.precio != null ? `$ ${p.precio.toLocaleString("es-AR")}` : "-";

    const tdStock = document.createElement("td");
    tdStock.appendChild(crearBadgeStock(p.stock));

    const tdImg = document.createElement("td");
    tdImg.appendChild(crearThumbImagen(p.imagen));

    const tdAcciones = document.createElement("td");
    tdAcciones.classList.add("col-acciones");

    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.classList.add("btn-accion", "btn-editar");
    btnEditar.addEventListener("click", () => {
      window.location.href = `editor.html?id=${p.codigo}`;
    });

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.classList.add("btn-accion", "btn-eliminar");
    btnEliminar.addEventListener("click", () => eliminarProducto(p.codigo, p.nombre));

    tdAcciones.appendChild(btnEditar);
    tdAcciones.appendChild(btnEliminar);

    tr.appendChild(tdCodigo);
    tr.appendChild(tdNombre);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdSubcat);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdStock);
    tr.appendChild(tdImg);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });
}

async function eliminarProducto(codigo, nombre) {
  const ok = confirm(`¿Eliminar el producto "${nombre}" (${codigo})?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "productos", codigo));
    alert("Producto eliminado 👍");
    cargarProductos();
  } catch (err) {
    console.error("Error eliminando producto:", err);
    alert("Hubo un error al eliminar el producto. Revisá la consola.");
  }
}

if (buscador)        buscador.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);
if (filtroSubcat)    filtroSubcat.addEventListener("change", aplicarFiltros);
if (chkSoloSinStock) chkSoloSinStock.addEventListener("change", aplicarFiltros);

// ============================================================================
//  ESTADÍSTICAS DE VENTAS + GRÁFICOS
// ============================================================================

async function cargarEstadisticasVentas() {
  if (
    !statsTotalMonto &&
    !statsTotalPedidos &&
    !statsClientes &&
    !statsHoy &&
    !statsMes &&
    !statsRanking &&
    !chartsGrid
  ) {
    return;
  }

  try {
    const ventasRef  = collection(db, "ventas");
    const ventasSnap = await getDocs(ventasRef);

    // Si NO hay ventas: dejamos los números en 0, ranking con mensaje y ocultamos gráficos
    if (ventasSnap.empty) {
      if (statsTotalMonto)   statsTotalMonto.textContent   = "$0";
      if (statsTotalPedidos) statsTotalPedidos.textContent = "0";
      if (statsClientes)     statsClientes.textContent     = "0";
      if (statsHoy)          statsHoy.textContent          = "$0";
      if (statsMes)          statsMes.textContent          = "$0";

      if (statsRanking) {
        statsRanking.innerHTML = "<li>No hay datos de ventas aún.</li>";
      }

      if (chartsGrid) chartsGrid.style.display = "none";

      if (chartVentasDias) { chartVentasDias.destroy(); chartVentasDias = null; }
      if (chartTopProductos) { chartTopProductos.destroy(); chartTopProductos = null; }

      return;
    }

    let totalVentasMonto = 0;
    let totalPedidos     = 0;
    const clientesUnicos = new Set();
    let ventasHoy        = 0;
    let ventasMes        = 0;

    const productosVendidos = {};
    const ventasPorDia      = {};

    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    ventasSnap.forEach((docSnap) => {
      const data = docSnap.data();

      const total = Number(data.total) || 0;
      totalVentasMonto += total;
      totalPedidos++;

      if (data.clienteId) {
        clientesUnicos.add(data.clienteId);
      }

      let fechaVenta = null;
      if (data.fecha && typeof data.fecha.toDate === "function") {
        fechaVenta = data.fecha.toDate();
      }

      if (fechaVenta) {
        if (fechaVenta >= inicioDia) {
          ventasHoy += total;
        }
        if (fechaVenta >= inicioMes) {
          ventasMes += total;
        }

        const iso = fechaVenta.toISOString().slice(0, 10);
        ventasPorDia[iso] = (ventasPorDia[iso] || 0) + total;
      }

      if (Array.isArray(data.productos)) {
        data.productos.forEach((p) => {
          const codigo = p.codigo || p.cod || "";
          const cant   = Number(p.cantidad) || 0;
          if (!codigo || cant <= 0) return;

          if (!productosVendidos[codigo]) {
            productosVendidos[codigo] = 0;
          }
          productosVendidos[codigo] += cant;
        });
      }
    });

    const ranking = Object.entries(productosVendidos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (statsTotalMonto) {
      statsTotalMonto.textContent = "$" + totalVentasMonto.toLocaleString("es-AR");
    }
    if (statsTotalPedidos) {
      statsTotalPedidos.textContent = totalPedidos.toString();
    }
    if (statsClientes) {
      statsClientes.textContent = clientesUnicos.size.toString();
    }
    if (statsHoy) {
      statsHoy.textContent = "$" + ventasHoy.toLocaleString("es-AR");
    }
    if (statsMes) {
      statsMes.textContent = "$" + ventasMes.toLocaleString("es-AR");
    }
    if (statsRanking) {
      if (!ranking.length) {
        statsRanking.innerHTML = "<li>No hay datos de ventas aún.</li>";
      } else {
        statsRanking.innerHTML = ranking
          .map(([codigo, cant]) => `<li>${codigo} — ${cant} unidades vendidas</li>`)
          .join("");
      }
    }

    // Ahora sí mostramos los gráficos porque hay ventas
    if (chartsGrid) chartsGrid.style.display = "grid";

    actualizarChartVentasDias(ventasPorDia);
    actualizarChartTopProductos(ranking);

  } catch (err) {
    console.error("Error cargando estadísticas de ventas:", err);
    if (statsRanking) {
      statsRanking.innerHTML = "<li>Error al cargar estadísticas.</li>";
    }
    if (chartsGrid) chartsGrid.style.display = "none";
  }
}

function formatearFechaCorta(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function actualizarChartVentasDias(ventasPorDia) {
  if (!canvasVentasDias || typeof Chart === "undefined") return;

  const ctx = canvasVentasDias.getContext("2d");
  if (!ctx) return;

  const ordenado = Object.entries(ventasPorDia)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const ultimos = ordenado.slice(-7);

  const labels = ultimos.map(([iso]) => formatearFechaCorta(iso));
  const data   = ultimos.map(([, total]) => total);

  if (chartVentasDias) chartVentasDias.destroy();

 chartVentasDias = new Chart(ctx, {
  type: "bar",
  data: {
    labels,
    datasets: [
      {
        label: "Monto vendido",
        data,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,   // 🔹 antes estaba en false
    aspectRatio: 2.5,            // 🔹 más ancho que alto
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});

function actualizarChartTopProductos(ranking) {
  if (!canvasProductosTop || typeof Chart === "undefined") return;

  const ctx = canvasProductosTop.getContext("2d");
  if (!ctx) return;

  if (!ranking || !ranking.length) {
    if (chartTopProductos) {
      chartTopProductos.destroy();
      chartTopProductos = null;
    }
    return;
  }

  const labels = ranking.map(([codigo]) => codigo);
  const data   = ranking.map(([, cant]) => cant);

  if (chartTopProductos) chartTopProductos.destroy();

 chartTopProductos = new Chart(ctx, {
  type: "doughnut",
  data: {
    labels,
    datasets: [
      {
        label: "Unidades vendidas",
        data,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,  // 🔹
    aspectRatio: 1.8,           // 🔹
  },
});
