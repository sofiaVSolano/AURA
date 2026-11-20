# 01 · Diagnóstico del repositorio y stack

## Estado actual

El proyecto **todavía no es un repositorio de software**: no hay código, `package.json`, lockfile, configuración, documentación previa ni Git.

```
AURA/                       (dentro de OneDrive: C:\Users\sofia\OneDrive\AURA)
├── EstiloAnimación/
│   ├── estilo1.jpeg        2048×1071  ilustración vectorial plana (violeta)
│   ├── estilo1.1.jpeg       960×548   ilustración editorial (ocre/negro)
│   ├── estilo1.2.jpeg      2048×1428  gradiente con grano (azul→violeta)
│   └── estilo1.3.jpeg      1600×706   escena con foco de luz (azul noche)
└── EstiloPagina/
    └── estilos.tex         12 URLs de reels de Instagram
```

| Aspecto | Estado |
|---|---|
| Git | **No inicializado** (sin historial ni `.gitignore`) |
| Stack / framework | Ninguno todavía |
| Gestor de paquetes | Ninguno elegido; hay **npm 11.16.0** disponible |
| Scripts / dependencias | Ninguno |
| Documentación | Ninguna antes de esta carpeta `docs/` |

## Herramientas en la máquina

| Herramienta | Versión |
|---|---|
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| Git | 2.55.0 (Windows) |
| Python | 3.13.14 (con Pillow, que se usó para extraer las paletas) |
| pnpm / yarn / bun | No instalados |

Sistema operativo: Windows 11. Shells: PowerShell 5.1 y Git Bash.

## Hallazgos

1. **`estilos.tex` no es un documento LaTeX.** Es texto plano con 12 URLs (sin preámbulo, comandos ni capturas asociadas). La extensión no afecta a nada, pero conviene renombrarlo a `.md` o `.txt` cuando se decida.
2. **El proyecto está dentro de OneDrive.** La sincronización de `node_modules/`, `.git/` y las carpetas de compilación genera bloqueos de archivos, conflictos y lentitud. Ver riesgo R1 en [04-riesgos.md](04-riesgos.md).
3. **Hay una tilde en el nombre de una carpeta** (`EstiloAnimación`). Puede causar problemas de codificación en scripts, URLs y algunas herramientas de compilación. Conviene usar nombres ASCII (`referencias/animacion/`) cuando se reorganice. No se ha modificado nada.
4. **Las imágenes de referencia parecen material de terceros** (por su estilo, probablemente de bancos de imágenes o ilustradores editoriales) y su licencia es desconocida. Se usarán solo como inspiración, no como recursos del producto.
5. **Como no hay stack previo, no existe la restricción de "no cambiar de framework".** La elección del stack es una decisión nueva y se justifica en [05-arquitectura.md](05-arquitectura.md).
