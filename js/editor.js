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
      inputCodigo.disabled = true; // no permitimos cambiar el código (id de Fir
