/// BLUE SYSTEM DELIVERY ENTERPRISE — INPUTS & SEARCH SYSTEM
/// Canonical inputs with validation states, rounded borders, and search bar parity.

import 'package:flutter/material.dart';
import '../colors/bs_colors.dart';
import '../dimensions/bs_dimensions.dart';
import '../elevation/bs_elevation.dart';
import '../radius/bs_radius.dart';
import '../spacing/bs_spacing.dart';
import '../typography/bs_typography.dart';

class BSInput extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool isPassword;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final bool enabled;
  final int maxLines;
  final FocusNode? focusNode;

  const BSInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffix,
    this.isPassword = false,
    this.keyboardType = TextInputType.text,
    this.validator,
    this.onChanged,
    this.enabled = true,
    this.maxLines = 1,
    this.focusNode,
  });

  @override
  State<BSInput> createState() => _BSInputState();
}

class _BSInputState extends State<BSInput> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: BSTypography.labelMedium(color: BSColors.textPrimaryLight),
          ),
          BSSpacing.vGapXs,
        ],
        TextFormField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          obscureText: widget.isPassword ? _obscure : false,
          keyboardType: widget.keyboardType,
          validator: widget.validator,
          onChanged: widget.onChanged,
          enabled: widget.enabled,
          maxLines: widget.maxLines,
          style: BSTypography.bodyLarge(),
          decoration: InputDecoration(
            hintText: widget.hint,
            hintStyle: BSTypography.bodyMedium(color: BSColors.textTertiaryLight),
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon, size: 20, color: BSColors.textSecondaryLight)
                : null,
            suffixIcon: widget.isPassword
                ? IconButton(
                    icon: Icon(
                      _obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                      size: 20,
                      color: BSColors.textSecondaryLight,
                    ),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  )
                : widget.suffix,
            filled: true,
            fillColor: widget.enabled ? Colors.white : BSColors.surfaceContainerLowLight,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: const OutlineInputBorder(
              borderRadius: BSRadius.borderMd,
              borderSide: BorderSide(color: BSColors.outlineLight),
            ),
            enabledBorder: const OutlineInputBorder(
              borderRadius: BSRadius.borderMd,
              borderSide: BorderSide(color: BSColors.outlineLight),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BSRadius.borderMd,
              borderSide: BorderSide(color: BSColors.primary, width: 2),
            ),
            errorBorder: const OutlineInputBorder(
              borderRadius: BSRadius.borderMd,
              borderSide: BorderSide(color: BSColors.error, width: 1.5),
            ),
            focusedErrorBorder: const OutlineInputBorder(
              borderRadius: BSRadius.borderMd,
              borderSide: BorderSide(color: BSColors.error, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

/// Canonical 1:1 Android Search Bar with voice mic and rounded pill design
class BSSearchField extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onVoiceSearch;
  final VoidCallback? onClear;
  final String hintText;

  const BSSearchField({
    super.key,
    this.controller,
    this.onChanged,
    this.onVoiceSearch,
    this.onClear,
    this.hintText = 'Buscar restaurantes o comida...',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: BSDimensions.searchBarHeight,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BSRadius.borderPill,
        boxShadow: BSElevation.subtleShadow,
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: BSTypography.bodyMedium(),
        textAlignVertical: TextAlignVertical.center,
        decoration: InputDecoration(
          isDense: true,
          hintText: hintText,
          hintStyle: BSTypography.bodyMedium(color: BSColors.textTertiaryLight),
          prefixIcon: const Icon(Icons.search_rounded, color: BSColors.textSecondaryLight, size: 22),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (controller?.text.isNotEmpty ?? false)
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18, color: BSColors.textSecondaryLight),
                  onPressed: onClear,
                ),
              if (onVoiceSearch != null)
                IconButton(
                  icon: const Icon(Icons.mic_rounded, size: 20, color: BSColors.primary),
                  onPressed: onVoiceSearch,
                ),
            ],
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
        ),
      ),
    );
  }
}
