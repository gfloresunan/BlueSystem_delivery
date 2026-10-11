/// BLUE SYSTEM DELIVERY ENTERPRISE — AUTH SCREEN (1:1 ANDROID PARITY)
/// Reconstructs com.example.presentation.auth.AuthScreen.kt
/// Social Auth (Google, Facebook), Email/Phone login, Client Registration,
/// Password Recovery, and Guest Exploration with BSDS aesthetics.

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/observability/app_logger.dart';
import '../../providers/session_state.dart';
import '../../theme/brand_theme_builder.dart';


class LoginScreen extends StatefulWidget {
  final SessionState sessionState;
  final VoidCallback onLoginSuccess;

  const LoginScreen({
    super.key,
    required this.sessionState,
    required this.onLoginSuccess,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLogin = true;
  bool _showOtherMethods = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  // Legal Consent
  bool _isTermsAccepted = false;
  String? _termsUrl;
  String? _privacyUrl;
  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  // Forgot password
  final _resetEmailController = TextEditingController();
  bool _isSendingReset = false;
  String? _resetMessage;
  bool _resetIsError = false;

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => _openLegalUrl(_termsUrl, 'Términos y Condiciones');
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => _openLegalUrl(_privacyUrl, 'Políticas de Privacidad');
    _loadBrandLegalUrls();
  }

  Future<void> _loadBrandLegalUrls() async {
    try {
      final meta = widget.sessionState.activeBrand?.metadata;
      if (meta?.termsUrl != null && meta!.termsUrl!.isNotEmpty) {
        _termsUrl = meta.termsUrl;
      }
      if (meta?.privacyUrl != null && meta!.privacyUrl!.isNotEmpty) {
        _privacyUrl = meta.privacyUrl;
      }
      if (_termsUrl == null || _privacyUrl == null) {
        final snap = await FirebaseFirestore.instance.collection('brands').doc('tuanigo').get();
        if (snap.exists) {
          final data = snap.data();
          final rawMeta = data?['metadata'] as Map<String, dynamic>?;
          if (mounted) {
            setState(() {
              _termsUrl ??= rawMeta?['termsUrl'] as String? ?? data?['termsUrl'] as String?;
              _privacyUrl ??= rawMeta?['privacyUrl'] as String? ?? data?['privacyUrl'] as String?;
            });
          }
        }
      }
    } catch (e) {
      AppLogger.warn('LoginScreen', 'No se pudieron obtener URLs legales de la marca: $e');
    }
  }

  Future<void> _openLegalUrl(String? url, String docTitle) async {
    final target = (url != null && url.trim().isNotEmpty) ? url.trim() : null;
    if (target == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$docTitle no disponibles en este momento.')),
        );
      }
      return;
    }
    final uri = Uri.parse(target);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No se pudo abrir el enlace legal.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir el enlace legal.')),
        );
      }
    }
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _resetEmailController.dispose();
    super.dispose();
  }


  Future<void> _handleEmailAuth() async {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (!_isLogin) {
      if (password != _confirmPasswordController.text) {
        setState(() => _errorMessage = 'Las contraseñas no coinciden.');
        return;
      }
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_isLogin) {
        AppLogger.info('LoginScreen', 'Iniciando sesión: $email');
        await widget.sessionState.signIn(email, password);
      } else {
        AppLogger.info('LoginScreen', 'Registrando nuevo cliente: $email');
        await widget.sessionState.register(
          email: email,
          password: password,
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
        );
      }

      if (mounted) {
        widget.onLoginSuccess();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = _formatAuthError(e.toString());
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleSocialAuth(String provider) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (provider.toLowerCase().contains('google')) {
        AppLogger.info('LoginScreen', 'Iniciando autenticación OAuth federada con Google');
        await widget.sessionState.signInWithGoogleFederated();
      } else if (provider.toLowerCase().contains('facebook')) {
        AppLogger.info('LoginScreen', 'Iniciando autenticación OAuth federada con Facebook');
        await widget.sessionState.signInWithFacebookFederated();
      } else if (provider.toLowerCase().contains('apple')) {
        AppLogger.info('LoginScreen', 'Iniciando autenticación OAuth federada con Apple');
        await widget.sessionState.signInWithAppleFederated();
      } else {
        throw Exception('Proveedor de autenticación no soportado: $provider');
      }

      if (mounted) {
        widget.onLoginSuccess();
      }
    } catch (e) {
      if (mounted) {
        final errorStr = e.toString().toLowerCase();
        // Manejo explícito de cancelación del usuario o cierre de ventana
        if (errorStr.contains('cancelled') ||
            errorStr.contains('popup_closed') ||
            errorStr.contains('user-cancelled') ||
            errorStr.contains('canceled') ||
            errorStr.contains('cancel')) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Autenticación cancelada por el usuario.'),
              duration: Duration(seconds: 2),
            ),
          );
        } else {
          setState(() {
            _errorMessage = _formatAuthError(e.toString());
          });
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showForgotPasswordDialog() {
    _resetEmailController.text = _emailController.text.trim();
    _resetMessage = null;
    _resetIsError = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.lock_reset_rounded, color: BrandColors.bluePrimary),
              SizedBox(width: 8),
              Text('Recuperar Contraseña', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ingresa tu correo registrado y te enviaremos un enlace oficial para restablecer tu acceso.',
                style: TextStyle(fontSize: 13, color: BrandColors.textSecondaryLight),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _resetEmailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Correo Electrónico',
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              if (_resetMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _resetIsError ? const Color(0xFFFEE2E2) : const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _resetMessage!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _resetIsError ? const Color(0xFFDC2626) : const Color(0xFF065F46),
                    ),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cerrar', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: BrandColors.bluePrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _isSendingReset
                  ? null
                  : () async {
                      final email = _resetEmailController.text.trim();
                      if (email.isEmpty || !email.contains('@')) {
                        setDialogState(() {
                          _resetMessage = 'Por favor, ingresa un correo electrónico válido.';
                          _resetIsError = true;
                        });
                        return;
                      }

                      setDialogState(() {
                        _isSendingReset = true;
                        _resetMessage = null;
                      });

                      try {
                        await widget.sessionState.sendPasswordReset(email);
                        setDialogState(() {
                          _isSendingReset = false;
                          _resetIsError = false;
                          _resetMessage = 'Enlace enviado exitosamente. Revisa tu bandeja de entrada.';
                        });
                      } catch (e) {
                        setDialogState(() {
                          _isSendingReset = false;
                          _resetIsError = true;
                          _resetMessage = 'Error al enviar enlace. Verifica el correo e intenta nuevamente.';
                        });
                      }
                    },
              child: _isSendingReset
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Enviar Enlace', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  String _formatAuthError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('user-not-found') || lower.contains('wrong-password') || lower.contains('invalid-credential')) {
      return 'El correo o la contraseña no son correctos.';
    }
    if (lower.contains('email-already-in-use')) {
      return 'Este correo electrónico ya se encuentra registrado.';
    }
    if (lower.contains('weak-password')) {
      return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
    }
    if (lower.contains('network') || lower.contains('connection')) {
      return 'Error de conexión. Verifica tu acceso a internet.';
    }
    return raw.replaceAll('Exception: ', '').replaceAll('BlueSystemException: ', '');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE0F2FE),
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            // Fondo celeste con ondas inferiores oficiales de TuaniGo
            Positioned.fill(
              child: Image.asset(
                'assets/images/fondo_login_pantalla.png',
                fit: BoxFit.cover,
              ),
            ),

            // Cabecera artística TuaniGo
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Image.asset(
                'assets/images/fondo_login_cabecera.png',
                width: double.infinity,
                height: 230,
                fit: BoxFit.fitWidth,
                alignment: Alignment.topCenter,
              ),
            ),

            // Contenedor principal con tarjeta blanca responsiva
            Column(
              children: [
                const SizedBox(height: 206),
                Expanded(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 500),
                      child: Container(
                        width: double.infinity,
                        margin: const EdgeInsets.fromLTRB(14, 0, 14, 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 16,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // ── PESTAÑAS: INGRESAR / CREAR CUENTA ────────────
                                Row(
                                  children: [
                                    // Pestaña Ingresar
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            _isLogin = true;
                                            _errorMessage = null;
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Column(
                                          children: [
                                            Text(
                                              'Ingresar',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: _isLogin ? FontWeight.bold : FontWeight.w500,
                                                color: _isLogin ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Container(
                                              height: 3,
                                              width: 60,
                                              decoration: BoxDecoration(
                                                color: _isLogin ? const Color(0xFF2563EB) : Colors.transparent,
                                                borderRadius: BorderRadius.circular(2),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),

                                    // Divisor vertical sutil
                                    const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 4.0),
                                      child: Text('|', style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 18)),
                                    ),

                                    // Pestaña Crear Cuenta
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            _isLogin = false;
                                            _showOtherMethods = true;
                                            _errorMessage = null;
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Column(
                                          children: [
                                            Text(
                                              'Crear cuenta',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: !_isLogin ? FontWeight.bold : FontWeight.w500,
                                                color: !_isLogin ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Container(
                                              height: 3,
                                              width: 80,
                                              decoration: BoxDecoration(
                                                color: !_isLogin ? const Color(0xFF2563EB) : Colors.transparent,
                                                borderRadius: BorderRadius.circular(2),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 8),
                                const Divider(color: Color(0xFFF1F5F9), thickness: 1),
                                const SizedBox(height: 16),

                                // ── ENCABEZADOS SEGÚN LA PESTAÑA ACTIVA ──────────
                                Text(
                                  _isLogin ? '¡Bienvenido!' : '¡Crea tu cuenta!',
                                  style: const TextStyle(
                                    fontSize: 19,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _isLogin
                                      ? 'Ingresa para continuar con TuaniGo'
                                      : 'Regístrate para pedir, enviar y descubrir con TuaniGo.',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                ),
                                const SizedBox(height: 10),

                                // Banner de error amigable
                                if (_errorMessage != null) ...[
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEE2E2),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFF87171)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 16),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _errorMessage!,
                                            style: const TextStyle(color: Color(0xFFDC2626), fontSize: 11.5, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                ],

                                // ── CONTENIDO DE LA PESTAÑA INGRESAR ────────────
                                if (_isLogin) ...[
                                  // Botón Oficial: Continuar con Google
                                  OutlinedButton(
                                    onPressed: _isLoading ? null : () => _handleSocialAuth('Google'),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                                      backgroundColor: Colors.white,
                                      elevation: 1,
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 22,
                                          height: 22,
                                          decoration: const BoxDecoration(shape: BoxShape.circle),
                                          child: const Center(
                                            child: Text(
                                              'G',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w900,
                                                fontSize: 18,
                                                color: Color(0xFF4285F4),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        const Text(
                                          'Continuar con Google',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 15,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),

                                  // Botón Oficial: Continuar con Facebook
                                  ElevatedButton(
                                    onPressed: _isLoading ? null : () => _handleSocialAuth('Facebook'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF1877F2),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      elevation: 1,
                                    ),
                                    child: const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.facebook, color: Colors.white, size: 22),
                                        SizedBox(width: 10),
                                        Text(
                                          'Continuar con Facebook',
                                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),

                                  // Botón Oficial: Continuar con Apple (iOS Parity)
                                  ElevatedButton(
                                    key: const Key('apple_sign_in_button'),
                                    onPressed: _isLoading ? null : () => _handleSocialAuth('Apple'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.black,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      elevation: 1,
                                    ),
                                    child: const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.apple, color: Colors.white, size: 22),
                                        SizedBox(width: 10),
                                        Text(
                                          'Continuar con Apple',
                                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),

                                  // Separador " o "
                                  const Row(
                                    children: [
                                      Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                                      Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 12),
                                        child: Text('o', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                                      ),
                                      Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  if (!_showOtherMethods) ...[
                                    // Botón alternativo
                                    OutlinedButton(
                                      onPressed: () => setState(() => _showOtherMethods = true),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      child: const Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.phone_android_rounded, color: Color(0xFF64748B), size: 20),
                                          SizedBox(width: 10),
                                          Text(
                                            'Correo o teléfono',
                                            style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF334155), fontSize: 14),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 20),

                                    // Card Promocional Verde: "¿No tienes cuenta? Crear cuenta >"
                                    InkWell(
                                      onTap: () {
                                        setState(() {
                                          _isLogin = false;
                                          _showOtherMethods = true;
                                          _errorMessage = null;
                                        });
                                      },
                                      borderRadius: BorderRadius.circular(16),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFDCFCE7),
                                          borderRadius: BorderRadius.circular(16),
                                          border: Border.all(color: const Color(0xFF86EFAC)),
                                        ),
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 38,
                                              height: 38,
                                              decoration: const BoxDecoration(
                                                color: Color(0xFF16A34A),
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(Icons.person_add_rounded, color: Colors.white, size: 20),
                                            ),
                                            const SizedBox(width: 14),
                                            const Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    '¿No tienes cuenta?',
                                                    style: TextStyle(fontSize: 12, color: Color(0xFF15803D), fontWeight: FontWeight.w600),
                                                  ),
                                                  Text(
                                                    'Crear cuenta',
                                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF16A34A), size: 16),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ] else ...[
                                    // Formulario desplegado Correo / Contraseña
                                    TextFormField(
                                      controller: _emailController,
                                      keyboardType: TextInputType.emailAddress,
                                      decoration: InputDecoration(
                                        labelText: 'Correo o teléfono',
                                        prefixIcon: const Icon(Icons.email_outlined),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      validator: (val) {
                                        if (val == null || val.trim().isEmpty) return 'Ingresa tu correo';
                                        if (!val.contains('@') || !val.contains('.')) return 'Correo no válido';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 14),

                                    TextFormField(
                                      controller: _passwordController,
                                      obscureText: _obscurePassword,
                                      decoration: InputDecoration(
                                        labelText: 'Contraseña',
                                        prefixIcon: const Icon(Icons.lock_outline),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        suffixIcon: IconButton(
                                          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                        ),
                                      ),
                                      validator: (val) {
                                        if (val == null || val.isEmpty) return 'Ingresa tu contraseña';
                                        if (val.length < 6) return 'Mínimo 6 caracteres';
                                        return null;
                                      },
                                    ),

                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: TextButton(
                                        onPressed: _showForgotPasswordDialog,
                                        child: const Text(
                                          '¿Olvidaste tu contraseña?',
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),

                                    ElevatedButton(
                                      onPressed: _isLoading ? null : _handleEmailAuth,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF2563EB),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(vertical: 16),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        elevation: 2,
                                      ),
                                      child: _isLoading
                                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                          : const Text(
                                              'INICIAR SESIÓN',
                                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                            ),
                                    ),
                                    const SizedBox(height: 10),

                                    Center(
                                      child: TextButton(
                                        onPressed: () => setState(() => _showOtherMethods = false),
                                        child: const Text(
                                          'Ver otros métodos de acceso',
                                          style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                                        ),
                                      ),
                                    ),
                                  ],
                                ] else ...[
                                  // ── CONTENIDO DE LA PESTAÑA CREAR CUENTA ────────
                                  // 1. Nombre Completo
                                  TextFormField(
                                    controller: _nameController,
                                    decoration: InputDecoration(
                                      labelText: 'Nombre Completo',
                                      prefixIcon: const Icon(Icons.person_outline),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) return 'Ingresa tu nombre completo';
                                      if (val.trim().length < 3) return 'Mínimo 3 caracteres';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // 2. Número de Teléfono
                                  TextFormField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    decoration: InputDecoration(
                                      labelText: 'Número de Teléfono',
                                      prefixIcon: const Icon(Icons.phone_outlined),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) return 'Ingresa tu número de teléfono';
                                      if (val.trim().length < 8) return 'Mínimo 8 dígitos';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // 3. Correo Electrónico
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: InputDecoration(
                                      labelText: 'Correo Electrónico',
                                      prefixIcon: const Icon(Icons.email_outlined),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) return 'Ingresa tu correo';
                                      if (!val.contains('@') || !val.contains('.')) return 'Correo no válido';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // 4. Contraseña
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    decoration: InputDecoration(
                                      labelText: 'Contraseña (mín. 6 car.)',
                                      prefixIcon: const Icon(Icons.lock_outline),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      suffixIcon: IconButton(
                                        icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.isEmpty) return 'Ingresa tu contraseña';
                                      if (val.length < 6) return 'Mínimo 6 caracteres';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // 5. Confirmar Contraseña
                                  TextFormField(
                                    controller: _confirmPasswordController,
                                    obscureText: _obscureConfirmPassword,
                                    decoration: InputDecoration(
                                      labelText: 'Confirmar Contraseña',
                                      prefixIcon: const Icon(Icons.lock_reset_rounded),
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                      suffixIcon: IconButton(
                                        icon: Icon(_obscureConfirmPassword ? Icons.visibility_off : Icons.visibility),
                                        onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                                      ),
                                    ),
                                    validator: (val) {
                                      if (val == null || val.isEmpty) return 'Confirma tu contraseña';
                                      if (val != _passwordController.text) return 'Las contraseñas no coinciden';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // Checkbox Legal y Enlaces Independientes
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      Checkbox(
                                        value: _isTermsAccepted,
                                        activeColor: const Color(0xFF2563EB),
                                        onChanged: (val) => setState(() => _isTermsAccepted = val ?? false),
                                      ),
                                      Expanded(
                                        child: RichText(
                                          text: TextSpan(
                                            style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.3),
                                            children: [
                                              const TextSpan(text: 'Acepto los '),
                                              TextSpan(
                                                text: 'Términos y Condiciones',
                                                style: const TextStyle(
                                                  color: Color(0xFF2563EB),
                                                  fontWeight: FontWeight.w600,
                                                  decoration: TextDecoration.underline,
                                                ),
                                                recognizer: _termsRecognizer,
                                              ),
                                              const TextSpan(text: ' y las '),
                                              TextSpan(
                                                text: 'Políticas de Privacidad',
                                                style: const TextStyle(
                                                  color: Color(0xFF2563EB),
                                                  fontWeight: FontWeight.w600,
                                                  decoration: TextDecoration.underline,
                                                ),
                                                recognizer: _privacyRecognizer,
                                              ),
                                              const TextSpan(text: ' de TuaniGo.'),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 20),

                                  // Botón Principal: Crear cuenta →
                                  ElevatedButton(
                                    onPressed: _isLoading ? null : _handleEmailAuth,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF2563EB),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      elevation: 2,
                                    ),
                                    child: _isLoading
                                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                        : const Text(
                                            'Crear cuenta →',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                          ),
                                  ),
                                  const SizedBox(height: 12),

                                  Center(
                                    child: TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _isLogin = true;
                                          _errorMessage = null;
                                        });
                                      },
                                      child: const Text(
                                        '¿Ya tienes cuenta? Inicia sesión',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 14),
                                      ),
                                    ),
                                  ),
                                ],

                                const SizedBox(height: 16),

                                // Modo Invitado (Guest Exploration)
                                OutlinedButton.icon(
                                  onPressed: _isLoading
                                      ? null
                                      : () {
                                          widget.sessionState.continueAsGuest();
                                          widget.onLoginSuccess();
                                        },
                                  icon: const Icon(Icons.storefront_outlined, size: 18, color: Color(0xFF64748B)),
                                  label: const Text(
                                    'Explorar como invitado',
                                    style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: Color(0xFF64748B)),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
