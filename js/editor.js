// js/editor.js
// Editor de producto: crear / editar documentos en la colección "productos"

import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --------- DOM --------- //
const inputCodigo       = document.getElementById("prod-codigo");
const inputNombre       = document.getElementById("prod-nombre");
const inputDescripcion  = document.getElementById("prod-descripcion");
const inputPrecio       = document.getElementById("prod-precio");
const inputStock        = document.getElementById("prod-stock");
const inputCategoria    = document.getElementById("prod-categoria");
const inputSubcategoria = document.getElementById("prod-subcategoria");
const inputImagen       = document.getElementById("prod-imagen");
const inputEtiquetas    = document.getElementById("prod-etiquetas");
const checkDestacado    = document.getElementById("prod-destacado");

const form          = document.getElementById("form-producto");
const btnCancelar   = document.getElementById("btn-cancelar");
const lblTitulo     = document.getElementById("titulo-editor");
const crumbModo     = document.getElementById("crumb-modo");
const textoEstado   = document.getElementById("texto-estado");
const alertaForm    = document.getElementById("alerta-form");
const spanUserEmail = document.getElementById("user-email");

// Modo actual
let codigoOriginal = null; // cuando editamos, guardamos el código original

function mostrarAlerta(msg) {
  if (!alertaForm) return;
  alertaForm.textContent = msg;
  alertaForm.classList.add("visible");
}

function limpiarAlerta() {
  if (!alertaForm) return;
  alertaForm.textContent = "";
  alertaForm.classList.remove("visible");
}

// --------- AUTENTICACIÓN --------- //
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  if (spanUserEmail) {
    spanUserEmail.textContent = user.email || "";
  }

  await iniciarEditor();
});

// --------- INICIO (DETECTAR SI ES NUEVO O EDICIÓN) --------- //
async function iniciarEditor() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (id) {
    // Modo edición
    codigoOriginal = id;
    if (lblTitulo) lblTitulo.textContent = `Editar producto ${id}`;
    if (crumbModo) crumbModo.textContent = "Editar";
    if (textoEstado) textoEstado.textContent = `Editando ${id}`;
    if (inputCodigo) {
      inputCodigo.value = id;
      inputCodigo.disabled = true; // no permitimos cambiar el código (id documento)
    }

    await cargarProducto(id);
  } else {
    // Modo nuevo
    codigoOriginal = null;
    if (lblTitulo) lblTitulo.textContent = "Nuevo producto";
    if (crumbModo) crumbModo.textContent = "Nuevo";
    if (textoEstado) textoEstado.textContent = "Modo creación";
  }
}

// --------- CARGAR PRODUCTO EXISTENTE --------- //
async function cargarProducto(codigo) {
  try {
    const ref = doc(db, "productos", codigo);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      mostrarAlerta("No se encontró el producto en Firestore.");
      return;
    }

    const p = snap.data();

    // rellenar campos (usamos fallbacks por si vienen de import JSON)
    if (inputNombre) {
      inputNombre.value =
        p.nombre ||
        p.Nombre ||
        "";
    }

    if (inputDescripcion) {
      inputDescripcion.value =
        p.descripcionLarga ||
        p.descripcion ||
        p["Descripcion"] ||
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
      inputStock.value =
        p.stock ??
        p.Stock ??
        "";
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
      inputImagen.value =
        p.imagen ||
        p.Imagen ||
        "";
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
    mostrarAlerta("Error cargando el producto desde Firestore.");
  }
}

// --------- GUARDAR (CREAR / ACTUALIZAR) --------- //
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarAlerta();

    let codigo = (inputCodigo?.value || "").trim();
    const nombre = (inputNombre?.value || "").trim();
    const descripcion = (inputDescripcion?.value || "").trim();
    const precioNum = Number(inputPrecio?.value || 0);
    const stockNum = Number(inputStock?.value || 0);
    const categoria = (inputCategoria?.value || "").trim();
    const subcategoria = (inputSubcategoria?.value || "").trim();
    const imagen = (inputImagen?.value || "").trim();
    const etiquetasStr = (inputEtiquetas?.value || "").trim();
    const destacado = !!(checkDestacado?.checked);

    if (!codigo || !nombre) {
      mostrarAlerta("Código y nombre son obligatorios.");
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
      // nombres "nuevos"
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

      // nombres compatibles con la importación vieja
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
      if (codigoOriginal) {
        // MODO EDICIÓN
        const ref = doc(db, "productos", codigoOriginal);
        await updateDoc(ref, baseData);
      } else {
        // MODO NUEVO
        const ref = doc(db, "productos", codigo);
        await setDoc(ref, {
          ...baseData,
          creado: serverTimestamp(),
        });
      }

      alert("Producto guardado correctamente ✅");
      window.location.href = "admin.html";
    } catch (err) {
      console.error("Error guardando producto:", err);
      mostrarAlerta("Hubo un error al guardar el producto. Revisá la consola.");
    }
  });
}

// --------- BOTÓN CANCELAR --------- //
if (btnCancelar) {
  btnCancelar.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "admin.html";
  });
}
