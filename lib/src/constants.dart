import 'dart:io';
import 'package:path/path.dart' as path;
import './models/config.dart';

abstract class Constants {
  static final String configDir =
      path.join(Directory.current.path, '../extensions');

  static final String outputDir = path.join(Directory.current.path, '../dist');

  static final Map<String, List<String>> specialAuthors =
      <String, List<String>>{
    'yukino-app': <String>['Zyrouge'],
  };

  static final String _ref = Platform.environment['DEPLOY_MODE'] != null
      ? '-${Platform.environment['DEPLOY_MODE']}'
      : '';

  static final GitHubRepository outputRepo = GitHubRepository(
    username: 'yukino-app',
    repo: 'extensions-store',
    ref: 'dist$_ref',
  );
}
