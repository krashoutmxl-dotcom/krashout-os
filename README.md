# Krashout OS

Centro de mando de Krashout (Mexicali).

**Cómo se usa:** a la izquierda hay 3 bolitas.
- **Plan** → pica el plan → salen los objetivos → pica uno → salen sus pasos (rojo falta, verde cumplido).
- **Tienda** → Inventario, Venta rápida (menudeo/mayoreo) y Ventas.
- **Centro** → Urgencias, Por comprar, Conectores y Seguridad.

En el cel las bolitas quedan abajo.

## Seguridad
- Usuario **Panini** con contraseña (la pone él la primera vez; no se guarda en ningún lado).
- Datos cifrados AES-256-GCM en el aparato; llave PBKDF2-SHA256 (310 000 vueltas) a partir de la contraseña.
- 5 intentos fallidos = bloqueo que va creciendo. Cierre automático a los 30 min sin uso.
- Nada de `innerHTML`: todo texto se pinta como texto. CSP estricta: sin scripts de fuera, sin conexiones a otros servidores.
- Agentes de seguridad de GitHub en `.claude/agents` (wshobson/agents y VoltAgent, licencia MIT en `.claude/licenses`).

## Pendiente
- Sincronizar compu y cel con Supabase (`supabase/schema.sql` queda listo para cuando se cree la cuenta).
