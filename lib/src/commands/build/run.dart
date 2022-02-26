import './builder.dart';

Future<void> main() async {
  final TenkaStoreBuilder builder = TenkaStoreBuilder();
  await builder.initialize();
  await builder.build();
  await builder.dispose();
}
