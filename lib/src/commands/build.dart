import 'dart:convert';
import 'dart:io';
import 'package:extensions/metadata.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import '../constants.dart';
import '../models/config.dart';
import '../utils.dart';

Future<void> main() async {
  final Directory configDir = Directory(Constants.configDir);
  final Directory outputDir = Directory(Constants.outputDir);

  if (await outputDir.exists()) {
    await outputDir.delete(recursive: true);
  }

  await outputDir.create(recursive: true);

  final List<FileSystemEntity> files = await configDir.list().toList();
  final List<EStoreMetadata> extensions = <EStoreMetadata>[];

  for (final FileSystemEntity file in files) {
    if (file is! File) throw Exception('Invalid entity: ${file.path}');

    final String content = await file.readAsString();
    final Config config = Config.parse(content);

    if (path.basenameWithoutExtension(file.path) !=
        '${config.repo.username}_${config.repo.repo}') {
      throw Exception('Invalid filename (${file.path})');
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
        ELocalFileDS(root: outputDir.path, file: sourceBasename),
      );

      await (metadata.thumbnail as EBase64DS).toLocalFile(
        ELocalFileDS(root: outputDir.path, file: thumbnailBasename),
      );

      extensions.add(
        EStoreMetadata(
          metadata: EMetadata(
            name: metadata.name,
            author: metadata.author,
            type: metadata.type,
            source: ECloudDS(Utils.constructOutputRepoRawURL(sourceBasename)),
            thumbnail:
                ECloudDS(Utils.constructOutputRepoRawURL(thumbnailBasename)),
            nsfw: metadata.nsfw,
          ),
          version: EVersion(0, 0, 0),
        ),
      );
    }

    final EStore store = EStore(
      extensions: extensions,
      builtAt: DateTime.now(),
      checksum: EStore.generateChecksum(),
    );

    print(Constants.outputRepo.ref);
    await File(path.join(outputDir.path, 'store.json')).writeAsString(
      json.encode(store.toJson()),
    );
  }
}
