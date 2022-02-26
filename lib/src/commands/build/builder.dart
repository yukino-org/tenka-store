import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'package:tenka/tenka.dart';
import 'package:tenka_dev_tools/tenka_dev_tools.dart';
import 'package:utilx/utilities/utils.dart';
import '../../constants.dart';
import '../../models/config.dart';
import '../../utils/git.dart';

class TenkaStoreBuilder {
  final DateTime now = DateTime.now();

  final Map<String, TenkaMetadata> modules = <String, TenkaMetadata>{};
  final Map<String, String> clonedRepos = <String, String>{};

  Future<void> initialize() async {
    await TenkaDevEnvironment.prepare();
  }

  Future<void> build() async {
    await FSUtils.recreateDirectory(cacheDir);
    await FSUtils.recreateDirectory(outputDir);
    await FSUtils.ensureDirectory(outputDataDir);

    final List<FileSystemEntity> dirs = await configDir.list().toList();

    for (final FileSystemEntity x in dirs) {
      if (x is! Directory) throw Error();

      await for (final FileSystemEntity y in x.list()) {
        if (y is! Directory) throw Error;

        await _loadMetadata(y);
      }
    }

    final TenkaStore store = TenkaStore(
      baseURLs: <String, String>{
        'github': Git.outputRepoGitHubRawURL,
        'jsdelivr': Git.outputRepoJsDelivrURL,
      },
      modules: modules,
      builtAt: now,
      checksum: TenkaStore.generateChecksum(),
    );

    await File(path.join(outputDir.path, Constants.storeBasename))
        .writeAsString(json.encode(store.toJson()));

    await File(path.join(outputDir.path, Constants.checksumBasename))
        .writeAsString(store.checksum);
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

    final TenkaType nType = EnumUtils.find(
      TenkaType.values,
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

    final TenkaBase64DS nSource = await _compileSource(
      TenkaLocalFileDS(
        root: path.join(clonedDir, config.source.root),
        file: config.source.file,
      ),
    );

    final String nSourceSubPath =
        '${path.basename(Constants.outputDataDir)}/${config.id}.s.dat';

    await nSource.toLocalFile(
      TenkaLocalFileDSConverter.converter.fromFullPath(
        path.join(Constants.outputDir, nSourceSubPath),
      ),
    );

    final TenkaBase64DS nThumbnail =
        await TenkaBase64DSConverter.converter.fromLocalFile(
      TenkaLocalFileDS(
        root: path.join(clonedDir, config.source.root),
        file: config.source.file,
      ),
    );

    final String nThumbnailSubPath =
        '${path.basename(Constants.outputDataDir)}/${config.id}.t.dat';

    await nThumbnail.toLocalFile(
      TenkaLocalFileDSConverter.converter.fromFullPath(
        path.join(Constants.outputDir, nThumbnailSubPath),
      ),
    );

    if (config.hasRepoChanged) {
      config.version.increment();
    }

    final TenkaMetadata nMetadata = TenkaMetadata(
      id: config.id,
      name: config.name,
      type: nType,
      author: nAuthor,
      source: TenkaCloudDS(nSourceSubPath),
      thumbnail: TenkaCloudDS(nThumbnailSubPath),
      nsfw: config.nsfw,
      version: config.version,
    );

    modules[nMetadata.id] = nMetadata;
  }

  Future<void> dispose() async {
    await TenkaDevEnvironment.dispose();
  }

  Future<TenkaBase64DS> _compileSource(final TenkaLocalFileDS source) async {
    final TenkaRuntimeInstance runtime = await TenkaRuntimeManager.create(
      TenkaRuntimeInstanceOptions(
        hetuSourceContext: HTFileSystemResourceContext(root: source.root),
      ),
    );
    await runtime.loadScriptCode('', appendDefinitions: true);
    return TenkaBase64DS(await runtime.compileScriptFile(source.file));
  }

  static final Directory configDir = Directory(Constants.configDir);
  static final Directory outputDir = Directory(Constants.outputDir);
  static final Directory outputDataDir = Directory(Constants.outputDataDir);
  static final Directory cacheDir = Directory(Constants.cacheDir);

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
