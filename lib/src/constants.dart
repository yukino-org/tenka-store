import 'dart:io';
import 'package:path/path.dart' as path;
import './models/repo.dart';

abstract class Constants {
  static final String configDir =
      path.join(Directory.current.path, '../extensions');

  static final String outputDir = path.join(Directory.current.path, '../dist');
  static final String outputDataDir = path.join(outputDir, 'data');

  static final String cacheDir = path.join(Directory.current.path, '../.cache');

  static const String configBasename = 'config.yaml';
  static const String configDataBasename = '_data.json';

  static const String storeBasename = 'store.json';
  static const String checksumBasename = '.checksum';

  static final Map<String, List<String>> specialAuthors =
      <String, List<String>>{
    'yukino-org': <String>['Zyrouge'],
  };

  static const String _deployMode = 'DEPLOY_MODE';

  static final String? _deployModeValue = Platform.environment[_deployMode];

  static final String _ref =
      _deployModeValue != null ? '-$_deployModeValue' : '';

  static final SGitHubRepository outputRepo = SGitHubRepository(
    username: 'yukino-org',
    repo: 'extensions-store',
    ref: 'dist$_ref',
  );

  static final RegExp githubShaRegex = RegExp(r'\b([a-f0-9]{40})\b');
}
