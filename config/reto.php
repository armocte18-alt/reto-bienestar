<?php

/*
|--------------------------------------------------------------------------
| Reto Bienestar — reglas del juego
|--------------------------------------------------------------------------
| Todo lo que el equipo del stand puede querer ajustar sin tocar código.
*/

return [

    // PIN numérico para entrar al panel de staff (/staff).
    'staff_pin' => (string) env('STAFF_PIN', '246810'),

    // Cuántas partidas de un mismo juego suman puntos por jugador. Las demás son de práctica.
    'jugadas_con_puntos' => (int) env('RETO_JUGADAS_CON_PUNTOS', 2),

    // Segundos sin actividad antes de que el kiosco regrese a la pantalla de inicio.
    'inactividad_seg' => (int) env('RETO_INACTIVIDAD_SEG', 90),

    // Una partida abierta más de este tiempo ya no acepta respuestas.
    'partida_expira_min' => 10,

    /*
    | Rangos de edad. Edad máxima inclusiva de cada grupo; el último no tiene tope.
    | 10 años o menos → ninos · 11 a 15 → jovenes · 16 o más → adultos
    */
    'grupos' => [
        'ninos' => [
            'nombre' => 'Exploradores',
            'rango' => '10 años o menos',
            'edad_max' => 10,
            'etiquetas_clasifica' => ['a' => 'Lo necesito', 'b' => 'Lo quiero'],
            'titulo_clasifica' => '¿Lo necesito o lo quiero?',
        ],
        'jovenes' => [
            'nombre' => 'Retadores',
            'rango' => '11 a 15 años',
            'edad_max' => 15,
            'etiquetas_clasifica' => ['a' => 'Necesidad', 'b' => 'Deseo'],
            'titulo_clasifica' => '¿Necesidad o deseo?',
        ],
        'adultos' => [
            'nombre' => 'Expertos',
            'rango' => '16 años o más',
            'edad_max' => 200,
            'etiquetas_clasifica' => ['a' => 'Buena decisión', 'b' => 'Riesgo'],
            'titulo_clasifica' => '¿Buena decisión o riesgo?',
        ],
    ],

    'juegos' => [
        'trivia' => [
            'nombre' => 'Trivia Bienestar',
            'preguntas' => ['ninos' => 5, 'jovenes' => 6, 'adultos' => 6],
            'segundos' => ['ninos' => 30, 'jovenes' => 25, 'adultos' => 20],
            'puntos_acierto' => 50,
            'bono_rapidez_max' => 25,
        ],
        'clasifica' => [
            'nombre' => 'Decide rápido',
            'segundos' => ['ninos' => 50, 'jovenes' => 45, 'adultos' => 45],
            'tarjetas' => 12,
            'puntos_acierto' => 20,
        ],
        'memorama' => [
            'nombre' => 'Memorama',
            'pares' => 6,
            'puntos_max' => 300,
            'puntos_min' => ['ninos' => 120, 'jovenes' => 100, 'adultos' => 100],
            'castigo_por_movimiento' => 10,
            'segundos_minimos' => 8, // nadie resuelve 12 cartas más rápido; evita envíos falsos
        ],
    ],
];
