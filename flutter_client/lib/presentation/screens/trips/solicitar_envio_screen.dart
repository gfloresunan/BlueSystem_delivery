/// BLUE SYSTEM DELIVERY ENTERPRISE — SOLICITAR ENVÍO SCREEN (1:1 ANDROID PARITY)
/// Implements Point-to-Point X→Y Express Delivery matching Android SolicitarEnvioScreen.kt.
/// Conforms strictly to ADR-026 Frozen Core (C$35.00 base + C$10.00/km).

import 'package:flutter/material.dart';

import '../../../core/engine/x_to_y_pricing_engine.dart';
import '../../../core/utils/geo_utils.dart';
import '../../../domain/entities/saved_address_entity.dart';
import '../../../domain/entities/user_profile_entity.dart';
import '../../../domain/services/core_service_interfaces.dart';
import '../../theme/brand_theme_builder.dart';

class SolicitarEnvioScreen extends StatefulWidget {
  final ITripService tripService;
  final IUserService userService;
  final UserProfileEntity currentUser;
  final String tenantId;
  final VoidCallback onBack;
  final ValueChanged<String>? onTripCreated;

  const SolicitarEnvioScreen({
    super.key,
    required this.tripService,
    required this.userService,
    required this.currentUser,
    this.tenantId = 'default',
    required this.onBack,
    this.onTripCreated,
  });

  @override
  State<SolicitarEnvioScreen> createState() => _SolicitarEnvioScreenState();
}

class _SolicitarEnvioScreenState extends State<SolicitarEnvioScreen> {
  // Origin (X) Controllers & Coordinates
  final TextEditingController _originAddressController = TextEditingController();
  double _originLat = 12.1364; // Default Managua Metrocentro
  double _originLng = -86.2514;
  bool _originResolved = false;

  // Destination (Y) Controllers & Coordinates
  final TextEditingController _destAddressController = TextEditingController();
  double _destLat = 12.1150; // Default Managua Invercasa
  double _destLng = -86.2710;
  bool _destResolved = false;

  // Package & Contact Details
  String _packageType = 'Paquete pequeño';
  final TextEditingController _packageDescController = TextEditingController();
  late TextEditingController _senderNameController;
  late TextEditingController _senderPhoneController;
  final TextEditingController _recipientNameController = TextEditingController();
  final TextEditingController _recipientPhoneController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  String _deliveryType = 'PUERTA'; // 'PUERTA' or 'INMUEBLE'

  // Payment & Payer Details
  String _paymentMethod = 'efectivo'; // 'efectivo' or 'transferencia'
  String _payer = 'SENDER'; // 'SENDER' or 'RECIPIENT'
  final TextEditingController _cashChangeController = TextEditingController();

  // Custom Offer (ADR-026 allows counter-offers >= C$35)
  double? _customOffer;

  // UI State
  bool _isSubmitting = false;

  final List<String> _packageTypes = [
    'Documento',
    'Paquete pequeño',
    'Paquete mediano',
    'Comida / Frágil',
  ];

  @override
  void initState() {
    super.initState();
    _senderNameController = TextEditingController(text: widget.currentUser.displayName);
    _senderPhoneController = TextEditingController(text: widget.currentUser.phoneNumber ?? '');

    // Default starting point if not set
    _originAddressController.text = 'Managua, Punto de recogida';
    _originResolved = true;
  }

  @override
  void dispose() {
    _originAddressController.dispose();
    _destAddressController.dispose();
    _packageDescController.dispose();
    _senderNameController.dispose();
    _senderPhoneController.dispose();
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _notesController.dispose();
    _cashChangeController.dispose();
    super.dispose();
  }

  /// Haversine distance between Origin X and Destination Y
  double get _calculatedDistanceKm {
    if (!_originResolved || !_destResolved) return 0.0;
    final dist = GeoUtils.calculateDistance(_originLat, _originLng, _destLat, _destLng);
    return double.parse(dist.toStringAsFixed(2));
  }

  /// Official ADR-026 calculated fee: C$ 35.00 + (km * C$ 10.00)
  double get _calculatedFee {
    final dist = _calculatedDistanceKm;
    return XToYPricingEngine.calculateFee(dist);
  }

  /// Effective final fee to charge
  double get _finalTotalFee {
    return _customOffer ?? _calculatedFee;
  }

  void _applySavedAddress(SavedAddressEntity addr, bool isOrigin) {
    setState(() {
      if (isOrigin) {
        _originAddressController.text = addr.fullAddress;
        if (addr.latitude != 0.0 && addr.longitude != 0.0) {
          _originLat = addr.latitude;
          _originLng = addr.longitude;
        }
        _originResolved = true;
      } else {
        _destAddressController.text = addr.fullAddress;
        if (addr.latitude != 0.0 && addr.longitude != 0.0) {
          _destLat = addr.latitude;
          _destLng = addr.longitude;
        }
        _destResolved = true;
      }
    });
  }

  void _openMapPickerDialog(bool isOrigin) {
    double tempLat = isOrigin ? _originLat : _destLat;
    double tempLng = isOrigin ? _originLng : _destLng;
    final addressText = isOrigin ? _originAddressController.text : _destAddressController.text;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return AlertDialog(
              key: const Key('map_picker_dialog'),
              title: Row(
                children: [
                  Icon(
                    isOrigin ? Icons.my_location : Icons.location_on,
                    color: isOrigin ? BrandColors.bluePrimary : Colors.red,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isOrigin ? 'Seleccionar Punto X (Origen)' : 'Seleccionar Punto Y (Destino)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              content: SizedBox(
                width: double.maxFinite,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.pin_drop,
                                size: 48,
                                color: isOrigin ? BrandColors.bluePrimary : Colors.red,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                isOrigin ? 'PUNTO DE RECOGIDA (X)' : 'PUNTO DE ENTREGA (Y)',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${tempLat.toStringAsFixed(4)}, ${tempLng.toStringAsFixed(4)}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                          Positioned(
                            bottom: 8,
                            right: 8,
                            child: ElevatedButton.icon(
                              key: const Key('map_picker_gps_sync_btn'),
                              onPressed: () {
                                setDialogState(() {
                                  // Simulates precise device GPS acquisition
                                  tempLat = isOrigin ? 12.1364 : 12.1150;
                                  tempLng = isOrigin ? -86.2514 : -86.2710;
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: BrandColors.bluePrimary,
                                elevation: 2,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              ),
                              icon: const Icon(Icons.gps_fixed, size: 14),
                              label: const Text('Centrar GPS', style: TextStyle(fontSize: 11)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Dirección de referencia: ${addressText.isNotEmpty ? addressText : "Ubicación seleccionada"}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  key: const Key('map_picker_confirm_button'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: BrandColors.bluePrimary,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    setState(() {
                      if (isOrigin) {
                        _originLat = tempLat;
                        _originLng = tempLng;
                        _originResolved = true;
                      } else {
                        _destLat = tempLat;
                        _destLng = tempLng;
                        _destResolved = true;
                      }
                    });
                    Navigator.pop(dialogCtx);
                  },
                  child: const Text('Confirmar Punto'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _openOfferDialog() {
    final offerController = TextEditingController(text: _calculatedFee.toStringAsFixed(0));
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          key: const Key('custom_offer_dialog'),
          title: const Text('Proponer Tarifa de Envío', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Tarifa oficial calculada (ADR-026): C\$ ${_calculatedFee.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Nota: La tarifa mínima garantizada no puede ser menor a la base oficial de C\$ 35.00.',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('custom_offer_amount_field'),
                controller: offerController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Monto de tu oferta (C\$)',
                  prefixText: 'C\$ ',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                setState(() => _customOffer = null);
                Navigator.pop(ctx);
              },
              child: const Text('Restablecer'),
            ),
            ElevatedButton(
              key: const Key('custom_offer_confirm_button'),
              style: ElevatedButton.styleFrom(
                backgroundColor: BrandColors.bluePrimary,
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                final proposed = double.tryParse(offerController.text.trim());
                if (proposed == null || !XToYPricingEngine.isValidOffer(proposed, _calculatedFee)) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('La oferta debe ser de al menos C\$ 35.00 (Tarifa base oficial ADR-026).'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }
                setState(() => _customOffer = proposed);
                Navigator.pop(ctx);
              },
              child: const Text('Aplicar Oferta'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submitTripRequest() async {
    final originText = _originAddressController.text.trim();
    final destText = _destAddressController.text.trim();
    final recipientName = _recipientNameController.text.trim();
    final recipientPhone = _recipientPhoneController.text.trim();

    if (originText.isEmpty || !_originResolved) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor confirma el punto de origen (X).'), backgroundColor: Colors.red),
      );
      return;
    }

    if (destText.isEmpty || !_destResolved) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor confirma el punto de destino (Y).'), backgroundColor: Colors.red),
      );
      return;
    }

    if (recipientPhone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingresa el teléfono de la persona que recibe.'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final distanceKm = _calculatedDistanceKm;
      final calculatedFee = _calculatedFee;
      final totalFare = _finalTotalFee;

      final pricingSnapshot = XToYPricingEngine.buildPricingSnapshot(
        distanceKm: distanceKm,
        calculatedAmount: calculatedFee,
        customOffer: _customOffer,
      );

      final payload = <String, dynamic>{
        'serviceType': 'X_TO_Y_DELIVERY',
        'customerId': widget.currentUser.uid,
        'tenantId': widget.tenantId,
        'status': _paymentMethod == 'efectivo' ? 'PENDING' : 'PAYMENT_VERIFYING',
        'origin': {
          'address': originText,
          'latitude': _originLat,
          'longitude': _originLng,
          'contactName': _senderNameController.text.trim(),
          'contactPhone': _senderPhoneController.text.trim(),
        },
        'destination': {
          'address': destText,
          'latitude': _destLat,
          'longitude': _destLng,
          'contactName': recipientName,
          'contactPhone': recipientPhone,
        },
        'distanceKm': distanceKm,
        'basePrice': XToYPricingEngine.baseFee,
        'distancePrice': double.parse((distanceKm * XToYPricingEngine.pricePerKm).toStringAsFixed(2)),
        'totalPrice': totalFare,
        'calculatedFee': calculatedFee,
        'customerOffer': _customOffer ?? totalFare,
        'deliveryFee': totalFare,
        'pricingSnapshot': pricingSnapshot,
        'packageDescription': _packageDescController.text.trim(),
        'packageType': _packageType,
        'deliveryType': _deliveryType,
        'notes': _notesController.text.trim(),
        'payer': _payer,
        'paymentMethod': _paymentMethod,
        'paymentStatus': _paymentMethod == 'efectivo' ? 'pending' : 'pending_verification',
        'amountPaid': double.tryParse(_cashChangeController.text.trim()) ?? totalFare,
        'senderName': _senderNameController.text.trim(),
        'senderPhone': _senderPhoneController.text.trim(),
        'recipientName': recipientName,
        'recipientPhone': recipientPhone,
        'dispatchStage': 'SEARCHING_5KM',
        'dispatchRadiusKm': 5.0,
      };

      final tripId = await widget.tripService.createTrip(payload);

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (widget.onTripCreated != null) {
          widget.onTripCreated!(tripId);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('¡Solicitud de envío creada exitosamente! ID: $tripId'),
              backgroundColor: const Color(0xFF15803D),
            ),
          );
          widget.onBack();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al crear solicitud: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          key: const Key('solicitar_envio_back_btn'),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: widget.onBack,
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Solicitar Envío Express',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            Text(
              'Punto a Punto X→Y (ADR-026 Oficial)',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── 1. ROUTE CARD (X ORIGIN & Y DESTINATION) ──────────────────────
            _buildRouteCard(),
            const SizedBox(height: 16),

            // ─── 2. PRICING & QUOTATION CARD (ADR-026 CANON) ───────────────────
            _buildQuotationCard(),
            const SizedBox(height: 16),

            // ─── 3. PACKAGE & RECIPIENT CARD ──────────────────────────────────
            _buildPackageDetailsCard(),
            const SizedBox(height: 16),

            // ─── 4. PAYMENT & LOGISTICS CARD ──────────────────────────────────
            _buildPaymentCard(),
            const SizedBox(height: 24),

            // ─── 5. SUBMIT ACTION BUTTON ──────────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                key: const Key('submit_trip_request_button'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: BrandColors.bluePrimary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                onPressed: _isSubmitting ? null : _submitTripRequest,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.two_wheeler, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Solicitar Envío • C\$ ${_finalTotalFee.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Row(
              children: [
                Icon(Icons.alt_route, color: BrandColors.bluePrimary, size: 20),
                SizedBox(width: 8),
                Text(
                  'Ruta del Envío',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const Divider(height: 24, color: Color(0xFFF1F5F9)),

            // Point X (Origen)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFDBEAFE),
                        shape: BoxShape.circle,
                      ),
                      child: const Text('X', style: TextStyle(fontWeight: FontWeight.bold, color: BrandColors.bluePrimary, fontSize: 13)),
                    ),
                    Container(width: 2, height: 42, color: const Color(0xFFCBD5E1)),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Punto de Recogida (Origen X)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        key: const Key('trip_origin_address_field'),
                        controller: _originAddressController,
                        onChanged: (val) => setState(() => _originResolved = val.isNotEmpty),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: 'Dirección de recogida...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          suffixIcon: IconButton(
                            key: const Key('origin_map_picker_btn'),
                            icon: const Icon(Icons.map, size: 18, color: BrandColors.bluePrimary),
                            onPressed: () => _openMapPickerDialog(true),
                          ),
                        ),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Point Y (Destino)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFE4E6),
                    shape: BoxShape.circle,
                  ),
                  child: const Text('Y', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 13)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Punto de Entrega (Destino Y)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        key: const Key('trip_dest_address_field'),
                        controller: _destAddressController,
                        onChanged: (val) => setState(() => _destResolved = val.isNotEmpty),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: 'Dirección de entrega...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          suffixIcon: IconButton(
                            key: const Key('dest_map_picker_btn'),
                            icon: const Icon(Icons.map, size: 18, color: Colors.red),
                            onPressed: () => _openMapPickerDialog(false),
                          ),
                        ),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Saved Addresses Quick Select
            StreamBuilder<List<SavedAddressEntity>>(
              stream: widget.userService.watchAddresses(widget.currentUser.uid),
              builder: (ctx, snap) {
                final addresses = snap.data ?? [];
                if (addresses.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Direcciones guardadas:', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    const SizedBox(height: 4),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: addresses.map((addr) {
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ActionChip(
                              key: Key('trip_quick_addr_${addr.id}'),
                              label: Text('${addr.label}: ${addr.fullAddress}', style: const TextStyle(fontSize: 11)),
                              avatar: const Icon(Icons.bookmark_outline, size: 13),
                              onPressed: () => _applySavedAddress(addr, false),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuotationCard() {
    final distance = _calculatedDistanceKm;
    final fee = _calculatedFee;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.price_check, color: Color(0xFF15803D), size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Tarifa Canónica ADR-026',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                    ),
                  ],
                ),
                TextButton.icon(
                  key: const Key('open_offer_dialog_btn'),
                  onPressed: _openOfferDialog,
                  icon: const Icon(Icons.tune, size: 14),
                  label: const Text('Ofertar', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
            const Divider(height: 16, color: Color(0xFFF1F5F9)),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Distancia estimada (Haversine):', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text(
                  '$distance km',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Tarifa base oficial:', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text('C\$ 35.00', style: TextStyle(fontSize: 13, color: Color(0xFF0F172A))),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Costo por distancia (C\$ 10.00/km):', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                Text(
                  'C\$ ${(distance * 10.0).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFE2E8F0)),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _customOffer != null ? 'Total con Oferta:' : 'Total Estimado:',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                    ),
                    if (_customOffer != null)
                      Text(
                        'Oficial: C\$ ${fee.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 10, color: Colors.grey, decoration: TextDecoration.lineThrough),
                      ),
                  ],
                ),
                Text(
                  'C\$ ${_finalTotalFee.toStringAsFixed(2)}',
                  key: const Key('trip_final_fee_text'),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                    color: Color(0xFF15803D),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPackageDetailsCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.inventory_2_outlined, color: BrandColors.bluePrimary, size: 20),
                SizedBox(width: 8),
                Text(
                  'Detalles del Envío y Contacto',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFF1F5F9)),

            // Package Type Chips
            const Text('Tipo de Paquete:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: _packageTypes.map((t) {
                final isSelected = _packageType == t;
                return ChoiceChip(
                  key: Key('chip_package_$t'),
                  label: Text(t, style: const TextStyle(fontSize: 11)),
                  selected: isSelected,
                  selectedColor: BrandColors.bluePrimary,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF334155),
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (val) {
                    if (val) setState(() => _packageType = t);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 12),

            // Package Description
            TextField(
              key: const Key('trip_package_desc_field'),
              controller: _packageDescController,
              decoration: InputDecoration(
                labelText: 'Descripción del contenido *',
                hintText: 'Ej. Llaves, documento urgente, cargador...',
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),

            // Recipient Details
            Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const Key('trip_recipient_name_field'),
                    controller: _recipientNameController,
                    decoration: InputDecoration(
                      labelText: 'Nombre receptor',
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    key: const Key('trip_recipient_phone_field'),
                    controller: _recipientPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Teléfono receptor *',
                      isDense: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Delivery Mode Switch
            Row(
              children: [
                Expanded(
                  child: RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('En mano (Puerta)', style: TextStyle(fontSize: 12)),
                    value: 'PUERTA',
                    groupValue: _deliveryType,
                    onChanged: (val) => setState(() => _deliveryType = val!),
                  ),
                ),
                Expanded(
                  child: RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Recepción / Inmueble', style: TextStyle(fontSize: 12)),
                    value: 'INMUEBLE',
                    groupValue: _deliveryType,
                    onChanged: (val) => setState(() => _deliveryType = val!),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentCard() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.payment, color: BrandColors.bluePrimary, size: 20),
                SizedBox(width: 8),
                Text(
                  'Pago y Liquidación',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFF1F5F9)),

            // Quién Paga
            const Text('¿Quién paga el servicio?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    key: const Key('payer_chip_sender'),
                    label: const Text('Remitente (Origen)', style: TextStyle(fontSize: 12)),
                    selected: _payer == 'SENDER',
                    selectedColor: BrandColors.bluePrimary,
                    labelStyle: TextStyle(color: _payer == 'SENDER' ? Colors.white : Colors.black),
                    onSelected: (val) {
                      if (val) setState(() => _payer = 'SENDER');
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    key: const Key('payer_chip_recipient'),
                    label: const Text('Destinatario (Destino)', style: TextStyle(fontSize: 12)),
                    selected: _payer == 'RECIPIENT',
                    selectedColor: BrandColors.bluePrimary,
                    labelStyle: TextStyle(color: _payer == 'RECIPIENT' ? Colors.white : Colors.black),
                    onSelected: (val) {
                      if (val) setState(() => _payer = 'RECIPIENT');
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Método de Pago
            Row(
              children: [
                Expanded(
                  child: RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Efectivo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    value: 'efectivo',
                    groupValue: _paymentMethod,
                    onChanged: (val) => setState(() => _paymentMethod = val!),
                  ),
                ),
                Expanded(
                  child: RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: const Text('Transferencia', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    value: 'transferencia',
                    groupValue: _paymentMethod,
                    onChanged: (val) => setState(() => _paymentMethod = val!),
                  ),
                ),
              ],
            ),

            if (_paymentMethod == 'efectivo') ...[
              const SizedBox(height: 6),
              TextField(
                key: const Key('cash_change_input_field'),
                controller: _cashChangeController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: '¿Con cuánto pagarás? (Opcional, para cambio)',
                  prefixText: 'C\$ ',
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontSize: 13),
              ),
            ] else ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Cuentas para transferencia:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: BrandColors.bluePrimary)),
                    SizedBox(height: 4),
                    Text('• BAC Credomatic Córdobas: 365821945\n• Banpro Córdobas: 10020304050607', style: TextStyle(fontSize: 11, color: Color(0xFF334155))),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
