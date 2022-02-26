import 'dart:convert';
import 'package:tenka/tenka.dart';
import 'package:utilx/utilities/utils.dart';
import 'package:yaml/yaml.dart';
import './repo.dart';

class SConfig {
  const SConfig({
    required this.id,
    required this.name,
    required this.author,
    required this.repo,
    required this.source,
    required this.thumbnail,
    required this.nsfw,
    required this.version,
    required this.pRepo,
  });

  factory SConfig.parse(
    final String cConfig, [
    final String? cConfigData,
  ]) {
    final Map<dynamic, dynamic> pConfig =
        loadYaml(cConfig) as Map<dynamic, dynamic>;

    final Map<dynamic, dynamic>? pConfigData = cConfigData != null
        ? json.decode(cConfigData) as Map<dynamic, dynamic>
        : null;

    return SConfig(
      id: pConfigData?['id'] as String? ?? _newID(),
      name: pConfig['name'] as String,
      author: pConfig['author'] as String?,
      repo:
          SGitHubRepository.fromJson(pConfig['repo'] as Map<dynamic, dynamic>),
      source: _parseConfigDS(pConfig['source'] as Map<dynamic, dynamic>),
      thumbnail: _parseConfigDS(pConfig['thumbnail'] as Map<dynamic, dynamic>),
      nsfw: pConfig['nsfw'] as bool,
      version: pConfigData != null
          ? TenkaVersion.parse(pConfigData['version'] as String)
          : _newVersion(),
      pRepo: pConfigData != null
          ? SGitHubRepository.fromJson(
              pConfigData['pRepo'] as Map<dynamic, dynamic>,
            )
          : null,
    );
  }

  final String id;
  final String name;
  final String? author;
  final SGitHubRepository repo;
  final TenkaLocalFileDS source;
  final TenkaLocalFileDS thumbnail;
  final bool nsfw;
  final TenkaVersion version;
  final SGitHubRepository? pRepo;

  Map<dynamic, dynamic> toDataJson() => <dynamic, dynamic>{
        r'$note': 'This is a generated file, do not edit this.',
        'id': id,
        'version': version.toString(),
        'pRepo': repo.toJson(),
      };

  bool get hasRepoChanged => pRepo != null && pRepo == repo;

  static String _newID() => StringUtils.toHex(
        '${DateTime.now().millisecondsSinceEpoch}-${StringUtils.random(inputLength: 3)}',
      );

  static TenkaVersion _newVersion() {
    final DateTime now = DateTime.now();
    return TenkaVersion(now.year, now.month, 0);
  }

  static TenkaLocalFileDS _parseConfigDS(final Map<dynamic, dynamic> json) =>
      TenkaLocalFileDS(
        root: json['root'] as String,
        file: json['file'] as String,
      );
}
