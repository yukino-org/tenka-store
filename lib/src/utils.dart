import 'package:http/http.dart' as http;
import './constants.dart';
import './models/config.dart';

abstract class Utils {
  static String constructGitHubRawURL(final GitHubRepository repo) =>
      'https://raw.githubusercontent.com/${repo.username}/${repo.repo}/${repo.ref}';

  static String get getGitHubOutputRepoRawBaseURL =>
      constructGitHubRawURL(Constants.outputRepo);

  static String get getJsDelivrOutputRepoRawBaseURL =>
      'https://cdn.jsdelivr.net/gh/${Constants.outputRepo.username}/${Constants.outputRepo.repo}@${Constants.outputRepo.ref}';

  static Future<T?> getPreviousOutputRepoFile<T>({
    required final String path,
    required final T Function(String) parser,
  }) async {
    final String url = '$getGitHubOutputRepoRawBaseURL/$path';
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
