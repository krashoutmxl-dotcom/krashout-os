# Krashout OS

Centro de mando de Krashout (Mexicali): bitácora por objetivos, urgencias y por comprar.

- Sitio: GitHub Pages (este repo).
- Datos: Supabase con inicio de sesión por correo y reglas RLS (cada cuenta solo ve sus filas).
- Sin Supabase configurado corre en **modo prueba** (se guarda solo en el aparato).

## Configurar Supabase
1. Crear proyecto en supabase.com.
2. SQL Editor → pegar `supabase/schema.sql` → Run.
3. Authentication → Sign In / Providers → apagar "Allow new users to sign up".
4. Authentication → Users → Add user → el correo del dueño.
5. Authentication → URL Configuration → Site URL y Redirect URL = el link de GitHub Pages.
6. Pegar Project URL y anon key en `config.js`. **Nunca** la service_role key.

## Seguridad
- Todo texto se pinta como texto (nunca HTML), con límites de tamaño y filtro de caracteres invisibles.
- Content-Security-Policy: solo scripts propios; conexiones solo a Supabase.
- Librería de Supabase servida desde este repo con verificación SRI.
- Revisado con los agentes `frontend-security-coder` y `security-auditor` (wshobson/agents).
