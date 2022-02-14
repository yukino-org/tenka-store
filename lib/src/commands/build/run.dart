import './builder.dart';

Future<void> main() async {
  final EStoreBuilder builder = EStoreBuilder();
  await builder.initialize();
  await builder.build();
  await builder.dispose();
}
