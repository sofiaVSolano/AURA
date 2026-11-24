// Texto y versión del consentimiento para guardar datos en una cuenta.
// Fuente única: lo usan el frontend (formulario) y el backend (validación del registro).
export const VERSION_CONSENTIMIENTO = '2026-11-v2';

export const QUE_SE_GUARDA = [
  'Tu correo y una versión cifrada (hash) de tu contraseña; nunca la contraseña en texto plano.',
  'Mi AURA: nombre, apariencia y las experiencias que la hacen crecer.',
  'AURA emocional: videos guardados, progreso visto y los aprendizajes que decidas escribir.',
  'AURA académica: temas marcados, actividades hechas y tus avances escritos.',
  'Cuántas evaluaciones con IA usaste (para respetar el límite de 2), nunca el texto evaluado.',
] as const;

export const NO_SE_GUARDA = [
  'Cómo te sientes cuando lo eliges al entrar (solo orienta la navegación).',
  'Tus respuestas del simulador de sustentación.',
  'Lo que escribes para que la IA lo evalúe ni tu tesis: se envían a OpenAI solo para evaluarlos y no se guardan en AURA.',
] as const;
