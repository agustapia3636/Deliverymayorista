// URL base de las imágenes en GitHub
const BASE_IMG = "https://raw.githubusercontent.com/agustapia3636/deliverymayorista-img/main";

// Elementos del DOM
const grid = document.getElementById('grid-productos');
const buscador = document.getElementById('buscador');
const categoriaSelect = document.getElementById('categoria');

let productos = [];

// Cargar productos desde data/productos.json
async function cargarProductos() {
  try {
    const respuesta = await fetch('data/productos.json');
    productos = await respuesta.json();
    poblarCategorias();
    renderizarProductos(productos);
  } catch (error) {
    console.error('Error cargando productos:', error);
    grid.innerHTML = '<p>Error al cargar el catálogo.</p>';
  }
}

// Llenar el select de categorías
function poblarCategorias() {
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
  categorias.sort();
  categorias.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categoriaSelect.appendChild(opt);
  });
}

// Crear la imagen de cada producto
function crearImagenProducto(p) {
  const wrapper = document.createElement('div');
  wrapper.className = 'img-placeholder';

  const img = document.createElement('img');
  let triedLower = false;

  img.src = `${BASE_IMG}/${p.codigo}.JPG`;
  img.alt = p.nombre_corto || p.codigo;
  img.loading = 'lazy';

  img.onerror = () => {
    if (!triedLower) {
      triedLower = true;
      img.onerror = () => {
        wrapper.textContent = 'Sin imagen';
        img.remove();
      };
      img.src = `${BASE_IMG}/${p.codigo}.jpg`;
    } else {
      wrapper.textContent = 'Sin imagen';
      img.remove();
    }
  };

  wrapper.appendChild(img);
  return wrapper;
}

// Pintar las tarjetas de productos
function renderizarProductos(lista) {
  if (!lista.length) {
    grid.innerHTML = '<p>No se encontraron productos.</p>';
    return;
  }

  grid.innerHTML = '';
  lista.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card-producto';
    card.style.cursor = 'pointer';

    // 👉 Click que lleva a la ficha del producto
    card.addEventListener('click', () => {
      window.location.href = `producto.html?codigo=${encodeURIComponent(p.codigo)}`;
    });

    const imgWrapper = crearImagenProducto(p);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'card-body';

    const titulo = document.createElement('h2');
    titulo.textContent = `${p.codigo} - ${p.nombre_corto}`;

    const desc = document.createElement('p');
    desc.className = 'descripcion';
    desc.textContent = p.descripcion_larga || '';

    const precio = document.createElement('p');
    precio.className = 'precio';
    if (p.precio) {
      precio.textContent = `$ ${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }

    const categoria = document.createElement('p');
    categoria.className = 'categoria';
    if (p.categoria) {
      categoria.textContent = p.categoria;
    }

    cuerpo.appendChild(titulo);
    cuerpo.appendChild(desc);
    cuerpo.appendChild(precio);
    cuerpo.appendChild(categoria);

    card.appendChild(imgWrapper);
    card.appendChild(cuerpo);
    grid.appendChild(card);
  });
}

// Filtros
function aplicarFiltros() {
  const texto = buscador.value.toLowerCase().trim();
  const cat = categoriaSelect.value;

  const filtrados = productos.filter(p => {
    const coincideTexto =
      !texto ||
      (p.codigo && p.codigo.toLowerCase().includes(texto)) ||
      (p.nombre_corto && p.nombre_corto.toLowerCase().includes(texto)) ||
      (p.descripcion_larga && p.descripcion_larga.toLowerCase().includes(texto));

    const coincideCat = !cat || p.categoria === cat;

    return coincideTexto && coincideCat;
  });

  renderizarProductos(filtrados);
}

buscador.addEventListener('input', aplicarFiltros);
categoriaSelect.addEventListener('change', aplicarFiltros);

cargarProductos();

