import fetch from 'node-fetch';

// Variables de entorno
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_V3_SECRET_KEY || process.env.RECAPTCHA_SECRET;
const RECAPTCHA_SCORE_THRESHOLD = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;

/**
 * Verifica un token de reCAPTCHA v3.
 * @param {string} token - El token de reCAPTCHA del cliente.
 * @param {string} remoteip - La dirección IP del cliente.
 * @param {string} expectedAction - La acción esperada (ej. 'login', 'signup').
 * @returns {Promise<boolean>} - True si la verificación es exitosa, false en caso contrario.
 */
export async function verifyRecaptcha(token, remoteip, expectedAction) {
  if (!token) {
    console.warn('⚠️ reCAPTCHA token is missing.');
    return false;
  }

  const params = new URLSearchParams({
    secret: RECAPTCHA_SECRET_KEY,
    response: token,
  });
  if (remoteip) {
    params.append('remoteip', remoteip);
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });

    if (!res.ok) {
      console.error(`❌ reCAPTCHA verification request failed with status: ${res.status}`);
      return false;
    }

    const data = await res.json();

    console.log('✅ reCAPTCHA verification response:', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      errorCodes: data['error-codes'],
    });

    // Verificación robusta para v3
    if (
      data.success &&
      data.score >= RECAPTCHA_SCORE_THRESHOLD &&
      data.action === expectedAction
    ) {
      return true;
    } else {
      console.warn('🚦 reCAPTCHA verification failed:', {
        success: data.success,
        score: data.score,
        expectedScore: RECAPTCHA_SCORE_THRESHOLD,
        action: data.action,
        expectedAction: expectedAction,
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Exception during reCAPTCHA verification:', error);
    return false;
  }
}
