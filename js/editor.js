// js/editor.js
// Crear / editar productos en la colección "productos"

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ---------- Referencias al DOM (coinciden con editor.html) ----------
const form              = document.getElementById("formProducto");
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

const tituloFormulario  = document.getElementById("tituloFormulario");
const subTituloHeader   = document.getElementById("subTituloHeader");
const modoTexto         = document.getElementById("modoTexto");
const mensaje           = document.getElementById("mensaje");
const previewImagenTag  = document.getElementById("previewImagenTag");

// Código original (cuando estamos editando)
let codigoEdicion = null;

// ---------- Helpers ----------
function mostrarMensaje(texto, tipo = "info") {
  if (!mensaje) return;
  mensaje.textContent = texto;
  mensaje.classList.remove("mensaje-ok", "mensaje-error");

  if (tipo === "ok") mensaje.classList.add("mensaje-ok");
  if (tipo === "error") mensaje.classList.add("mensaje-error");
}

function limpiarMensaje() {
  if (!mensaje) return;
  mensaje.textContent = "";
  mensaje.classList.remove("mensaje-ok", "mensaje-error");
}

function actualizarPreviewImagen(url) {
  if (!previewImagenTag) return;

  const limpia = (url || "").trim();
  if (limpia) {
    previewImagenTag.src = limpia;
    previewImagenTag.style.display = "block";
  } else {
    previewImagenTag.src = "";
    previewImagenTag.style.display = "none";
  }
}

// Vista previa en vivo al escribir la URL
if (inputImagen) {
  inputImagen.addEventListener("input", () => {
    actualizarPreviewImagen(inputImagen.value);
  });
}

// ---------- Cargar datos si estamos en modo edición ----------
async function iniciarEditor() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (id) {
    // MODO EDICIÓN
    codigoEdicion = id;
    if (tituloFormulario) tituloFormulario.textContent = "Editar producto";
    if (subTituloHeader)  subTituloHeader.textContent  = `Editando código ${id}`;
    if (modoTexto)        modoTexto.textContent        = "Modo edición";

    if (inputCodigo) {
      inputCodigo.value = id;
      inputCodigo.disabled = true; // no dejamos cambiar el código (ID del doc)
    }

    await cargarProducto(id);
  } else {
    // MODO NUEVO
    codigoEdicion = null;
    if (tituloFormulario) tituloFormulario.textContent = "Nuevo producto";
    if (subTituloHeader)  subTituloHeader.textContent  = "Nuevo producto";
    if (modoTexto)        modoTexto.textContent        = "Modo creación";
  }
}

async function cargarProducto(codigo) {
  try {
    const ref = doc(db, "productos", codigo);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      mostrarMensaje("No se encontró el producto en Firestore.", "error");
      return;
    }

    const p = snap.data();

    if (inputNombre)       inputNombre.value       = p.nombre || p.Nombre || "";
    if (inputCategoria)    inputCategoria.value    = p.categoria || p.Categoria_Princ || "";
    if (inputSubcategoria) inputSubcategoria.value = p.subcategoria || p.Sub_Categoria || "";
    if (inputPrecio)       inputPrecio.value       = p.precio ?? p.PrecioMayorista ?? "";
    if (inputStock)        inputStock.value        = p.stock ?? p.Stock ?? "";
    if (inputDescripcion)  inputDescripcion.value  =
      p.descripcionLarga || p.Descripcion || p.descripcion || "";

    if (inputImagen) {
      inputImagen.value = p.imagen || p.Imagen || "";
      actualizarPreviewImagen(inputImagen.value);
    }

    if (inputEtiquetas) {
      const etq = p.etiquetas || p.Etiquetas || p.tags || [];
      if (Array.isArray(etq)) {
        inputEtiquetas.value = etq.join(", ");
      } else if (typeof etq === "string") {
        inputEtiquetas.value = etq;
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

// ---------- Guardar (nuevo o edición) ----------
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje();

    let codigo = (inputCodigo?.value || "").trim();
    const nombre       = (inputNombre?.value || "").trim();
    const categoria    = (inputCategoria?.value || "").trim();
    const subcategoria = (inputSubcategoria?.value || "").trim();
    const descripcion  = (inputDescripcion?.value || "").trim();
    const precioNum    = Number(inputPrecio?.value || 0);
    const stockNum     = Number(inputStock?.value || 0);
    const urlImagen    = (inputImagen?.value || "").trim();
    const etiquetasStr = (inputEtiquetas?.value || "").trim();
    const destacado    = !!(checkDestacado?.checked);

    if (!codigo || !nombre) {
      mostrarMensaje("Código y nombre son obligatorios.", "error");
      return;
    }

    // normalizamos el código
    codigo = codigo.toUpperCase();

    // si estamos editando, usamos siempre el código original como id de doc
    const idDoc = codigoEdicion || codigo;

    // convertir etiquetas en array
    let etiquetasArr = [];
    if (etiquetasStr) {
      etiquetasArr = etiquetasStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const producto = {
      // campos principales (los que usa el admin)
      codigo,
      nombre,
      categoria,
      subcategoria,
      precio: precioNum,
      stock: stockNum,
      imagen: urlImagen,
      descripcionLarga: descripcion,
      destacado,
      etiquetas: etiquetasArr,
      actualizado: serverTimestamp(),

      // compatibilidad con datos viejos
      Codigo: codigo,
      Nombre: nombre,
      Categoria_Princ: categoria,
      Sub_Categoria: subcategoria,
      PrecioMayorista: precioNum,
      Stock: stockNum,
      Imagen: urlImagen,
      Descripcion: descripcion,
    };

    try {
      const ref = doc(db, "productos", idDoc);

      if (codigoEdicion) {
        // MODO EDICIÓN → sólo actualizamos
        await setDoc(ref, producto, { merge: true });
      } else {
        // MODO NUEVO → creamos con timestamps
        await setDoc(ref, {
          ...producto,
          creado: serverTimestamp(),
        });
      }

      mostrarMensaje("Producto guardado correctamente ✅", "ok");
      alert("Producto guardado correctamente ✅");
      window.location.href = "admin.html";
    } catch (err) {
      console.error("Error guardando producto:", err);
      mostrarMensaje("Hubo un error al guardar el producto. Revisá la consola.", "error");
    }
  });
} else {
  console.error("No se encontró el formulario con id='formProducto'");
}

// ---------- Arranque ----------
iniciarEditor();
