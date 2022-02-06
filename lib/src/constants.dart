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

  static const String _refSuffix = bool.hasEnvironment('deploy')
      ? '-${const String.fromEnvironment('deploy')}'
      : '';

  static const GitHubRepository outputRepo = GitHubRepository(
    username: 'yukino-app',
    repo: 'extensions-store',
    sha: 'dist$_refSuffix',
  );
}
