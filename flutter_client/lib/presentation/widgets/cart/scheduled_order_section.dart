/// BLUE SYSTEM DELIVERY ENTERPRISE — SCHEDULED ORDER SECTION (WIDGET)
/// 1:1 Parity with Android ScheduledOrderSection.kt (Protocol BSD-SCHEDULED-COMMERCE-PHASE-3-CUSTOMER-FLOW-001).

import 'package:flutter/material.dart';
import '../../../core/design_system/colors/bs_colors.dart';
import '../../../core/engine/scheduled_commerce_engine.dart';
import '../../../domain/entities/catalog_entity.dart';
import '../../../domain/entities/scheduled_order_entity.dart';
import '../../providers/cart_provider.dart';

class ScheduledOrderSection extends StatefulWidget {
  final BusinessEntity business;
  final CartProvider cart;

  const ScheduledOrderSection({
    super.key,
    required this.business,
    required this.cart,
  });

  @override
  State<ScheduledOrderSection> createState() => _ScheduledOrderSectionState();
}

class _ScheduledOrderSectionState extends State<ScheduledOrderSection> {
  final TextEditingController _recipientNameController = TextEditingController();
  final TextEditingController _recipientPhoneController = TextEditingController();
  final TextEditingController _recipientNotesController = TextEditingController();

  final TextEditingController _giftSenderController = TextEditingController();
  final TextEditingController _giftMessageController = TextEditingController();

  bool _showRecipientForm = false;
  bool _showGiftForm = false;
  bool _isAnonymous = false;
  String _selectedCardId = ScheduledCommerceEngine.defaultCardTemplates.first.id;

  String _specialHandlingType = 'STANDARD';
  bool _fragile = false;
  bool _keepUpright = false;
  bool _tempSensitive = false;

  @override
  void initState() {
    super.initState();
    final cart = widget.cart;
    if (cart.recipientInfo != null) {
      _showRecipientForm = cart.recipientInfo!.isThirdParty;
      _recipientNameController.text = cart.recipientInfo!.name;
      _recipientPhoneController.text = cart.recipientInfo!.phone;
      _recipientNotesController.text = cart.recipientInfo!.deliveryInstructions;
    }
    if (cart.giftDetails != null) {
      _showGiftForm = cart.giftDetails!.isGift;
      _giftSenderController.text = cart.giftDetails!.senderName;
      _isAnonymous = cart.giftDetails!.isAnonymous;
      _giftMessageController.text = cart.giftDetails!.message;
      if (cart.giftDetails!.cardTemplateId.isNotEmpty) {
        _selectedCardId = cart.giftDetails!.cardTemplateId;
      }
    }
    if (cart.specialHandling != null) {
      _specialHandlingType = cart.specialHandling!.type;
      _fragile = cart.specialHandling!.fragile;
      _keepUpright = cart.specialHandling!.keepUpright;
      _tempSensitive = cart.specialHandling!.temperatureSensitive;
    }
  }

  @override
  void dispose() {
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _recipientNotesController.dispose();
    _giftSenderController.dispose();
    _giftMessageController.dispose();
    super.dispose();
  }

  void _syncRecipient() {
    final cart = widget.cart;
    if (!_showRecipientForm) {
      cart.setRecipientInfo(null);
    } else {
      cart.setRecipientInfo(
        RecipientInfoEntity(
          isThirdParty: true,
          name: _recipientNameController.text.trim(),
          phone: _recipientPhoneController.text.trim(),
          deliveryInstructions: _recipientNotesController.text.trim(),
        ),
      );
    }
  }

  void _syncGift() {
    final cart = widget.cart;
    if (!_showGiftForm) {
      cart.setGiftDetails(null);
    } else {
      cart.setGiftDetails(
        GiftDetailsEntity(
          isGift: true,
          senderName: _giftSenderController.text.trim(),
          isAnonymous: _isAnonymous,
          message: _giftMessageController.text.trim(),
          cardTemplateId: _selectedCardId,
        ),
      );
    }
  }

  void _syncSpecialHandling() {
    final cart = widget.cart;
    if (!_fragile && !_keepUpright && !_tempSensitive && _specialHandlingType == 'STANDARD') {
      cart.setSpecialHandling(null);
    } else {
      cart.setSpecialHandling(
        SpecialHandlingEntity(
          type: _specialHandlingType,
          fragile: _fragile,
          keepUpright: _keepUpright,
          temperatureSensitive: _tempSensitive,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.cart,
      builder: (context, _) {
        final cart = widget.cart;
        final availableDays = ScheduledCommerceEngine.getAvailableDays(business: widget.business);
        final selectedDay = cart.selectedScheduledDay ?? (availableDays.isNotEmpty ? availableDays.first : null);
        final availableSlots = selectedDay != null
            ? ScheduledCommerceEngine.getAvailableSlots(
                business: widget.business,
                selectedDate: selectedDay.date,
              )
            : <ScheduledSlot>[];

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Material(
            color: BSColors.surfaceDark,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: BSColors.outlineVariantDark),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              // 1. Selector de Modo: Inmediato vs Programado
              Row(
                children: [
                  Expanded(
                    child: _buildModeTab(
                      label: '⚡ Lo antes posible',
                      isSelected: !cart.isScheduled,
                      onTap: () => cart.setDeliveryMode(scheduled: false),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildModeTab(
                      label: '🗓️ Programar Entrega',
                      isSelected: cart.isScheduled,
                      onTap: () {
                        cart.setDeliveryMode(scheduled: true);
                        if (cart.selectedScheduledDay == null && availableDays.isNotEmpty) {
                          cart.setScheduledDay(availableDays.first);
                        }
                      },
                    ),
                  ),
                ],
              ),

              if (cart.isScheduled) ...[
                const SizedBox(height: 16),
                const Text(
                  'Selecciona el día de entrega:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                const SizedBox(height: 8),
                // 2. Carrusel Horizontal de Días
                SizedBox(
                  height: 64,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: availableDays.length,
                    itemBuilder: (context, index) {
                      final day = availableDays[index];
                      final isSelected = selectedDay?.dateStr == day.dateStr;
                      return GestureDetector(
                        onTap: day.isAvailable
                            ? () {
                                cart.setScheduledDay(day);
                              }
                            : null,
                        child: Container(
                          width: 60,
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? BSColors.primary
                                : (day.isAvailable ? BSColors.surfaceContainerDark : Colors.black26),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? BSColors.primary
                                  : (day.isAvailable ? BSColors.outlineVariantDark : Colors.transparent),
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                day.dayOfWeekLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected
                                      ? Colors.white
                                      : (day.isAvailable ? Colors.white70 : Colors.white24),
                                ),
                              ),
                              Text(
                                day.dayNumberLabel,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: isSelected
                                      ? Colors.white
                                      : (day.isAvailable ? Colors.white : Colors.white24),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 16),
                const Text(
                  'Horarios disponibles:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                ),
                const SizedBox(height: 8),
                // 3. Grid / Lista de Slots
                if (availableSlots.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.amber, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'No hay ventanas de entrega disponibles para la fecha seleccionada.',
                            style: TextStyle(fontSize: 12, color: Colors.amber),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: availableSlots.map((slot) {
                      final isSelected = cart.selectedScheduledSlot?.slotKey == slot.slotKey;
                      return FilterChip(
                        selected: isSelected,
                        onSelected: slot.isAvailable
                            ? (_) {
                                cart.setScheduledSlot(slot);
                              }
                            : null,
                        label: Text(
                          slot.label,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: slot.isAvailable
                                ? (isSelected ? Colors.white : Colors.white70)
                                : Colors.white24,
                          ),
                        ),
                        backgroundColor: BSColors.surfaceContainerDark,
                        selectedColor: BSColors.primary,
                        checkmarkColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(
                            color: isSelected ? BSColors.primary : BSColors.outlineVariantDark,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
              ],

              const Divider(color: BSColors.outlineVariantDark, height: 28),

              // 4. Enviar a otra persona / Destinatario
              Material(
                type: MaterialType.transparency,
                child: SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    '🎁 ¿Es un pedido para otra persona o regalo?',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                  value: _showRecipientForm,
                  onChanged: (val) {
                    setState(() {
                      _showRecipientForm = val;
                    });
                    _syncRecipient();
                  },
                  activeColor: BSColors.primary,
                ),
              ),

              if (_showRecipientForm) ...[
                const SizedBox(height: 8),
                TextField(
                  controller: _recipientNameController,
                  decoration: const InputDecoration(
                    labelText: 'Nombre de quien recibe',
                    hintText: 'Ej: María López',
                    isDense: true,
                    filled: true,
                    fillColor: BSColors.surfaceContainerDark,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => _syncRecipient(),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _recipientPhoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Teléfono de quien recibe',
                    hintText: 'Ej: 8888 1234',
                    isDense: true,
                    filled: true,
                    fillColor: BSColors.surfaceContainerDark,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => _syncRecipient(),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _recipientNotesController,
                  decoration: const InputDecoration(
                    labelText: 'Instrucciones para la entrega',
                    hintText: 'Ej: Tocar timbre verde, dejar en recepción...',
                    isDense: true,
                    filled: true,
                    fillColor: BSColors.surfaceContainerDark,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => _syncRecipient(),
                ),

                const SizedBox(height: 12),
                // Toggle Tarjeta de Regalo
                Material(
                  type: MaterialType.transparency,
                  child: CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text(
                      'Incluir tarjeta de dedicatoria de regalo 💌',
                      style: TextStyle(fontSize: 13, color: Colors.white),
                    ),
                    value: _showGiftForm,
                    onChanged: (val) {
                      setState(() {
                        _showGiftForm = val ?? false;
                      });
                      _syncGift();
                    },
                    activeColor: BSColors.primary,
                  ),
                ),

                if (_showGiftForm) ...[
                  const SizedBox(height: 8),
                  // Selector de Plantilla de Dedicatoria
                  SizedBox(
                    height: 54,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: ScheduledCommerceEngine.defaultCardTemplates.length,
                      itemBuilder: (context, idx) {
                        final tmpl = ScheduledCommerceEngine.defaultCardTemplates[idx];
                        final isSel = _selectedCardId == tmpl.id;
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedCardId = tmpl.id;
                            });
                            _syncGift();
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSel ? BSColors.primary.withValues(alpha: 0.2) : BSColors.surfaceContainerDark,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSel ? BSColors.primary : BSColors.outlineVariantDark,
                                width: isSel ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Text(tmpl.iconEmoji, style: const TextStyle(fontSize: 18)),
                                const SizedBox(width: 6),
                                Text(
                                  tmpl.name,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _giftMessageController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Mensaje de la dedicatoria',
                      hintText: '¡Feliz día! Te deseamos lo mejor con mucho cariño...',
                      isDense: true,
                      filled: true,
                      fillColor: BSColors.surfaceContainerDark,
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => _syncGift(),
                  ),
                  Material(
                    type: MaterialType.transparency,
                    child: CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Enviar como regalo anónimo 🕶️',
                        style: TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                      value: _isAnonymous,
                      onChanged: (val) {
                        setState(() {
                          _isAnonymous = val ?? false;
                        });
                        _syncGift();
                      },
                      activeColor: BSColors.primary,
                    ),
                  ),
                ],
              ],

              const Divider(color: BSColors.outlineVariantDark, height: 28),

              // 5. Manejo Especial
              const Text(
                'Manejo especial:',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilterChip(
                    selected: _fragile,
                    onSelected: (val) {
                      setState(() {
                        _fragile = val;
                      });
                      _syncSpecialHandling();
                    },
                    label: const Text('📦 Frágil'),
                    backgroundColor: BSColors.surfaceContainerDark,
                    selectedColor: BSColors.primary,
                    checkmarkColor: Colors.white,
                  ),
                  FilterChip(
                    selected: _keepUpright,
                    onSelected: (val) {
                      setState(() {
                        _keepUpright = val;
                      });
                      _syncSpecialHandling();
                    },
                    label: const Text('⬆️ Mantener vertical'),
                    backgroundColor: BSColors.surfaceContainerDark,
                    selectedColor: BSColors.primary,
                    checkmarkColor: Colors.white,
                  ),
                  FilterChip(
                    selected: _tempSensitive,
                    onSelected: (val) {
                      setState(() {
                        _tempSensitive = val;
                      });
                      _syncSpecialHandling();
                    },
                    label: const Text('❄️ Sensible a temperatura'),
                    backgroundColor: BSColors.surfaceContainerDark,
                    selectedColor: BSColors.primary,
                    checkmarkColor: Colors.white,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  },
);
  }

  Widget _buildModeTab({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? BSColors.primary : BSColors.surfaceContainerDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? BSColors.primary : BSColors.outlineVariantDark,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : Colors.white70,
            ),
          ),
        ),
      ),
    );
  }
}
