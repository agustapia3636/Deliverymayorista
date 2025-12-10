// js/editor.js
// Editor de producto: crear / editar documentos en la colección "productos"
// Adaptado para editor.html (ids: formProducto, codigo, nombre, precio, etc.)

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- DOM (coinciden con editor.html) ----------
const inputCodigo       = document.getElementById("codigo");
const inputNombre       = document.getElementById("nombre");
const inputCategoria    = document.getElementById("categoria");
const inputSubcategoria = document.getElementById("subcategoria");
const inputPrecio       = document.getElementById("precio");
const inputStock        = document.getElementById("stock");
const inputImagen       = document.getElementById("imagen");
const inputEtiquetas    = document.getElementById("etiquetas");
const inputDescripcion  = document.getElementById("descripcion");
const checkDestacado    = document.getElementById("destacado");

const form              = document.getElementById("formProducto");
const btnGuardar        = document.getElementById("btnGuardar");
const lblTitulo         = document.getElementById("tituloFormulario");
const subTituloHeader   = document.getElementById("subTituloHeader");
const modoTexto         = document.getElementById("modoTexto");
const mensaje           = document.getElementById("mensaje");
const previewImagenTag  = document.getElementById("previewImagenTag");

// Modo actual
let codigoOriginal = null; // cuando editamos, guardamos el código original (id documento)

// ---------- Helpers de mensaje ----------
function limpiarMensaje() {
  if (!mensaje) return;
  mensaje.textContent = "";
  mensaje.classList.remove("mensaje-ok", "mensaje-error");
}

function mostrarMensaje(texto, tipo = "info") {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.remove("mensaje-ok", "mensaje-error");
  if (tipo === "ok") {
    mensaje.classList.add("mensaje-ok");
  } else if (tipo === "error") {
    mensaje.classList.add("mensaje-error");
  }
}

// ---------- Vista previa de imagen ----------
function actualizarPreviewImagen(url) {
  if (!previewImagenTag) return;

  if (url && url.trim() !== "") {
    previewImagenTag.src = url.trim();
    previewImagenTag.style.display = "block";
  } else {
    previewImagenTag.src = "";
    previewImagenTag.style.display = "none";
  }
}

if (inputImagen) {
  inputImagen.addEventListener("input", () => {
    actualizarPreviewImagen(inputImagen.value);
  });
}

// ---------- Inicio: detectar si es nuevo o edición ----------
async function iniciarEditor() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id"); // en tu admin.js usás editor.html?id=N0001

  if (id) {
    // MODO EDICIÓN
    codigoOriginal = id;

    if (lblTitulo)       lblTitulo.textContent = `Editar producto`;
    if (subTituloHeader) subTituloHeader.textContent = `Editando código ${id}`;
    if (modoTexto)       modoTexto.textContent = "Modo edición";
    if (inputCodigo) {
      inputCodigo.value = id;
      inputCodigo.disabled = true; // no permitimos cambiar el código (id de Firestore)
    }

    await cargarProducto(id);
  } else {
    // MODO NUEVO
    codigoOriginal = null;

    if (lblTitulo)       lblTitulo.textContent = "Nuevo producto";
    if (subTituloHeader) subTituloHeader.textContent = "Nuevo producto";
    if (modoTexto)       modoTexto.textContent = "Modo creación";
  }
}

// ---------- Cargar producto existente desde Firestore ----------
async function cargarProducto(codigo) {
  try {
    const ref = doc(db, "productos", codigo);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      mostrarMensaje("No se encontró el producto en Firestore.", "error");
      return;
    }

    const p = snap.data();

    // Rellenar campos con fallbacks (por si vienen de import viejo)
    if (inputNombre) {
      inputNombre.value = p.nombre || p.Nombre || "";
    }

    if (inputDescripcion) {
      inputDescripcion.value =
        p.descripcionLarga ||
        p.descripcion ||
        p.Descripcion ||
        "";
    }

    if (inputPrecio) {
      inputPrecio.value =
        p.precio ??
        p.PrecioMayorista ??
        p.precioMayorista ??
        "";
    }

    if (inputStock) {
      inputStock.value = p.stock ?? p.Stock ?? "";
    }

    if (inputCategoria) {
      inputCategoria.value =
        p.categoria ||
        p.Categoria_Princ ||
        p.Categoria ||
        "";
    }

    if (inputSubcategoria) {
      inputSubcategoria.value =
        p.subcategoria ||
        p.Sub_Categoria ||
        p.Subcategoria ||
        "";
    }

    if (inputImagen) {
      inputImagen.value = p.imagen || p.Imagen || "";
      actualizarPreviewImagen(inputImagen.value);
    }

    if (inputEtiquetas) {
      const etiquetas =
        p.etiquetas ||
        p.tags ||
        p.tag ||
        p.Etiquetas ||
        "";
      if (Array.isArray(etiquetas)) {
        inputEtiquetas.value = etiquetas.join(", ");
      } else if (typeof etiquetas === "string") {
        inputEtiquetas.value = etiquetas;
      }
    }

    if (checkDestacado) {
      checkDestacado.checked = !!p.destacado;
    }
  } catch (err) {
    console.error("Error cargando producto:", err);
    mostrarMensaje("Error cargando el producto desde Firestore.", "error");
  }
}

// ---------- Guardar (crear / actualizar) ----------
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje();

    let codigo = (inputCodigo?.value || "").trim();
    const nombre = (inputNombre?.value || "").trim();
    const categoria = (inputCategoria?.value || "").trim();
    const subcategoria = (inputSubcategoria?.value || "").trim();
    const descripcion = (inputDescripcion?.value || "").trim();
    const precioNum = Number(inputPrecio?.value || 0);
    const stockNum = Number(inputStock?.value || 0);
    const imagen = (inputImagen?.value || "").trim();
    const etiquetasStr = (inputEtiquetas?.value || "").trim();
    const destacado = !!(checkDestacado?.checked);

    if (!codigo || !nombre) {
      mostrarMensaje("Código y nombre son obligatorios.", "error");
      return;
    }

    // Normalizamos el código (ej: en mayúsculas)
    codigo = codigo.toUpperCase();

    // Procesar etiquetas a array
    let etiquetasArr = [];
    if (etiquetasStr) {
      etiquetasArr = etiquetasStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const baseData = {
      // nombres "nuevos" (los que usa tu admin.js)
      codigo,
      nombre,
      descripcionLarga: descripcion,
      precio: precioNum,
      stock: stockNum,
      categoria,
      subcategoria,
      imagen,
      etiquetas: etiquetasArr,
      destacado,
      actualizado: serverTimestamp(),

      // nombres compatibles con la importación vieja / catálogo
      Codigo: codigo,
      Nombre: nombre,
      Descripcion: descripcion,
      PrecioMayorista: precioNum,
      Stock: stockNum,
      Categoria_Princ: categoria,
      Sub_Categoria: subcategoria,
      Imagen: imagen,
    };

    try {
      if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando...";
      }

      if (codigoOriginal) {
        // MODO EDICIÓN: el id del doc ya existe (codigoOriginal)
        const ref = doc(db, "productos", codigoOriginal);
        await updateDoc(ref, baseData);
      } else {
        // MODO NUEVO: creamos doc con ID = código
        const ref = doc(db, "productos", codigo);
        await setDoc(ref, {
          ...baseData,
          creado: serverTimestamp(),
        });
      }

      mostrarMensaje("Producto guardado correctamente ✅", "ok");
      alert("Producto guardado correctamente ✅");
      window.location.href = "admin.html";
    } catch (err) {
      console.error("Error guardando producto:", err);
      mostrarMensaje("Hubo un error al guardar el producto. Revisá la consola.", "error");
    } finally {
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = "💾 Guardar producto";
      }
    }
  });
} else {
  console.error("No se encontró el formulario con id='formProducto'.");
}

// ---------- Arranque ----------
iniciarEditor();
