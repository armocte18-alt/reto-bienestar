import { api } from './api.js';
import { sonido } from './sonido.js';
import { conectarTeclado, teclado } from './teclado.js';
import { AVATARES, GRUPO_CLASE, esc, fmt, moneda } from './util.js';
import { trivia } from './juegos/trivia.js';
import { clasifica } from './juegos/clasifica.js';
import { memorama } from './juegos/memorama.js';

const app = document.getElementById('app');
const URL_STAFF = (app.dataset.api ?? '/api').replace(/\/api$/, '/staff');

const S = {
    config: null,
    jugador: null,
    pantalla: 'inicio',
    reg: { paso: 1, nombre: '', edad: null, avatar: null },
    rankingGrupo: 'ninos',
    intervalos: [],
    limpiarJuego: null,
    ultimaActividad: Date.now(),
};

const DATOS = [
    'FINABIEN significa Financiera para el Bienestar y tiene sucursales en todo México.',
    'Con la Tarjeta Finabien, quienes viven en Estados Unidos pueden enviar dinero a sus familias en México.',
    'La Tarjeta Finabien se tramita sin costo en los consulados de México en Estados Unidos o en línea.',
    'Ahorrar $50 cada semana suma $2,600 en un año.',
    'Nadie de un banco o financiera te pedirá tu NIP por teléfono o por mensaje.',
    'Antes de pedir un crédito compara el CAT: entre más bajo, más barato te sale.',
    'Un fondo de emergencia te protege de imprevistos sin tener que endeudarte.',
    'Antes de comprar, pregúntate: ¿lo necesito o lo quiero?',
];

const JUEGOS = {
    trivia: {
        icono: '🧠', nombre: 'Trivia Bienestar', modulo: trivia,
        desc: { ninos: 'Contesta preguntas sobre el dinero y el ahorro.', otro: 'Responde rápido: entre más pronto aciertes, más puntos ganas.' },
        intro: (g) => g === 'ninos'
            ? 'Lee la pregunta y toca la respuesta correcta. ¡Tienes tiempo para pensar!'
            : 'Elige la respuesta correcta antes de que se acabe la barra. Contestar rápido te da puntos extra.',
    },
    clasifica: {
        icono: '⚡', nombre: 'Decide rápido', modulo: clasifica,
        desc: { ninos: 'Separa lo que necesitas de lo que quieres.', otro: 'Clasifica cada situación antes de que se acabe el tiempo.' },
        intro: (g) => g === 'adultos'
            ? 'Aparecerán situaciones de dinero. Mándalas a "Buena decisión" o a "Riesgo" lo más rápido que puedas.'
            : 'Aparecerán cosas que podrías comprar. Mándalas al lado correcto lo más rápido que puedas.',
    },
    memorama: {
        icono: '🃏', nombre: 'Memorama', modulo: memorama,
        desc: { ninos: 'Encuentra las parejas de dibujos iguales.', otro: 'Une cada concepto con su significado.' },
        intro: (g) => g === 'ninos'
            ? 'Voltea dos cartas a la vez y encuentra las parejas. ¡Entre menos intentos, más puntos!'
            : 'Voltea dos cartas y une cada palabra con su significado. Entre menos movimientos, más puntos.',
    },
};

// ---------------------------------------------------------------- utilidades de pantalla

function limpiar() {
    S.intervalos.forEach(clearInterval);
    S.intervalos = [];
    S.limpiarJuego?.();
    S.limpiarJuego = null;
    document.querySelectorAll('.capa').forEach((c) => c.remove());
}

function mostrar(nombre, html) {
    limpiar();
    S.pantalla = nombre;
    app.innerHTML = `<div class="pantalla">${html}</div>`;
    scrollTo(0, 0);
    return app.firstElementChild;
}

function aviso(texto) {
    document.querySelector('.aviso-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'aviso-toast';
    el.setAttribute('role', 'status');
    el.textContent = texto;
    document.body.append(el);
    setTimeout(() => el.remove(), 4200);
}

function modal(html) {
    const capa = document.createElement('div');
    capa.className = 'capa';
    capa.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.append(capa);
    capa.querySelector('button')?.focus();
    return capa;
}

const grupoDe = (j) => S.config.grupos[j.grupo];
const avatar = (clave, grupo) => `<span class="avatar ${GRUPO_CLASE[grupo] ?? ''}" aria-hidden="true"><span class="emoji">${AVATARES[clave] ?? '🙂'}</span></span>`;

// ---------------------------------------------------------------- inicio (modo atracción)

function pantallaInicio() {
    S.jugador = null;
    const c = S.config;
    const grupos = Object.entries(c.grupos);
    const el = mostrar('inicio', `
        <div class="inicio-grid">
            <section class="hero">
                <p class="etiqueta">${esc(c.evento?.nombre ?? 'Educación financiera')}${c.evento?.sede ? ` · ${esc(c.evento.sede)}` : ''}</p>
                <h1>Reto <span>Bienestar</span></h1>
                <p class="lema">Juega, aprende a cuidar tu dinero y junta puntos para ganar premios.</p>
                <div class="acciones">
                    <button class="btn btn-xl" data-ir="registro">¡Quiero jugar!</button>
                    <button class="btn btn-xl btn-fantasma" data-ir="codigo">Ya tengo código</button>
                </div>
                <div class="grupos-mini">
                    ${grupos.map(([k, g]) => `<span class="pildora grupo ${GRUPO_CLASE[k]}">${esc(g.nombre)} · ${esc(g.rango)}</span>`).join('')}
                </div>
                <div class="panel sabias" aria-live="polite">
                    <p class="etiqueta">¿Sabías que…?</p>
                    <p data-dato>${esc(DATOS[0])}</p>
                </div>
            </section>
            <aside class="lado">
                <section class="panel ranking">
                    <div class="barra">
                        <h2 style="font-size:1.8rem">Mejores puntajes</h2>
                        <div class="tabs" role="tablist">
                            ${grupos.map(([k, g]) => `<button class="tab ${GRUPO_CLASE[k]}" role="tab" data-grupo="${k}" aria-selected="${k === S.rankingGrupo}">${esc(g.nombre)}</button>`).join('')}
                        </div>
                    </div>
                    <div data-ranking></div>
                </section>
                <section class="panel">
                    <h2 style="font-size:1.8rem">Premios</h2>
                    <div class="tira-premios">
                        ${c.premios.map((p) => `<div class="${p.agotado ? 'agotado' : ''}"><span class="emoji" aria-hidden="true">${esc(p.icono)}</span>${esc(p.nombre)}<small>${p.agotado ? 'Agotado' : `${fmt(p.costo)} pts`}</small></div>`).join('') || '<p class="vacio">Pronto anunciaremos los premios.</p>'}
                    </div>
                </section>
            </aside>
        </div>
        <footer class="pie">
            <span>Información de FINABIEN: gob.mx/finabien · finabien.gob.mx</span>
            <span class="empuja">
                <button class="btn btn-chico btn-fantasma" data-sonido>${sonido.activo ? 'Sonido: sí' : 'Sonido: no'}</button>
                <button class="btn btn-chico btn-fantasma" data-pantalla-completa>Pantalla completa</button>
                <a class="btn btn-chico btn-fantasma" href="${URL_STAFF}">Staff</a>
            </span>
        </footer>`);

    pintarRanking(el);

    let dato = 0;
    S.intervalos.push(setInterval(() => {
        dato = (dato + 1) % DATOS.length;
        el.querySelector('[data-dato]').textContent = DATOS[dato];
    }, 8000));

    // Rota el ranking entre grupos y lo refresca para que la TV siempre se vea viva.
    const claves = grupos.map(([k]) => k);
    S.intervalos.push(setInterval(() => {
        S.rankingGrupo = claves[(claves.indexOf(S.rankingGrupo) + 1) % claves.length];
        pintarRanking(el);
    }, 7000));
    S.intervalos.push(setInterval(async () => {
        try {
            S.config = await api.configuracion();
            if (S.pantalla === 'inicio') pintarRanking(el);
        } catch { /* se reintenta en el siguiente ciclo */ }
    }, 30000));
}

function pintarRanking(el) {
    const lista = S.config.ranking[S.rankingGrupo] ?? [];
    el.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.grupo === S.rankingGrupo)));
    el.querySelector('[data-ranking]').innerHTML = lista.length
        ? `<ol>${lista.map((j, k) => `<li><span class="pos">${k + 1}</span>${avatar(j.avatar, S.rankingGrupo)}<span class="nom">${esc(j.nombre)}</span>${moneda(j.puntos)}</li>`).join('')}</ol>`
        : `<p class="vacio">Nadie ha jugado todavía en este grupo. ¡Sé la primera persona en el ranking!</p>`;
}

// ---------------------------------------------------------------- registro (3 pasos)

function pantallaRegistro() {
    const r = S.reg;
    const pasos = `<div class="pasos" aria-label="Paso ${r.paso} de 3">${[1, 2, 3].map((n) => `<span class="${n <= r.paso ? 'hecho' : ''}"></span>`).join('')}</div>`;
    const barra = `<div class="barra"><button class="btn btn-chico btn-fantasma" data-atras>← ${r.paso === 1 ? 'Inicio' : 'Atrás'}</button>${pasos}</div>`;

    if (r.paso === 1) {
        const el = mostrar('registro', `${barra}
            <div class="registro">
                <h2>¿Cómo te llamas?</h2>
                <p class="ayuda">Escribe tu nombre o un apodo. Así aparecerás en el ranking.</p>
                <input id="nombre" class="campo-grande" maxlength="20" autocomplete="off" inputmode="none" value="${esc(r.nombre)}" aria-label="Tu nombre o apodo">
                <p class="error" data-error></p>
                ${teclado()}
                <button class="btn btn-xl" data-continuar ${r.nombre.trim().length >= 2 ? '' : 'disabled'}>Continuar</button>
            </div>`);
        const campo = el.querySelector('#nombre');
        const btn = el.querySelector('[data-continuar]');
        conectarTeclado(el, campo, {
            max: 20,
            alCambiar: (v) => { r.nombre = v; btn.disabled = v.trim().length < 2; },
        });
        campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !btn.disabled) btn.click(); });
        btn.addEventListener('click', () => { r.paso = 2; pantallaRegistro(); });
        campo.focus();
        return;
    }

    if (r.paso === 2) {
        // 5 o menos y 18+ se agrupan en rangos para que la cuadrícula quepa en una pantalla.
        const edades = [
            { v: 5, t: '5', s: 'o menos' }, ...Array.from({ length: 12 }, (_, k) => ({ v: k + 6, t: String(k + 6) })),
            { v: 18, t: '18', s: 'a 29' }, { v: 30, t: '30', s: 'a 59' }, { v: 60, t: '60', s: 'o más' },
        ];
        const el = mostrar('registro', `${barra}
            <div class="registro">
                <h2>¿Cuántos años tienes, ${esc(r.nombre.trim())}?</h2>
                <p class="ayuda">Así te tocan preguntas hechas para tu edad.</p>
                <div class="edades">
                    ${edades.map((e) => `<button class="edad" data-edad="${e.v}" aria-pressed="${r.edad === e.v}">${e.t}${e.s ? `<small>${e.s}</small>` : ''}</button>`).join('')}
                </div>
            </div>`);
        el.querySelector('.edades').addEventListener('click', (e) => {
            const b = e.target.closest('[data-edad]');
            if (!b) return;
            sonido.toque();
            r.edad = Number(b.dataset.edad);
            r.paso = 3;
            pantallaRegistro();
        });
        return;
    }

    const el = mostrar('registro', `${barra}
        <div class="registro">
            <h2>Elige tu personaje</h2>
            <div class="avatares">
                ${Object.entries(AVATARES).map(([k, e]) => `<button class="avatar-opcion" data-avatar="${k}" aria-pressed="${r.avatar === k}" aria-label="${k}">${e}</button>`).join('')}
            </div>
            <p class="error" data-error></p>
            <button class="btn btn-xl" data-registrar ${r.avatar ? '' : 'disabled'}>¡A jugar!</button>
        </div>`);
    const btn = el.querySelector('[data-registrar]');
    el.querySelector('.avatares').addEventListener('click', (e) => {
        const b = e.target.closest('[data-avatar]');
        if (!b) return;
        sonido.toque();
        r.avatar = b.dataset.avatar;
        el.querySelectorAll('.avatar-opcion').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        btn.disabled = false;
    });
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
            S.jugador = await api.registrar({ nombre: r.nombre.trim(), edad: r.edad, avatar: r.avatar });
            S.reg = { paso: 1, nombre: '', edad: null, avatar: null };
            sonido.premio();
            pantallaCodigoNuevo();
        } catch (e) {
            el.querySelector('[data-error]').textContent = e.message;
            btn.disabled = false;
        }
    });
}

function pantallaCodigoNuevo() {
    const j = S.jugador;
    const g = grupoDe(j);
    const el = mostrar('codigo-nuevo', `
        <div class="resultado"><div class="caja">
            ${avatar(j.avatar, j.grupo).replace('class="avatar', 'style="width:6rem;height:6rem;font-size:3.6rem" class="avatar')}
            <h2>¡Hola, ${esc(j.nombre)}!</h2>
            <span class="pildora grupo ${GRUPO_CLASE[j.grupo]}">Grupo ${esc(g.nombre)} · ${esc(g.rango)}</span>
            <p>Este es tu código. Tómale foto o anótalo: con él sigues juntando puntos en cualquier pantalla del stand.</p>
            <div class="codigo-grande" aria-label="Tu código">${esc(j.codigo)}</div>
            <button class="btn btn-xl" data-continuar>Ver los juegos</button>
        </div></div>`);
    el.querySelector('[data-continuar]').addEventListener('click', pantallaHub);
}

function pantallaCodigo() {
    const el = mostrar('codigo', `
        <div class="barra"><button class="btn btn-chico btn-fantasma" data-atras>← Inicio</button></div>
        <div class="registro">
            <h2>Escribe tu código</h2>
            <p class="ayuda">Son 5 letras y números. Lo recibiste al registrarte.</p>
            <input id="codigo" data-modo="codigo" class="campo-grande campo-codigo" maxlength="5" autocomplete="off" inputmode="none" aria-label="Tu código">
            <p class="error" data-error></p>
            ${teclado({ modo: 'codigo' })}
            <button class="btn btn-xl" data-entrar disabled>Entrar</button>
        </div>`);
    const campo = el.querySelector('#codigo');
    const btn = el.querySelector('[data-entrar]');
    const err = el.querySelector('[data-error]');
    conectarTeclado(el, campo, {
        max: 5,
        alCambiar: (v) => {
            campo.value = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
            btn.disabled = campo.value.length < 5;
            err.textContent = '';
        },
    });
    const entrar = async () => {
        btn.disabled = true;
        try {
            S.jugador = await api.jugador(campo.value);
            sonido.bien();
            pantallaHub();
        } catch (e) {
            err.textContent = e.message;
            sonido.mal();
            btn.disabled = false;
        }
    };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !btn.disabled) entrar(); });
    btn.addEventListener('click', entrar);
    campo.focus();
}

// ---------------------------------------------------------------- hub del jugador

function barraJugador(j) {
    const g = grupoDe(j);
    return `
        <header class="barra jugador-barra ${GRUPO_CLASE[j.grupo]}">
            ${avatar(j.avatar, j.grupo)}
            <div>
                <div class="nombre">${esc(j.nombre)}</div>
                <div class="codigo">Código <strong>${esc(j.codigo)}</strong> · ${esc(g.nombre)}</div>
            </div>
            <div class="empuja barra">
                ${moneda(j.puntos)}
                <button class="btn btn-chico btn-fantasma" data-salir>Terminar</button>
            </div>
        </header>`;
}

function siguientePremio(j) {
    const disponibles = S.config.premios.filter((p) => !p.agotado);
    const alcanzables = disponibles.filter((p) => p.costo <= j.puntos);
    const proximo = disponibles.find((p) => p.costo > j.puntos);
    return { alcanzables, proximo };
}

function pantallaHub() {
    const j = S.jugador;
    const max = S.config.jugadas_con_puntos;
    const { alcanzables, proximo } = siguientePremio(j);
    const tituloClasifica = grupoDe(j).titulo_clasifica;

    const tarjeta = (clave) => {
        const info = JUEGOS[clave];
        const usadas = j.jugadas[clave] ?? 0;
        const estado = usadas < max
            ? `<span class="estado-juego">Suma puntos · partida ${usadas + 1} de ${max}</span>`
            : `<span class="estado-juego practica">Modo práctica · ya sumaste tus puntos aquí</span>`;
        return `
            <button class="juego-card ${clave}" data-juego="${clave}">
                <span class="ilustra" aria-hidden="true">${info.icono}</span>
                <h3>${esc(clave === 'clasifica' ? tituloClasifica : info.nombre)}</h3>
                <p>${esc(info.desc[j.grupo] ?? info.desc.otro)}</p>
                ${estado}
            </button>`;
    };

    const meta = proximo
        ? `<p class="etiqueta">Tu siguiente premio</p>
           <h3><span class="emoji">${esc(proximo.icono)}</span> ${esc(proximo.nombre)}</h3>
           <div class="barra-progreso"><span style="width:${Math.min(100, (j.puntos / proximo.costo) * 100)}%"></span></div>
           <p class="falta">Te faltan ${fmt(proximo.costo - j.puntos)} puntos.</p>`
        : `<p class="etiqueta">Premios</p><h3>¡Tienes puntos para el premio mayor!</h3>`;

    const el = mostrar('hub', `
        ${barraJugador(j)}
        <div class="hub">
            <section class="juegos" aria-label="Juegos">${['trivia', 'clasifica', 'memorama'].map(tarjeta).join('')}</section>
            <aside class="panel meta-premio">
                ${meta}
                <button class="btn ${alcanzables.length ? 'btn-rosa' : 'btn-fantasma'}" style="width:100%" data-premios>
                    ${alcanzables.length ? `¡Canjear premio! (${alcanzables.length})` : 'Ver premios'}
                </button>
                ${j.canjes.length ? `<p class="etiqueta" style="margin-top:1.2rem">Mis premios</p>
                    <ul class="mis-premios">${j.canjes.map((c) => `<li><span>${esc(c.icono ?? '')} ${esc(c.premio)}</span><span>${c.entregado ? 'Entregado' : esc(c.folio)}</span></li>`).join('')}</ul>` : ''}
            </aside>
        </div>`);

    el.querySelector('.juegos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-juego]');
        if (b) { sonido.toque(); pantallaIntro(b.dataset.juego); }
    });
    el.querySelector('[data-premios]').addEventListener('click', pantallaPremios);
}

// ---------------------------------------------------------------- juegos

function pantallaIntro(clave) {
    const j = S.jugador;
    const info = JUEGOS[clave];
    const max = S.config.jugadas_con_puntos;
    const cuenta = (j.jugadas[clave] ?? 0) < max;
    const titulo = clave === 'clasifica' ? grupoDe(j).titulo_clasifica : info.nombre;
    const el = mostrar('intro', `
        <div class="barra"><button class="btn btn-chico btn-fantasma" data-volver>← Juegos</button><span class="empuja">${moneda(j.puntos)}</span></div>
        <div class="intro"><div class="caja">
            <span class="ilustra" aria-hidden="true">${info.icono}</span>
            <h2>${esc(titulo)}</h2>
            <p>${esc(info.intro(j.grupo))}</p>
            <p class="aviso">${cuenta ? 'Esta partida suma puntos.' : 'Ya sumaste puntos en este juego: esta partida es de práctica.'}</p>
            <p class="error" data-error></p>
            <button class="btn btn-xl" data-empezar>¡Empezar!</button>
        </div></div>`);
    el.querySelector('[data-volver]').addEventListener('click', pantallaHub);
    const btn = el.querySelector('[data-empezar]');
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
            const datos = await api.iniciar(j.codigo, clave);
            jugar(clave, datos, titulo);
        } catch (e) {
            el.querySelector('[data-error]').textContent = e.message;
            btn.disabled = false;
        }
    });
}

function jugar(clave, datos, titulo) {
    const el = mostrar('juego', '');
    const ctx = {
        raiz: el,
        datos,
        aviso,
        cabecera: (puntos, extra = '') => `
            <div class="juego-top">
                <button class="btn btn-chico btn-fantasma" data-abandonar>✕ Salir</button>
                <h2>${esc(titulo)}</h2>
                ${extra ? `<span class="empuja pildora" style="font-size:1.1rem">${extra}</span>` : ''}
                ${puntos !== null ? `<span class="marcador">${moneda(puntos)}</span>` : ''}
            </div>`,
        marcador: (p) => {
            const m = el.querySelector('.marcador');
            if (m) m.innerHTML = moneda(p);
        },
        alTerminar: (resumen, repaso) => pantallaResultado(resumen, repaso),
        salir: pantallaHub,
    };
    S.limpiarJuego = JUEGOS[clave].modulo(ctx);

    // Delegado: la cabecera se vuelve a pintar en cada pregunta.
    el.addEventListener('click', (e) => {
        if (!e.target.closest('[data-abandonar]')) return;
        const capa = modal(`
            <h2>¿Salir del juego?</h2>
            <p>Si sales ahora, esta partida no suma puntos.</p>
            <div class="acciones">
                <button class="btn" data-seguir>Seguir jugando</button>
                <button class="btn btn-fantasma" data-confirmar>Salir</button>
            </div>`);
        capa.querySelector('[data-seguir]').addEventListener('click', () => capa.remove());
        capa.querySelector('[data-confirmar]').addEventListener('click', () => { capa.remove(); pantallaHub(); });
    });
}

function pantallaResultado(resumen, repaso = []) {
    S.jugador = resumen.jugador;
    const r = resumen;
    const titulo = r.juego === 'memorama'
        ? '¡Encontraste todas las parejas!'
        : r.aciertos === r.total_items ? '¡Perfecto!' : r.aciertos >= r.total_items / 2 ? '¡Muy bien!' : '¡Buen intento!';
    const detalle = r.juego === 'memorama' ? '' : `<p>${r.aciertos} de ${r.total_items} correctas</p>`;
    const nota = r.cuenta_puntos
        ? `<p>Sumaste <strong>${fmt(r.puntos)}</strong> puntos. Ahora tienes ${fmt(r.jugador.puntos)}.</p>`
        : `<p>Fue una partida de práctica: no suma puntos. Prueba otro juego.</p>`;
    sonido.fin();

    const el = mostrar('resultado', `
        <div class="resultado"><div class="caja">
            <h2>${titulo}</h2>
            <div class="grande"><span class="moneda" aria-hidden="true"></span>${r.cuenta_puntos ? '+' : ''}${fmt(r.puntos)}</div>
            ${detalle}
            ${nota}
            ${repaso.length ? `<div class="repaso"><p class="etiqueta">Para repasar</p>${repaso.slice(0, 3).map((x) => `<div><strong>${esc(x.titulo)}</strong><span>${esc(x.texto)}</span></div>`).join('')}</div>` : ''}
            <div class="acciones">
                <button class="btn btn-xl" data-otro>Jugar otro juego</button>
                <button class="btn btn-xl btn-rosa" data-premios>Ver premios</button>
            </div>
        </div></div>`);
    el.querySelector('[data-otro]').addEventListener('click', pantallaHub);
    el.querySelector('[data-premios]').addEventListener('click', pantallaPremios);
}

// ---------------------------------------------------------------- premios

function pantallaPremios() {
    const j = S.jugador;
    const el = mostrar('premios', `
        ${barraJugador(j)}
        <div class="barra"><button class="btn btn-chico btn-fantasma" data-volver>← Juegos</button><h2 style="font-size:2.4rem">Premios</h2></div>
        <div class="premios-grid">
            ${S.config.premios.map((p) => {
                const alcanza = j.puntos >= p.costo;
                return `
                <div class="panel premio ${p.agotado ? 'agotado' : ''}">
                    <span class="emoji" aria-hidden="true">${esc(p.icono)}</span>
                    <h3>${esc(p.nombre)}</h3>
                    ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
                    <span class="costo">${moneda(p.costo)}</span>
                    ${p.agotado ? '<p>Agotado</p>' : alcanza
                        ? `<button class="btn btn-rosa" data-canjear="${p.id}">Canjear</button>`
                        : `<div class="barra-progreso"><span style="width:${Math.min(100, (j.puntos / p.costo) * 100)}%"></span></div><p>Te faltan ${fmt(p.costo - j.puntos)}</p>`}
                </div>`;
            }).join('')}
        </div>`);
    el.querySelector('[data-volver]').addEventListener('click', pantallaHub);
    el.querySelector('.premios-grid').addEventListener('click', (e) => {
        const b = e.target.closest('[data-canjear]');
        if (b) confirmarCanje(S.config.premios.find((p) => p.id === Number(b.dataset.canjear)));
    });
}

function confirmarCanje(premio) {
    const capa = modal(`
        <span class="emoji" style="font-size:4rem" aria-hidden="true">${esc(premio.icono)}</span>
        <h2>¿Canjear ${esc(premio.nombre)}?</h2>
        <p>Se descontarán ${fmt(premio.costo)} puntos. Te quedarán ${fmt(S.jugador.puntos - premio.costo)}.</p>
        <p class="error" data-error></p>
        <div class="acciones">
            <button class="btn btn-rosa" data-si>Sí, canjear</button>
            <button class="btn btn-fantasma" data-no>Mejor sigo jugando</button>
        </div>`);
    capa.querySelector('[data-no]').addEventListener('click', () => capa.remove());
    const si = capa.querySelector('[data-si]');
    si.addEventListener('click', async () => {
        si.disabled = true;
        try {
            const r = await api.canjear(S.jugador.codigo, premio.id);
            S.jugador = r.jugador;
            S.config.premios = r.premios;
            capa.remove();
            sonido.premio();
            pantallaPremios();
            const ok = modal(`
                <h2>¡Premio canjeado!</h2>
                <p>Muestra este folio en el stand para recibir tu ${esc(premio.nombre.toLowerCase())}:</p>
                <div class="codigo-grande" style="font-size:3.6rem;justify-self:center">${esc(r.folio)}</div>
                <button class="btn btn-xl" data-ok>Listo</button>`);
            ok.querySelector('[data-ok]').addEventListener('click', () => ok.remove());
        } catch (e) {
            capa.querySelector('[data-error]').textContent = e.message;
            si.disabled = false;
        }
    });
}

// ---------------------------------------------------------------- inactividad y kiosco

function terminarSesion() {
    S.reg = { paso: 1, nombre: '', edad: null, avatar: null };
    pantallaInicio();
}

function vigilarInactividad() {
    const marcar = () => { S.ultimaActividad = Date.now(); };
    ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, marcar, { passive: true }));

    let capa = null;
    let cuenta = 0;
    setInterval(() => {
        // Si un cambio de pantalla cerró el aviso, se reinicia la vigilancia.
        if (capa && !capa.isConnected) { clearInterval(cuenta); capa = null; S.ultimaActividad = Date.now(); }
        if (S.pantalla === 'inicio' || capa) return;
        const limite = (S.config?.inactividad_seg ?? 90) * 1000;
        if (Date.now() - S.ultimaActividad < limite) return;

        let resta = 10;
        capa = modal(`
            <h2>¿Sigues ahí?</h2>
            <p>Volveremos al inicio en <strong data-resta>${resta}</strong> segundos.${S.jugador ? ` Tus puntos quedan guardados con el código <strong>${esc(S.jugador.codigo)}</strong>.` : ''}</p>
            <button class="btn btn-xl" data-sigo>Sigo aquí</button>`);
        cuenta = setInterval(() => {
            resta--;
            const r = capa?.querySelector('[data-resta]');
            if (r) r.textContent = resta;
            if (resta <= 0) {
                clearInterval(cuenta);
                capa?.remove();
                capa = null;
                terminarSesion();
            }
        }, 1000);
        capa.querySelector('[data-sigo]').addEventListener('click', () => {
            clearInterval(cuenta);
            capa.remove();
            capa = null;
            S.ultimaActividad = Date.now();
        });
    }, 1000);
}

async function mantenerPantallaEncendida() {
    try { await navigator.wakeLock?.request('screen'); } catch { /* no soportado */ }
}

// Clics globales de navegación (botones presentes en varias pantallas).
app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-ir="registro"]')) { sonido.toque(); S.reg = { paso: 1, nombre: '', edad: null, avatar: null }; pantallaRegistro(); }
    else if (t.closest('[data-ir="codigo"]')) { sonido.toque(); pantallaCodigo(); }
    else if (t.closest('[data-atras]')) {
        if (S.pantalla === 'registro' && S.reg.paso > 1) { S.reg.paso--; pantallaRegistro(); } else terminarSesion();
    } else if (t.closest('[data-salir]')) {
        const capa = modal(`
            <h2>¿Terminar por hoy?</h2>
            <p>Tus puntos quedan guardados. Vuelve cuando quieras con tu código:</p>
            <div class="codigo-grande" style="font-size:3.2rem;justify-self:center">${esc(S.jugador?.codigo ?? '')}</div>
            <div class="acciones"><button class="btn" data-quedar>Seguir jugando</button><button class="btn btn-fantasma" data-fin>Terminar</button></div>`);
        capa.querySelector('[data-quedar]').addEventListener('click', () => capa.remove());
        capa.querySelector('[data-fin]').addEventListener('click', terminarSesion);
    } else if (t.closest('[data-grupo]') && S.pantalla === 'inicio') {
        S.rankingGrupo = t.closest('[data-grupo]').dataset.grupo;
        pintarRanking(app.firstElementChild);
    } else if (t.closest('[data-sonido]')) {
        t.closest('[data-sonido]').textContent = sonido.alternar() ? 'Sonido: sí' : 'Sonido: no';
    } else if (t.closest('[data-pantalla-completa]')) {
        document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.().catch(() => aviso('Este navegador no permite pantalla completa. Usa F11.'));
    }
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') mantenerPantallaEncendida(); });
addEventListener('pointerdown', mantenerPantallaEncendida, { once: true });

async function arrancar() {
    try {
        S.config = await api.configuracion();
    } catch (e) {
        mostrar('error', `<div class="cargando" style="text-align:center">${esc(e.message)}<br><small>Reintentando en 5 segundos…</small></div>`);
        setTimeout(arrancar, 5000);
        return;
    }
    S.rankingGrupo = Object.keys(S.config.grupos)[0];
    pantallaInicio();
    vigilarInactividad();
}

arrancar();
