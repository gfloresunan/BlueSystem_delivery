/// BLUE SYSTEM DELIVERY ENTERPRISE — GATEKEEPER UI GUARD
/// Conditionally renders child widget or fallback based on subscription entitlement.

import 'package:flutter/material.dart';
import '../../core/gatekeeper/gatekeeper.dart';

class GatekeeperGuard extends StatelessWidget {
  final GatekeeperContext context;
  final String moduleKey;
  final Widget child;
  final Widget? fallback;

  const GatekeeperGuard({
    super.key,
    required this.context,
    required this.moduleKey,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    final decision = GatekeeperEngine.canAccessModule(
      context: this.context,
      moduleKey: moduleKey,
    );

    if (decision.allowed) {
      return child;
    }

    return fallback ??
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.amber.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.withOpacity(0.4)),
          ),
          child: Row(
            children: [
              const Icon(Icons.lock_outline, color: Colors.amber),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Módulo no disponible en su plan de suscripción actual ($moduleKey).',
                  style: const TextStyle(color: Colors.amber, fontSize: 13),
                ),
              ),
            ],
          ),
        );
  }
}
