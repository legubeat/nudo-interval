# NUDO · Intervalos (v6)

Abre `index.html` en un navegador moderno. No requiere instalación ni dependencias.

- Espacio: pausa / continúa.
- S: detiene y reinicia la sesión en pausa (pulsa Espacio para comenzar).
- Esc: pide confirmación para salir. En pantalla completa algunos navegadores primero consumen Esc para salir de ese modo.
- Básico: cuenta atrás de 3 segundos.
- Mis actividades: cuenta atrás inicial configurable de 0 a 60 segundos.
- Los datos se guardan en localStorage. Exportación/importación JSON.
- Las sesiones antiguas sin el campo `countdown` se interpretan con 3 segundos.

- Sonido: un pitido por segundo durante la cuenta atrás inicial; también en los últimos 5 segundos de cada actividad y descanso.
- Los avisos se generan con Web Audio API (sin archivos ni librerías externas). El navegador debe permitir audio después de pulsar Iniciar.

V7: contador ajustado al ancho y alto disponibles del monitor; verificado en escritorio.

V8: logotipo NUDO en la esquina superior izquierda del entrenamiento, nombre de la actividad centrado y botón de salida a la derecha.


V9: corrección de contraste de textos secundarios (incluyendo política de descansos) y vista previa en los cuatro temas. Sin cambios en la lógica del temporizador.
