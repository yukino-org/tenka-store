import 'package:yaml/yaml.dart';
import '../utils.dart';

class GitHubRepository {
  const GitHubRepository({
    required this.username,
    required this.repo,
    required this.ref,
  });

  factory GitHubRepository.fromJson(final Map<dynamic, dynamic> json) =>
      GitHubRepository(
        username: json['username'] as String,
        repo: json['repo'] as String,
        ref: json['ref'] as String,
      );

  final String username;
  final String repo;
  final String ref;
}

class Config {
  const Config({
    required this.repo,
    required this.paths,
    this.author,
  });

  factory Config.parse(final String content) {
    final Map<dynamic, dynamic> parsed =
        loadYaml(content) as Map<dynamic, dynamic>;

    return Config(
      author: parsed['author'] as String?,
      repo: GitHubRepository.fromJson(parsed['repo'] as Map<dynamic, dynamic>),
      paths: (parsed['paths'] as List<dynamic>).cast<String>(),
    );
  }

  final String? author;
  final GitHubRepository repo;
  final List<String> paths;

  List<String> toURLPaths() => paths
      .map(
        (final String x) => '${Utils.constructGitHubRawURL(repo)}/$x',
      )
      .toList();
}
