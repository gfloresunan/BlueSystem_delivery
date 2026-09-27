/// BLUE SYSTEM DELIVERY ENTERPRISE — ADDRESS MANAGER SCREEN (1:1 ANDROID PARITY)
/// Reconstructs AddressManagerScreen.kt from Android reference.
/// Full-screen address management with subcollection /users/{uid}/addresses,
/// label tags (Casa, Trabajo, Oficina, Otro), default toggle, GPS coords, and delivery instructions.

import 'package:flutter/material.dart';

import '../../theme/brand_theme_builder.dart';
import '../../../domain/entities/saved_address_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';

class AddressManagerScreen extends StatefulWidget {
  final String userId;
  final IUserService userService;
  final VoidCallback onBack;

  const AddressManagerScreen({
    super.key,
    required this.userId,
    required this.userService,
    required this.onBack,
  });

  @override
  State<AddressManagerScreen> createState() => _AddressManagerScreenState();
}

class _AddressManagerScreenState extends State<AddressManagerScreen> {
  // Pre-defined label categories matching Android AddressManagerScreen.kt
  static const List<String> _labelCategories = ['Casa', 'Trabajo', 'Oficina', 'Otro'];

  IconData _getLabelIcon(String label) {
    switch (label.toLowerCase().trim()) {
      case 'casa':
        return Icons.home_rounded;
      case 'trabajo':
        return Icons.work_rounded;
      case 'oficina':
        return Icons.business_rounded;
      default:
        return Icons.location_on_rounded;
    }
  }

  Color _getLabelColor(String label) {
    switch (label.toLowerCase().trim()) {
      case 'casa':
        return const Color(0xFF2563EB); // Blue
      case 'trabajo':
        return const Color(0xFFD97706); // Amber
      case 'oficina':
        return const Color(0xFF7C3AED); // Purple
      default:
        return const Color(0xFF059669); // Green
    }
  }

  void _openAddressDialog({SavedAddressEntity? addressToEdit}) {
    final isEditing = addressToEdit != null;
    String selectedLabel = addressToEdit?.label ?? 'Casa';
    final addressController = TextEditingController(text: addressToEdit?.fullAddress ?? '');
    final instructionsController = TextEditingController(text: addressToEdit?.instructions ?? '');
    final latController = TextEditingController(
      text: addressToEdit != null && addressToEdit.latitude != 0.0
          ? addressToEdit.latitude.toString()
          : '12.136389',
    );
    final lngController = TextEditingController(
      text: addressToEdit != null && addressToEdit.longitude != 0.0
          ? addressToEdit.longitude.toString()
          : '-86.251389',
    );
    bool isDefault = addressToEdit?.isDefault ?? false;
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            key: const Key('address_editor_dialog'),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Icon(
                  isEditing ? Icons.edit_location_alt : Icons.add_location_alt,
                  color: BrandColors.bluePrimary,
                ),
                const SizedBox(width: 8),
                Text(
                  isEditing ? 'Editar Dirección' : 'Nueva Dirección',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Label Category Chips
                  const Text(
                    'Etiqueta',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: _labelCategories.map((lbl) {
                      final isSelected = selectedLabel == lbl;
                      return ChoiceChip(
                        key: Key('chip_label_$lbl'),
                        avatar: Icon(
                          _getLabelIcon(lbl),
                          size: 14,
                          color: isSelected ? Colors.white : _getLabelColor(lbl),
                        ),
                        label: Text(lbl, style: const TextStyle(fontSize: 12)),
                        selected: isSelected,
                        selectedColor: BrandColors.bluePrimary,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : const Color(0xFF334155),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        onSelected: (val) {
                          if (val) setDialogState(() => selectedLabel = lbl);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),

                  // Full Address Text Field
                  const Text(
                    'Dirección completa *',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    key: const Key('address_full_field'),
                    controller: addressController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'Ej. Calle principal, Casa #123, Frente al parque',
                      hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: BrandColors.bluePrimary, width: 1.5),
                      ),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 12),

                  // Delivery Instructions
                  const Text(
                    'Punto de referencia / Instrucciones',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 4),
                  TextField(
                    key: const Key('address_instructions_field'),
                    controller: instructionsController,
                    decoration: InputDecoration(
                      hintText: 'Ej. Portón negro, tocar timbre blanco',
                      hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                  const SizedBox(height: 12),

                  // GPS Coordinates Inputs
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Latitud GPS',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              key: const Key('address_lat_field'),
                              controller: latController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Longitud GPS',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              key: const Key('address_lng_field'),
                              controller: lngController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Default Switch Toggle
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Dirección predeterminada',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              'Usar automáticamente en pedidos',
                              style: TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        key: const Key('address_default_switch'),
                        value: isDefault,
                        activeColor: BrandColors.bluePrimary,
                        onChanged: (val) => setDialogState(() => isDefault = val),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSaving ? null : () => Navigator.pop(dialogCtx),
                child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
              ),
              ElevatedButton(
                key: const Key('address_save_confirm_button'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: BrandColors.bluePrimary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: isSaving
                    ? null
                    : () async {
                        final addressText = addressController.text.trim();
                        if (addressText.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Por favor ingresa la dirección'),
                              backgroundColor: Colors.red,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          return;
                        }

                        final parsedLat = double.tryParse(latController.text.trim()) ?? 12.136389;
                        final parsedLng = double.tryParse(lngController.text.trim()) ?? -86.251389;

                        setDialogState(() => isSaving = true);

                        try {
                          final newAddress = SavedAddressEntity(
                            id: addressToEdit?.id ?? '',
                            userId: widget.userId,
                            label: selectedLabel,
                            fullAddress: addressText,
                            instructions: instructionsController.text.trim(),
                            isDefault: isDefault,
                            latitude: parsedLat,
                            longitude: parsedLng,
                            createdAt: addressToEdit?.createdAt ?? DateTime.now().millisecondsSinceEpoch,
                            updatedAt: DateTime.now().millisecondsSinceEpoch,
                          );

                          await widget.userService.saveAddress(widget.userId, newAddress);

                          final messenger = ScaffoldMessenger.of(context);
                          Navigator.pop(dialogCtx);
                          if (mounted) {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  isEditing
                                      ? '¡Dirección actualizada correctamente! 📍'
                                      : '¡Nueva dirección guardada! 📍',
                                ),
                                backgroundColor: BrandColors.statusSuccess,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        } catch (e) {
                          setDialogState(() => isSaving = false);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Error al guardar: $e'),
                                backgroundColor: Colors.red,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          }
                        }
                      },
                child: isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(isEditing ? 'Actualizar' : 'Guardar'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDeleteAddress(SavedAddressEntity address) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.red),
            SizedBox(width: 8),
            Text('Eliminar Dirección', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Text('¿Seguro que deseas eliminar la dirección "${address.label} - ${address.fullAddress}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            key: const Key('confirm_delete_address_button'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              Navigator.pop(dialogCtx);
              try {
                await widget.userService.deleteAddress(widget.userId, address.id);
                if (mounted) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Dirección eliminada correctamente'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text('Error al eliminar: $e'),
                      backgroundColor: Colors.red,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
            },
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D47A1), // Corporate Blue (1:1 Android)
        foregroundColor: Colors.white,
        elevation: 2,
        leading: IconButton(
          key: const Key('address_manager_back_button'),
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mis Direcciones',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.white),
            ),
            Text(
              'Gestiona tus lugares de entrega',
              style: TextStyle(fontSize: 11, color: Color(0xFFBFDBFE)),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              key: const Key('add_new_address_appbar_btn'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF0D47A1),
                elevation: 0,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Nueva', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              onPressed: () => _openAddressDialog(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('address_manager_fab'),
        backgroundColor: BrandColors.bluePrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Agregar Dirección', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _openAddressDialog(),
      ),
      body: StreamBuilder<List<SavedAddressEntity>>(
        stream: widget.userService.watchAddresses(widget.userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final addresses = snapshot.data ?? [];

          if (addresses.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEFF6FF),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.location_off_rounded, size: 40, color: Color(0xFF3B82F6)),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'No tienes direcciones guardadas',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Guarda tu casa, oficina o lugares frecuentes para pedir comida y productos en un solo tap.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: BrandColors.bluePrimary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.add_location_alt),
                      label: const Text('Agregar Primera Dirección'),
                      onPressed: () => _openAddressDialog(),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            itemCount: addresses.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final addr = addresses[index];
              final labelColor = _getLabelColor(addr.label);
              final labelIcon = _getLabelIcon(addr.label);

              return Card(
                key: Key('address_card_${addr.id}'),
                elevation: addr.isDefault ? 2 : 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: addr.isDefault ? BrandColors.bluePrimary : const Color(0xFFE2E8F0),
                    width: addr.isDefault ? 1.5 : 1,
                  ),
                ),
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row: Label, Icon, Default badge, and Menu
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: labelColor.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(labelIcon, color: labelColor, size: 20),
                                ),
                                const SizedBox(width: 10),
                                Flexible(
                                  child: Text(
                                    addr.label,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
                                  ),
                                ),
                                if (addr.isDefault) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    key: Key('default_badge_${addr.id}'),
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCFCE7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'Predeterminada',
                                      style: TextStyle(
                                        color: Color(0xFF15803D),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          PopupMenuButton<String>(
                            key: Key('address_menu_${addr.id}'),
                            icon: const Icon(Icons.more_vert, color: Colors.grey),
                            onSelected: (val) {
                              if (val == 'default') {
                                widget.userService.setDefaultAddress(widget.userId, addr.id);
                              } else if (val == 'edit') {
                                _openAddressDialog(addressToEdit: addr);
                              } else if (val == 'delete') {
                                _confirmDeleteAddress(addr);
                              }
                            },
                            itemBuilder: (context) => [
                              if (!addr.isDefault)
                                const PopupMenuItem(
                                  value: 'default',
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.check_circle_outline, size: 18, color: Colors.green),
                                      SizedBox(width: 8),
                                      Flexible(child: Text('Marcar como principal', overflow: TextOverflow.ellipsis)),
                                    ],
                                  ),
                                ),
                              const PopupMenuItem(
                                value: 'edit',
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.edit_outlined, size: 18, color: Colors.blue),
                                    SizedBox(width: 8),
                                    Flexible(child: Text('Editar', overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ),
                              const PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                    SizedBox(width: 8),
                                    Flexible(child: Text('Eliminar', style: TextStyle(color: Colors.red), overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Address text
                      Text(
                        addr.fullAddress,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B), height: 1.3),
                      ),

                      // Instructions (if present)
                      if (addr.instructions.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.info_outline, size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                addr.instructions,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontStyle: FontStyle.italic),
                              ),
                            ),
                          ],
                        ),
                      ],

                      // Coordinates preview
                      if (addr.latitude != 0.0 && addr.longitude != 0.0) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.pin_drop_outlined, size: 13, color: Color(0xFF94A3B8)),
                            const SizedBox(width: 4),
                            Text(
                              '${addr.latitude.toStringAsFixed(4)}, ${addr.longitude.toStringAsFixed(4)}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
