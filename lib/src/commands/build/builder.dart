import 'dart:convert';
import 'dart:io';
import 'package:extensions/metadata.dart';
import 'package:extensions/runtime.dart';
import 'package:extensions_dev_tools/tools.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'package:utilx/utilities/utils.dart';
import '../../constants.dart';
import '../../models/config.dart';
import '../../utils/git.dart';

class EStoreBuilder {
  final DateTime now = DateTime.now();

  final Map<String, EMetadata> extensions = <String, EMetadata>{};
  final Map<String, EManifestData> manifestDataMap = <String, EManifestData>{};
  final Map<String, String> clonedRepos = <String, String>{};

  Future<void> initialize() async {
    await DTEnvironment.prepare();
  }

  Future<void> build() async {
    final Directory cacheDir = Directory(Constants.cacheDir);
    if (await cacheDir.exists()) {
      await cacheDir.delete(recursive: true);
    }
    await cacheDir.create(recursive: true);

    final List<FileSystemEntity> dirs = await configDir.list().toList();

    for (final FileSystemEntity x in dirs) {
      if (x is! Directory) throw Error();

      await for (final FileSystemEntity y in x.list()) {
        if (y is! Directory) throw Error;

        await _loadMetadata(y);
      }
    }

    final EStore store = EStore(
      baseURLs: <String, String>{
        'github': Git.outputRepoGitHubRawURL,
        'jsdelivr': Git.outputRepoJsDelivrURL,
      },
      extensions: extensions,
      builtAt: now,
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

  Future<void> _loadMetadata(final Directory currentDir) async {
    final File configFile =
        File(path.join(currentDir.path, Constants.configBasename));

    final File configDataFile =
        File(path.join(currentDir.path, Constants.configDataBasename));

    final SConfig config = SConfig.parse(
      await configFile.readAsString(),
      await configDataFile.exists()
          ? await configDataFile.readAsString()
          : null,
    );

    await configDataFile.writeAsString(json.encode(config.toDataJson()));

    if (!Git.isValidSHA(config.repo.ref)) {
      throw Exception('Invalid `repo.ref` (${configFile.path})');
    }

    final EType nType = EnumUtils.find(
      EType.values,
      path.basename(path.dirname(currentDir.path)),
    );

    final String nAuthor = config.author ?? config.repo.username;
    final Set<String> allowedAuthors = <String>{
      config.repo.username,
      ...Constants.specialAuthors[config.repo.username] ?? <String>{},
    };

    if (!allowedAuthors.contains(nAuthor)) {
      throw Exception('Invalid `author` (${configFile.path})');
    }

    final String stringifiedRepo = config.repo.toString();
    final String clonedDir = path.normalize(
      path.join(
        Constants.cacheDir,
        config.repo.username,
        config.repo.repo,
        config.repo.ref,
      ),
    );

    if (!clonedRepos.containsKey(stringifiedRepo)) {
      await FSUtils.ensureDirectory(Directory(clonedDir));

      for (final MapEntry<String, Future<GitResult> Function()> x
          in <String, Future<GitResult> Function()>{
        'clone': () async => Git.run(
              args: <String>[
                'clone',
                config.repo.cloneURL,
                config.repo.ref,
              ],
              workingDirectory: path.dirname(clonedDir),
            ),
        'resetSHA': () async => Git.run(
              args: <String>[
                'reset',
                config.repo.ref,
                '--hard',
              ],
              workingDirectory: clonedDir,
            ),
      }.entries) {
        final GitResult res = await x.value();
        if (!res.success) {
          throw Exception(
            'Git task failed: ${x.key}\nStderr: ${res.result.stderr}',
          );
        }
      }

      clonedRepos[stringifiedRepo] = clonedDir;
    }

    final EBase64DS nSource = await _compileSource(
      ELocalFileDS(
        root: path.join(clonedDir, config.source.root),
        file: config.source.file,
      ),
    );

    final String nSourceSubPath =
        '${Constants.outputDataSubDir}/${config.id}.source.dat';

    await nSource.toLocalFile(
      ELocalFileDS.fromFullPath(
        path.join(Constants.outputDir, nSourceSubPath),
      ),
    );

    final EBase64DS nThumbnail = await EBase64DS.fromLocalFile(
      ELocalFileDS(
        root: path.join(clonedDir, config.source.root),
        file: config.source.file,
      ),
    );

    final String nThumbnailSubPath =
        '${Constants.outputDataSubDir}/${config.id}.thumbnail.dat';

    await nThumbnail.toLocalFile(
      ELocalFileDS.fromFullPath(
        path.join(Constants.outputDir, nThumbnailSubPath),
      ),
    );

    final EManifestData nManifestData = EManifestData(lastRef: config.repo.ref);

    if (config.hasRepoChanged) {
      config.version.increment();
    }

    final EMetadata nMetadata = EMetadata(
      id: config.id,
      name: config.name,
      type: nType,
      author: nAuthor,
      source: ECloudDS(nSourceSubPath),
      thumbnail: ECloudDS(nThumbnailSubPath),
      nsfw: config.nsfw,
      version: config.version,
    );

    extensions[nMetadata.id] = nMetadata;
    manifestDataMap[nMetadata.id] = nManifestData;
  }

  Future<void> dispose() async {
    await DTEnvironment.dispose();
  }

  Future<EBase64DS> _compileSource(final ELocalFileDS source) async {
    final ERuntimeInstance runtime = await ERuntimeManager.create(
      ERuntimeInstanceOptions(
        hetuSourceContext: HTFileSystemResourceContext(root: source.root),
      ),
    );
    await runtime.loadScriptCode('', appendDefinitions: true);
    return EBase64DS(await runtime.compileScriptFile(source.file));
  }

  Future<EStore?> _getPreviousStore() async =>
      getPreviousOutputRepoFile<EStore>(
        path: Constants.storeBasename,
        parser: (final String body) =>
            EStore.fromJson(json.decode(body) as Map<dynamic, dynamic>),
      );

  Future<EManifest?> _getPreviousManifest() async =>
      getPreviousOutputRepoFile<EManifest>(
        path: Constants.manifestBasename,
        parser: (final String body) =>
            EManifest.fromJson(json.decode(body) as Map<dynamic, dynamic>),
      );

  static final Directory configDir = Directory(Constants.configDir);
  static final Directory outputDir = Directory(Constants.outputDir);
  static final Directory outputDataDir =
      Directory(path.join(Constants.outputDir, Constants.outputDataSubDir));

  static Future<T?> getPreviousOutputRepoFile<T>({
    required final String path,
    required final T Function(String) parser,
  }) async {
    final String url = '${Git.outputRepoGitHubRawURL}/$path';
    final http.Response resp = await http.get(Uri.parse(url));

    switch (resp.statusCode) {
      case 200:
        return parser(resp.body);

      case 404:
        return null;

      default:
        throw Exception('Unexpected status code ($url)');
    }
  }
}
