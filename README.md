# reto-bienestar

Juego para las ferias o eventos de educación financiera de FINABIEN. Corre en una PC conectada a una TV o en una tablet: cada persona se registra con su nombre y su edad, juega, acumula puntos y los canjea por premios en el stand.

## Juegos

| Juego | Cómo se juega | Puntos |
|---|---|---|
| **Trivia Bienestar** | Preguntas de opción múltiple con tiempo. | 50 por acierto + hasta 25 por rapidez |
| **Decide rápido** | Mandar cada tarjeta a la cubeta correcta antes de que se acabe el tiempo. Para menores es "¿Necesidad o deseo?"; para 16+ es "¿Buena decisión o riesgo?". | 20 por acierto |
| **Memorama** | Unir cada concepto con su significado (para niñas y niños, dibujos iguales). | 300 menos 10 por movimiento extra |

Cada juego suma puntos en las primeras 2 partidas de cada jugador (`RETO_JUGADAS_CON_PUNTOS`); después es de práctica.

## Grupos de edad

| Grupo | Edad | Contenido |
|---|---|---|
| Exploradores | 10 años o menos | 3 opciones por pregunta, ahorro, necesidades y deseos |
| Retadores | 11 a 15 años | Presupuesto, interés, inflación, seguridad digital |
| Expertos | 16 años o más | Crédito, CAT, AFORE, fraudes, remesas y servicios de FINABIEN |

Los rangos se ajustan en [config/reto.php](config/reto.php).

## Cómo funciona

- **Kiosco** (`/`): pantalla de juegos para tablet o PC con TV, con teclado en pantalla, botones grandes y regreso automático al inicio tras 90 s sin actividad. Las fuentes van incluidas en el build, así que no necesita internet en la sede.
- **API** (`/api/*`): sin sesión ni CSRF para que una pantalla encendida todo el día no caduque, con límites de peticiones por IP. Las respuestas correctas nunca se envían al navegador: el servidor califica cada respuesta y abona los puntos.
- **Panel de staff** (`/staff`, protegido con `STAFF_PIN`): entregar premios por folio, existencias, preguntas de trivia, eventos y descarga CSV de jugadores y canjes.
- **Código de jugador**: 5 letras y números sin caracteres confusos (0/O, 1/I/L). Con él una persona sigue sumando en cualquier pantalla del stand.

## Instalación (desarrollo: `D:\Servidor\www`)

```bash
git clone https://github.com/armocte18-alt/reto-bienestar.git
cd reto-bienestar
composer install
npm install
cp .env.example .env        # configura DB_PASSWORD y cambia STAFF_PIN
php artisan key:generate
```

Crea la base de datos en MySQL y carga el contenido inicial:

```sql
CREATE DATABASE reto_bienestar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
php artisan migrate --seed
npm run build
```

### Apache

Se agrega en `Apache24\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    ServerName reto-finabien.com
    ServerAlias www.reto-finabien.com reto-finabien.com.192.168.0.189.nip.io www.reto-finabien.com.192.168.0.189.nip.io
    DocumentRoot "D:/Servidor/www/reto-bienestar/public"
    <Directory "D:/Servidor/www/reto-bienestar/public">
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog "logs/reto-bienestar-error.log"
    CustomLog "logs/reto-bienestar-access.log" combined
</VirtualHost>
```

En `C:\Windows\System32\drivers\etc\hosts` (como administrador):

```
127.0.0.1   reto-finabien.com
127.0.0.1   www.reto-finabien.com
```

Reinicia el servicio **Apache2.4** como administrador. Las tablets de la misma red entran con `http://www.reto-finabien.com.192.168.0.189.nip.io` sin tocar su archivo hosts.

## Producción (`C:\Servidor\www`)

1. Clona o actualiza el repositorio en `C:\Servidor\www\reto-bienestar`.
2. En `.env`: `APP_ENV=production`, `APP_DEBUG=false`, la contraseña de MySQL y un `STAFF_PIN` nuevo.
3. Ejecuta:
   ```bash
   composer install --no-dev --optimize-autoloader
   npm ci && npm run build
   php artisan migrate --force
   php artisan db:seed --force   # solo la primera vez
   php artisan optimize
   ```
4. En el VirtualHost cambia las rutas `D:/Servidor/www/...` por `C:/Servidor/www/...` y reinicia Apache.

Para actualizar después: `git pull`, luego los comandos del paso 3 sin el seed.

## Antes de cada evento

1. `/staff/eventos`: crea el evento. Al activarlo, el ranking se reinicia para la nueva feria.
2. `/staff/premios`: ajusta costos y existencias reales.
3. `/staff/preguntas`: revisa las preguntas con tema FINABIEN (cifras de sucursales, requisitos de la Tarjeta Finabien, tarifas) con el área responsable.
4. En el kiosco toca **Pantalla completa** (o F11) y deja la pantalla en el inicio.

## Pruebas

```bash
php artisan test
```

Cubren la asignación por edad, la calificación en el servidor, el límite de partidas con puntos, la validación del memorama, el canje con existencias y el acceso al panel con PIN.
