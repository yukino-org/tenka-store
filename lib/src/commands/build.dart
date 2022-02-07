import 'dart:convert';
import 'dart:io';
import 'package:collection/collection.dart';
import 'package:extensions/metadata.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import '../constants.dart';
import '../models/config.dart';
import '../utils.dart';

Future<void> main() async {
  final Directory configDir = Directory(Constants.configDir);
  final Directory outputDir = Directory(Constants.outputDir);
  final Directory outputDataDir =
      Directory(path.join(Constants.outputDir, Constants.outputDataSubDir));

  if (await outputDir.exists()) {
    await outputDir.delete(recursive: true);
  }

  await outputDir.create(recursive: true);
  await outputDataDir.create(recursive: true);

  final List<FileSystemEntity> files = await configDir.list().toList();
  final DateTime now = DateTime.now();

  final EStore? previousStore = await Utils.getPreviousOutputRepoFile<EStore>(
    path: Constants.storeBasename,
    parser: (final String body) =>
        EStore.fromJson(json.decode(body) as Map<dynamic, dynamic>),
  );

  final EManifest? previousManifest =
      await Utils.getPreviousOutputRepoFile<EManifest>(
    path: Constants.manifestBasename,
    parser: (final String body) =>
        EManifest.fromJson(json.decode(body) as Map<dynamic, dynamic>),
  );

  final List<EStoreMetadata> extensions = <EStoreMetadata>[];
  final Map<String, EManifestData> manifestDataMap = <String, EManifestData>{};

  for (final FileSystemEntity file in files) {
    if (file is! File) throw Exception('Invalid entity: ${file.path}');

    final String content = await file.readAsString();
    final Config config = Config.parse(content);

    if (path.basename(file.path) !=
        '${config.repo.username}_${config.repo.repo}.yml') {
      throw Exception('Invalid filename (${file.path})');
    }

    if (!Constants.githubShaRegex.hasMatch(config.repo.ref)) {
      throw Exception('Invalid `repo.ref` (${file.path})');
    }

    for (final String url in config.toURLPaths()) {
      final http.Response resp = await http.get(Uri.parse(url));

      final EMetadata metadata =
          EMetadata.fromJson(json.decode(resp.body) as Map<dynamic, dynamic>);

      final Set<String> allowedAuthors = <String>{
        config.repo.username,
        ...Constants.specialAuthors[config.repo.username] ?? <String>{},
      };

      if (!allowedAuthors.contains(metadata.author)) {
        throw Exception('Invalid `author` (${file.path})');
      }

      final String sourceBasename = '${metadata.id}.source.dat';
      final String thumbnailBasename = '${metadata.id}.thumbnail.dat';

      if (metadata.source is! EBase64DS) {
        throw Exception('Invalid `metadata.source`');
      }

      if (metadata.thumbnail is! EBase64DS) {
        throw Exception('Invalid `metadata.thumbnail`');
      }

      await (metadata.source as EBase64DS).toLocalFile(
        ELocalFileDS(
          root: outputDataDir.path,
          file: sourceBasename,
        ),
      );

      await (metadata.thumbnail as EBase64DS).toLocalFile(
        ELocalFileDS(
          root: outputDataDir.path,
          file: thumbnailBasename,
        ),
      );

      final EStoreMetadata? previousStoreMetadata =
          previousStore?.extensions.firstWhereOrNull(
        (final EStoreMetadata x) => x.metadata.id == metadata.id,
      );

      final EManifestData? previousManifestData =
          previousManifest?.data[metadata.id];

      final EManifestData manifestData =
          EManifestData(lastRef: config.repo.ref);

      final EVersion version =
          previousStoreMetadata?.version ?? EVersion(now.year, now.month, 0);

      if (previousStoreMetadata != null &&
          previousManifestData != null &&
          previousManifestData.lastRef != manifestData.lastRef) {
        version.increment();
      }

      extensions.add(
        EStoreMetadata(
          metadata: EMetadata(
            name: metadata.name,
            author: metadata.author,
            type: metadata.type,
            source: ECloudDS(
              Utils.constructOutputRepoRawURL(
                '${Constants.outputDataSubDir}/$sourceBasename',
              ),
            ),
            thumbnail: ECloudDS(
              Utils.constructOutputRepoRawURL(
                '${Constants.outputDataSubDir}/$thumbnailBasename',
              ),
            ),
            nsfw: metadata.nsfw,
          ),
          version: version,
        ),
      );

      manifestDataMap[metadata.id] = manifestData;
    }

    final EStore store = EStore(
      extensions: extensions,
      builtAt: DateTime.now(),
      checksum: EStore.generateChecksum(),
    );

    final EManifest manifest = EManifest(manifestDataMap);

    await File(path.join(outputDir.path, Constants.storeBasename))
        .writeAsString(json.encode(store.toJson()));

    await File(path.join(outputDir.path, Constants.checksumBasename))
        .writeAsString(store.checksum);

    await File(path.join(outputDir.path, Constants.manifestBasename))
        .writeAsString(json.encode(manifest.toJson()));
  }
}
