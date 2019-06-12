# AWS Authenticate

This CLI tool helps you to configure your AWS access in CI/CD environments. You can set the region, the IAM profile to use or assume IAM roles with one CLI call.

The tool prints environment variables to the console to use in subsequent calls. By using `eval` you can set the environment in one call.

## How to install

To install this tool you need NodeJS and NPM installed on your machine.
You can then execute `npm install -g aws-authenticate` to install the `aws-authenticate` executable.

## Examples

### One-liners

To use a profile configured in your `~/.aws/config` file, issue the following command:

`eval "$(aws-authenticate auth --profile myprofile)"`

To assume a role using your default config you call it like:

`eval "$(aws-authenticate auth --role MyRole)"`

To assume a role in another account, use:

`eval "$(aws-authenticate auth --role MyRole --roleAccount 123456789012)"`

To assume a role in another account using a different policy, call:

`eval "$(aws-authenticate auth --role MyRole --roleAccount 123456789012 --roleSessionPolicy 'arn:aws:iam::aws:policy/AdministratorAccess')"`

To clear all AWS related environment variable and use the defaults, call:

`eval "$(aws-authenticate clear)"`

### Example using sub-shell

If you do not want to pollute your environment with settings, you can use a sub-shell to only configure AWS for several calls:

```bash
#!/bin/bash -e

...
(
    eval "$(aws-authenticate auth --profile myprofile)"
    aws s3 ls
)
...
```

### Looping through all accounts

If you want to do something for a accounts in an organization, use the following code:

```bash
#!/bin/bash -e

export accounts=$(aws-authenticate accounts)

echo "${accounts}" | while read account; do
(
    id=$(echo "${account}" | cut -d ',' -f 1)
    safeName=$(echo "${account}" | cut -d ',' -f 4)
    
    echo "Doing stuff for account ${id} with safe name ${safeName}"

    eval "$(aws-authenticate auth --roleAccount ${id} --role master --region eu-central-1)"

    aws-authenticate set-alias --name "${safeName}"
)

done

```

If you have a tag called `Alias` on your accounts, you can set the account alias with the following script:

```bash
#!/bin/bash -e

export accounts=$(aws-authenticate accounts --tags Alias)

echo "${accounts}" | while read account; do
(
    id=$(echo "${account}" | cut -d ',' -f 1)
    alias=$(echo "${account}" | cut -d ',' -f 6)
    eval "$(aws-authenticate auth --roleAccount ${id} --role master --region eu-central-1)"
    aws-authenticate set-alias --name "${alias}"
)

done

```

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
* `--roleSessionPolicy <str>` - The ARN or filename of the policy to use for the assumed session
* `--id` - Print the final user information to the console for debugging purpose

### id

With the `id` command, the tool prints the currently configured IAM principal to the console

```bash
$ aws-authenticate id
# Account: 123456789012 - User: arn:aws:iam::123456789012:user/johndoe
```

### clear

The `clear` command creates a bash snippet to clear all AWS related environment vafriables.

### accounts

The `accounts` command lists AWS accounts withing the currect organization.

Accounts are printed one account per line with the following fields in a CSV format.
```
<ID>,<EMAIL>,<NAME>,<SAFENAME>,<STATUS>
```

The safe name is the name with only alphanumeric characters and the rest being replaced with dashes.

```
123456789012,acc1@example.com,My Example Account,my-example-account,ACTIVE
210987654321,acc2@example.com,My Sub Account,my-sub-account,ACTIVE
```

Valid options are:

* `--parent <parent>` - Limit the account list to the given orga parent (OU)
* `--tags key1,key2`  - Show account tags as additional columns

### update-idp

The `update-idp` command is used to create or update the given SAML identity provider

Valid options are:

* `--name <name>` - Name of the IdP to configure. Defaults to `SAML`
* `--metadata <file>` - The file to use as SAML metadata

### set-alias

The `set-alias` command enables you to configure an AWS account alias.

Valid options are:

* `--name <name>` - Name of the alias to configure

# Changelog

## master
* add `--roleSessionPolicy` to provide IAM policies when assuming roles
* add `--tags` to account list

## 1.2.0
* remove `--script` option as it is completely broken. Use sub-shells instead. **BREAKING CHANGE**

## 1.1.0
* add `--script` option to run bash scripts directly
* add `accounts` command to list AWS accounts
* add `update-idp` command to manage SAML IdP
* add `set-alias` command to manage SAML IdP
* fix `clear` command

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