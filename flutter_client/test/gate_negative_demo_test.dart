import 'package:flutter_test/flutter_test.dart';

void main() {
  test('DEMONSTRATION: Intentional Failure for CI Gate Validation', () {
    expect(1 + 1, equals(3), reason: 'Deliberate failure to demonstrate analyze_and_test gate blocking build_ios');
  });
}
