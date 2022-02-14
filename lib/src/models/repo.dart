class SGitHubRepository {
  const SGitHubRepository({
    required this.username,
    required this.repo,
    required this.ref,
  });

  factory SGitHubRepository.fromJson(final Map<dynamic, dynamic> json) =>
      SGitHubRepository(
        username: json['username'] as String,
        repo: json['repo'] as String,
        ref: json['ref'] as String,
      );

  final String username;
  final String repo;
  final String ref;

  Map<dynamic, dynamic> toJson() => <dynamic, dynamic>{
        'username': username,
        'repo': repo,
        'ref': ref,
      };

  @override
  String toString() => '$username-$repo-$ref';

  @override
  bool operator ==(final Object other) =>
      other is SGitHubRepository && other.toString() == toString();

  @override
  int get hashCode => Object.hash(username, repo, ref);

  String get cloneURL => 'https://github.com/$username/$repo.git';
}
