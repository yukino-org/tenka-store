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
      'https://raw.githubusercontent.com/${Constants.outputRepo.username}/${Constants.outputRepo.repo}/${Constants.outputRepo.sha}/$path';
}
