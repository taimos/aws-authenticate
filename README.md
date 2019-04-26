# AWS Authenticate

This CLI tool helps you to configure your AWS access in CI/CD environments. You can set the region, the IAM profile to use or assume IAM roles with one CLI call.

The tool prints environment variables to the console to use in subsequent calls. By using `eval` you can set the environment in one call.

## How to install

To install this tool you need NodeJS and NPM installed on your machine.
You can then execute `npm install -g aws-authenticate` to install the `aws-authenticate` executable.

## Examples

To use a profile configured in your `~/.aws/config` file, issue the following command:

`eval "$(aws-authenticate auth --profile myprofile)"`

To assume a role using your default config you call it like:

`eval "$(aws-authenticate auth --role MyRole)"`

To assume a role in another account, use:

`eval "$(aws-authenticate auth --role MyRole --roleAccount 123456789012)"`

To clear all AWS related environment variable and use the defaults, call:

`eval $(aws-authenticate clear)`

## Documentation

`aws-authenticate <command> [options]`

### auth

The `auth` command is used to configure credentials or assume roles.

Valid options are:

* `--role <role>` - The IAM role to assume
* `--roleAccount <accountId>` - The AWS account owning the role to assume. If not specified, your current account is used.
* `--region <region>` - The region to configure for subsequent calls
* `--profile <profile>` - The profile configured in `~/.aws/config` to use
* `--externalId <id>` - The external ID to use when assuming roles
* `--duration <seconds>` - The number of seconds the temporary credentials should be valid. Default is 3600.
* `--roleSessionName <name>` - The name of the session of the assumed role. Defaults to `AWS-Auth-<xyz>` with `xyz` being the current milliseconds since epoch.
* `--id` - Print the final user information to the console for debugging purpose
* `--script` - Run the given script with the AWS env instead of printing it to console

### id

With the `id` command, the tool prints the currently configured IAM principal to the console

```bash
$ aws-authenticate id
# Account: 123456789012 - User: arn:aws:iam::123456789012:user/johndoe
```

### clear

The `clear` command creates a bash snippet to clear all AWS related environment vafriables.

# Changelog

## master
* add `--script` option to run bash scripts directly

## 1.0.1
* add README and `help` command

## 1.0.0
* Initial project implementation

# Contribute

## Did you find a bug?

* **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/taimos/aws-authenticate/issues).

* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/taimos/aws-authenticate/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** demonstrating the expected behavior that is not occurring.

## Did you write a patch that fixes a bug?

* Open a new GitHub pull request with the patch.

* Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.

## Did you fix whitespace, format code, or make a purely cosmetic patch?

Changes that are cosmetic in nature and do not add anything substantial to the stability, functionality, or testability will normally not be accepted.

## Do you intend to add a new feature or change an existing one?

* Suggest your change under [Issues](https://github.com/taimos/aws-authenticate/issues).

* Do not open a pull request on GitHub until you have collected positive feedback about the change.

## Do you want to contribute to the aws-authenticate documentation?

* Just file a PR with your recommended changes