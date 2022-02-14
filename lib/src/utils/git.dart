import 'dart:io';
import 'package:path/path.dart' as path;
import 'package:utilx/utilities/utils.dart';
import '../constants.dart';
import '../models/repo.dart';

class GitResult {
  const GitResult({
    required this.success,
    required this.result,
    this.message,
  });

  factory GitResult.fromProcessResult(
    final ProcessResult result, [
    final String? message,
  ]) =>
      GitResult(
        success: result.exitCode == 0,
        result: result,
        message: message,
      );

  final bool success;
  final String? message;
  final ProcessResult result;
}

abstract class Git {
  static Future<GitResult> run({
    required final List<String> args,
    required final String workingDirectory,
  }) async {
    final ProcessResult res = await Process.run(
      'git',
      args,
      workingDirectory: workingDirectory,
    );

    return GitResult.fromProcessResult(res);
  }

  static bool isValidSHA(final String sha) =>
      RegExp(r'\b([a-f0-9]{40})\b').hasMatch(sha);

  static String constructGitHubRawURL(final SGitHubRepository repo) =>
      'https://raw.githubusercontent.com/${repo.username}/${repo.repo}/${repo.ref}';

  static String constructJsDelivrURL(final SGitHubRepository repo) =>
      'https://cdn.jsdelivr.net/gh/${repo.username}/${repo.repo}@${repo.ref}';

  static String get outputRepoGitHubRawURL =>
      constructGitHubRawURL(Constants.outputRepo);

  static String get outputRepoJsDelivrURL =>
      constructJsDelivrURL(Constants.outputRepo);
}
