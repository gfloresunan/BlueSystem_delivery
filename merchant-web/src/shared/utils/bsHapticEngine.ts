/**
 * 📳 bsHapticEngine - Motor Hháptico Web para BDL 3.0 (ADR-007)
 * Utiliza Navigator Vibration API para proveer respuesta hháptica sutil en la web.
 */
export const bsHapticEngine = {
  orderAccepted: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  paymentReceived: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Pulso doble rápido (30ms - 20ms pausa - 30ms)
      navigator.vibrate([30, 20, 30]);
    }
  },

  errorOrAlert: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      // Tres pulsos cortos de advertencia
      navigator.vibrate([40, 30, 40, 30, 40]);
    }
  },

  riskAlert: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 150]);
    }
  }
};
