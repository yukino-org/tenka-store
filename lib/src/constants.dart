import 'dart:io';
import 'package:path/path.dart' as path;
import './models/config.dart';

abstract class Constants {
  static final String configDir =
      path.join(Directory.current.path, '../extensions');

  static final String outputDir = path.join(Directory.current.path, '../dist');

  static const String outputDataSubDir = 'data';

  static const String storeBasename = 'extensions.json';
  static const String manifestBasename = 'manifest.json';
  static const String checksumBasename = '.checksum';

  static final Map<String, List<String>> specialAuthors =
      <String, List<String>>{
    'yukino-app': <String>['Zyrouge'],
  };

  static const String _deployMode = 'DEPLOY_MODE';

  static final String? _deployModeValue = Platform.environment[_deployMode];

  static final String _ref =
      _deployModeValue != null ? '-$_deployModeValue' : '';

  static final GitHubRepository outputRepo = GitHubRepository(
    username: 'yukino-app',
    repo: 'extensions-store',
    ref: 'dist$_ref',
  );
}
