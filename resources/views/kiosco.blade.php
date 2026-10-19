<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#0f2e29">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Reto Bienestar</title>
    @vite(['resources/css/kiosco.css', 'resources/js/kiosco/main.js'])
</head>
<body>
    <div id="app" data-api="{{ url('/api') }}">
        <div class="pantalla"><div class="cargando">Cargando Reto Bienestar…</div></div>
    </div>
    <noscript>Este kiosco necesita JavaScript activado.</noscript>
</body>
</html>
