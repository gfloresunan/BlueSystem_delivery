// Control de autenticación para el Panel Administrativo
document.addEventListener('DOMContentLoaded', () => {
    // Si viene un error en la URL (ej: Acceso denegado)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
        const errorMsg = document.getElementById('errorMsg');
        if (errorMsg) {
            errorMsg.textContent = 'Acceso Denegado: Su rol no cuenta con permisos administrativos.';
            errorMsg.classList.remove('hidden');
        }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMsg');
            const loginBtn = document.getElementById('loginBtn');
            
            // Mostrar loader
            loginBtn.querySelector('.btn-text').textContent = 'Validando Credenciales...';
            loginBtn.querySelector('.spinner').classList.remove('hidden');
            errorMsg.classList.add('hidden');

            try {
                // Autenticar credenciales con retry automático ante microcortes TCP
                let userCredential = null;
                for (let attempt = 1; attempt <= 2; attempt++) {
                    try {
                        userCredential = await auth.signInWithEmailAndPassword(email, password);
                        break;
                    } catch (err) {
                        if (err.code === 'auth/network-request-failed' && attempt < 2) {
                            console.warn('[AUTH] Reintentando conexión tras microcorte de red...');
                            await new Promise(res => setTimeout(res, 800));
                            continue;
                        }
                        throw err;
                    }
                }

                const user = userCredential.user;

                // Obtener Custom Claims del token JWT recién emitido (sin forzar request redundante a securetoken)
                let tokenResult = null;
                try {
                    tokenResult = await user.getIdTokenResult(false);
                } catch (tokenErr) {
                    console.warn('[AUTH] Fallback a token refresh:', tokenErr);
                    tokenResult = await user.getIdTokenResult(true);
                }

                const claims = (tokenResult && tokenResult.claims) || {};
                const claimRole = (claims.role || claims.eiamRole || '').toUpperCase();
                const isAdminClaim = claims.admin === true;
                const isSuperAdminClaim = claims.isSuperAdmin === true;

                const allowedAdminRoles = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT'];
                const isPlatformAdmin = allowedAdminRoles.includes(claimRole) ||
                                      isAdminClaim ||
                                      isSuperAdminClaim;

                if (isPlatformAdmin) {
                    window.location.href = 'dashboard.html';
                } else {
                    await auth.signOut();
                    throw new Error(`Acceso denegado: Su cuenta no cuenta con Custom Claims de administración.`);
                }
            } catch (error) {
                console.error("Error en login:", error);
                let msg = error.message;
                if (error.code === 'auth/network-request-failed') {
                    msg = 'La conexión con los servidores se interrumpió momentáneamente. Por favor intente de nuevo.';
                } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    msg = 'Credenciales incorrectas. Verifique su correo y contraseña.';
                }
                errorMsg.textContent = msg;
                errorMsg.classList.remove('hidden');
                loginBtn.querySelector('.btn-text').textContent = 'Ingresar al Sistema';
                loginBtn.querySelector('.spinner').classList.add('hidden');
            }
        });
    }
});
