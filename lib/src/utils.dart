import 'package:http/http.dart' as http;
import './constants.dart';

abstract class Utils {
  static String constructGitHubRawURL({
    required final String username,
    required final String repo,
    required final String ref,
    required final String path,
  }) =>
      'https://raw.githubusercontent.com/$username/$repo/$ref/$path';

  static String constructOutputRepoRawURL(final String path) =>
      'https://raw.githubusercontent.com/${Constants.outputRepo.username}/${Constants.outputRepo.repo}/${Constants.outputRepo.ref}/$path';

  static Future<T?> getPreviousOutputRepoFile<T>({
    required final String path,
    required final T Function(String) parser,
  }) async {
    final String url = constructOutputRepoRawURL(path);
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
