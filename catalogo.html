<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Delivery Mayorista | Catálogo</title>

  <style>
    /* Ocultar el select de subcategorías (solo se usa internamente) */
    #filtro-subcategoria {
      display: none !important;
    }

    body {
      background: #0f0f1a;
      margin: 0;
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont,
        sans-serif;
      color: white;
    }

    header {
      background: linear-gradient(90deg, #ff005d, #ffa400);
      padding: 15px 25px;
      font-size: 20px;
      font-weight: 700;
    }

    .toolbar {
      display: flex;
      gap: 15px;
      padding: 25px;
      justify-content: flex-start;
      align-items: center;
      flex-wrap: wrap;
    }

    .toolbar input,
    .toolbar select {
      padding: 12px 18px;
      border-radius: 30px;
      border: none;
      outline: none;
      font-size: 15px;
      min-width: 230px;
    }

    /* Submenú de subcategorías pegado al select de categoría */
    .subcat-menu {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .subcat-chip {
      border-radius: 999px;
      padding: 6px 12px;
      border: none;
      font-size: 12px;
      cursor: pointer;
      background: #202432;
      color: #fff;
      white-space: nowrap;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .subcat-chip.activa {
      background: #ffa400;
      color: #000;
      font-weight: 600;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 25px;
      padding: 25px;
    }

    .producto-card {
      position: relative;
      background: #0c0c17;
      border-radius: 22px;
      padding: 18px 16px 16px;
      text-align: center;
      min-height: 260px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
      text-decoration: none;
      color: inherit;
      opacity: 1;
      translate: 0;
    }

    .producto-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55);
    }

    .producto-imagen-wrapper {
      width: 100%;
      height: 160px;
      border-radius: 18px;
      background: #0a0a12;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      margin-bottom: 10px;
    }

    .producto-imagen {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 16px;
      display: block;
      cursor: pointer;
    }

    .producto-titulo {
      margin-top: 2px;
      font-size: 15px;
      line-height: 1.15;
      cursor: pointer;
    }

    .producto-descripcion {
      opacity: 0.8;
      font-size: 13px;
      margin-top: 6px;
      line-height: 1.25;
      min-height: 36px;
    }

    .producto-precio-row {
      margin-top: 8px;
    }

    .producto-precio {
      color: #ffa400;
      font-weight: 700;
      margin-top: 4px;
      font-size: 15px;
    }

    .producto-stock {
      opacity: 0.8;
      font-size: 12px;
      margin-top: 4px;
    }

    .cantidad-container {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-cantidad {
      border-radius: 999px;
      border: none;
      width: 24px;
      height: 24px;
      font-size: 16px;
      cursor: pointer;
      background: #202432;
      color: #fff;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-cantidad {
      width: 50px;
      text-align: center;
      border-radius: 999px;
      border: none;
      padding: 4px 6px;
      font-size: 13px;
      outline: none;
    }

    .producto-acciones {
      margin-top: 8px;
      display: flex;
      justify-content: center;
    }

    .btn-agregar-carrito {
      padding: 6px 12px;
      border-radius: 999px;
      border: none;
      font-size: 12px;
      cursor: pointer;
      background: #202432;
      color: #fff;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-agregar-carrito-activo {
      background: #1ebe57;
    }

    /* BOTÓN FLOTANTE WHATSAPP EN CATÁLOGO (simple, link fijo) */
    .btn-wa-flotante {
      position: fixed;
      right: 18px;
      bottom: 18px;
      background: #25d366;
      color: #fff;
      padding: 10px 16px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
      z-index: 999;
      transition: transform 0.08s ease, filter 0.08s ease;
    }

    .btn-wa-flotante:hover {
      filter: brightness(1.06);
      transform: translateY(-1px);
    }

    /* MINI CARRITO FLOTANTE */
    .mini-carrito {
      position: fixed;
      right: 16px;
      bottom: 100px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 999px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      z-index: 9999;
      font-size: 13px;
      color: #000;
    }

    .mini-carrito-icono {
      font-size: 18px;
    }

    .mini-carrito-texto {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .mini-carrito-linea {
      white-space: nowrap;
      font-weight: 500;
    }

    /* SOLO EN CELULAR: subir un poco el mini carrito para que no tape el botón de WhatsApp */
    @media (max-width: 768px) {
      header {
        text-align: center;
        font-size: 18px;
      }

      .toolbar {
        padding: 18px 12px 10px;
        gap: 10px;
        flex-direction: column;
        align-items: flex-start;
      }

      .toolbar input,
      .toolbar select {
        width: 100%;
        max-width: 420px;
        font-size: 14px;
      }

      .subcat-menu {
        width: 100%;
        margin-top: 4px;
      }

      .grid {
        padding: 16px 12px 28px;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 18px;
      }

      .producto-card {
        padding: 14px 12px 14px;
        border-radius: 18px;
      }

      .producto-imagen-wrapper {
        height: 150px;
      }

      .producto-titulo {
        font-size: 14px;
      }

      .producto-descripcion {
        font-size: 12px;
        min-height: 32px;
      }

      .producto-precio {
        font-size: 14px;
      }

      #mini-carrito {
        bottom: 150px !important;
      }

      .btn-wa-flotante {
        bottom: 80px;
        right: 12px;
        font-size: 13px;
        padding: 9px 14px;
      }
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 22px;
      }

      .producto-card {
        padding: 16px 14px 16px;
      }

      .producto-imagen-wrapper {
        height: 150px;
      }

      .producto-titulo {
        font-size: 16px;
      }

      .producto-descripcion {
        font-size: 13px;
        min-height: 38px;
      }

      .producto-precio {
        font-size: 16px;
      }
    }
  </style>
</head>

<body>
  <header>DELIVERY MAYORISTA</header>

  <div class="toolbar">
    <input
      id="buscador"
      type="text"
      placeholder="Buscar por código o descripción"
    />

    <select id="filtro-categoria"></select>

    <!-- Submenú de subcategorías (chips) -->
    <div id="subcategoria-menu" class="subcat-menu"></div>
  </div>

  <div id="lista-productos" class="grid"></div>

  <!-- Botón flotante de WhatsApp (mensaje simple genérico) -->
  <a
    id="wa-flotante"
    class="btn-wa-flotante"
    href="https://wa.me/?text=Hola%20%21%20Quiero%20consultar%20por%20el%20cat%C3%A1logo%20mayorista."
    target="_blank"
  >
    WhatsApp Mayorista
  </a>

  <!-- MINI CARRITO GLOBAL -->
  <div id="mini-carrito" class="mini-carrito" onclick="irAlCarrito()">
    <div class="mini-carrito-icono">🛒</div>
    <div class="mini-carrito-texto">
      <span class="mini-carrito-linea">
        <span id="mini-carrito-cantidad">0</span> productos
      </span>
      <span class="mini-carrito-linea">
        $<span id="mini-carrito-total">0</span>
      </span>
    </div>
  </div>

  <!-- select oculto de subcategoría que usa el JS -->
  <select id="filtro-subcategoria" style="display:none;"></select>

  <!-- SCRIPT DEL CATÁLOGO + CARRITO -->
  <script src="js/catalogo.js?v=1"></script>
</body>
</html>
