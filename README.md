# ✏️ Doodli

Un JRPG hecho a mano sobre una página de cuaderno: camina por el papel, habla con los garabatos y entra en combates por turnos con muchísimo "juice".

## ✨ Características

- Todo el arte está dibujado en código con trazo "hervido" (boiling line): cada línea tiembla frame a frame.
- Movimiento por celdas con interpolación suave y personaje en cuatro direcciones.
- NPCs con los que hablar (sistema de diálogos con retratos y expresiones).
- Combate por turnos al estilo Golden Sun: introducción con barridos de tinta, HUD de cuatro paneles y golpes con flair visual (lápiz, marcador, salpicaduras de tinta y números de daño flotantes).
- Transición de página tipo "flip" físico entre escenas.
- Decoraciones del mundo que también laten, papel cuadriculado renderizado una sola vez por rendimiento.

## 🚀 Cómo jugar / ejecutar

```bash
# No necesita build ni dependencias
python3 -m http.server 5173
# Abre http://localhost:5173
```

## 🎮 Controles

- Moverse: Flechas o `W` `A` `S` `D`
- Correr: `Shift`
- Hablar: `Espacio`

## 🛠️ Tecnología

- JavaScript (módulos ES) sobre Canvas 2D, sin frameworks ni build.
- Primitivas propias de dibujo a mano alzada (sketch.js) y tipografías "Caveat" / "Patrick Hand".

## 📦 Parte de mi colección de juegos

Uno más de mis juegos web hobby. ¡A explorar! 🎮
