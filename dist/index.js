#!/usr/bin/env node
"use strict";
/*
 * Copyright (c) 2019. Taimos GmbH http://www.taimos.de
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const fs_1 = require("fs");
const minimist = require("minimist");
const exec = require("native-exec");
const agent = require("proxy-agent");
const args = minimist(process.argv.slice(2), {
    default: {
        id: false,
    },
});
const command = args._[0];
const awsEnv = {};
const role = args.role;
const roleAccount = args.roleAccount;
const region = args.region;
const profile = args.profile;
const externalId = args.externalId;
const duration = args.duration;
const roleSessionName = args.roleSessionName;
const script = args.script;
function getConfigObject() {
    return Object.assign({ retryDelayOptions: { base: 700 } }, (region && region !== '') && { region }, (process.env.HTTPS_PROXY || process.env.https_proxy) && {
        httpOptions: {
            agent: agent(process.env.HTTPS_PROXY || process.env.https_proxy),
        },
    }, profile && { credentials: new AWS.SharedIniFileCredentials({ profile }) }, awsEnv.AWS_ACCESS_KEY_ID && {
        accessKeyId: awsEnv.AWS_ACCESS_KEY_ID,
        secretAccessKey: awsEnv.AWS_SECRET_ACCESS_KEY,
        sessionToken: awsEnv.AWS_SESSION_TOKEN,
        credentials: undefined,
    });
}
function withProfile() {
    if (profile && profile !== '') {
        console.log(`# Setting AWS profile ${profile}`);
        awsEnv.AWS_DEFAULT_PROFILE = profile;
        awsEnv.AWS_PROFILE = profile;
    }
}
function withRegion() {
    if (region && region !== '') {
        console.log(`# Setting AWS region ${region}`);
        awsEnv.AWS_DEFAULT_REGION = region;
        awsEnv.AWS_REGION = region;
    }
}
async function getRoleArn() {
    if (role.startsWith('arn:')) {
        return role;
    }
    const sts = new AWS.STS(getConfigObject());
    const partition = 'aws'; // TODO get for region
    const accountId = (roleAccount && roleAccount !== '') ? roleAccount : (await sts.getCallerIdentity().promise()).Account;
    return `arn:${partition}:iam::${accountId}:role/${role}`;
}
async function withRole() {
    if (role && role !== '') {
        const sts = new AWS.STS(getConfigObject());
        const request = {
            DurationSeconds: duration || 3600,
            ExternalId: externalId,
            RoleArn: await getRoleArn(),
            RoleSessionName: roleSessionName || `AWS-Auth-${new Date().getTime()}`,
        };
        console.log(`# Assuming IAM role ${request.RoleArn}`);
        try {
            const assumed = await sts.assumeRole(request).promise();
            console.log(`# Assumed role ${assumed.AssumedRoleUser.Arn} with id ${assumed.AssumedRoleUser.AssumedRoleId} valid until ${assumed.Credentials.Expiration}`);
            awsEnv.AWS_ACCESS_KEY_ID = assumed.Credentials.AccessKeyId;
            awsEnv.AWS_SECRET_ACCESS_KEY = assumed.Credentials.SecretAccessKey;
            awsEnv.AWS_SESSION_TOKEN = assumed.Credentials.SessionToken;
        }
        catch (error) {
            console.error(error);
        }
    }
}
async function showId() {
    const sts = new AWS.STS(getConfigObject());
    const id = await sts.getCallerIdentity().promise();
    console.log(`# Account: ${id.Account} - User: ${id.Arn}`);
}
async function doAuth() {
    console.log(`# Configuring AWS auth`);
    withProfile();
    withRegion();
    await withRole();
    if (args.id) {
        await showId();
    }
    if (args.script) {
        exec('bash', Object.assign({}, awsEnv), [`${args.script}`]);
    }
    else {
        for (const key in awsEnv) {
            if (awsEnv.hasOwnProperty(key)) {
                console.log(`export ${key}=${awsEnv[key]}`);
            }
        }
    }
}
async function showAccounts() {
    const orgaClient = new AWS.Organizations(Object.assign({}, getConfigObject(), { region: 'us-east-1' }));
    const accounts = [];
    let NextToken;
    do {
        if (args.parent) {
            const res = await orgaClient.listAccountsForParent({ NextToken, ParentId: args.parent }).promise();
            NextToken = res.NextToken;
            res.Accounts.forEach((acc) => accounts.push(acc));
        }
        else {
            const res = await orgaClient.listAccounts({ NextToken }).promise();
            NextToken = res.NextToken;
            res.Accounts.forEach((acc) => accounts.push(acc));
        }
    } while (NextToken);
    accounts.sort((a, b) => a.Id.localeCompare(b.Id)).forEach((acc) => {
        const safeName = acc.Name.replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase();
        console.log(`${acc.Id},${acc.Email},${acc.Name},${safeName},${acc.Status}`);
    });
}
async function updateIdp() {
    const name = args.name || 'SAML';
    if (!args.metadata) {
        throw 'Missing idp metadata file. Use --metadata to specify the file.';
    }
    const metadata = fs_1.readFileSync(args.metadata, { encoding: 'UTF-8' });
    const iamClient = new AWS.IAM(Object.assign({}, getConfigObject(), { region: 'us-east-1' }));
    console.log(`Checking for identity provider ${name}`);
    const listResult = await iamClient.listSAMLProviders().promise();
    let providerARN;
    listResult.SAMLProviderList.forEach((provider) => {
        const entryArn = provider.Arn;
        if (entryArn.substring(entryArn.lastIndexOf('/') + 1) === name) {
            providerARN = entryArn;
        }
    });
    if (providerARN) {
        // Update IdP
        const updateRes = await iamClient.updateSAMLProvider({
            SAMLProviderArn: providerARN,
            SAMLMetadataDocument: metadata,
        }).promise();
        console.log(`Updated identity provider ${updateRes.SAMLProviderArn}`);
    }
    else {
        // Create IdP
        const createRes = await iamClient.createSAMLProvider({
            Name: name,
            SAMLMetadataDocument: metadata,
        }).promise();
        console.log(`Created identity provider ${createRes.SAMLProviderArn}`);
    }
}
function doClear() {
    console.log('# Exports to clear AWS config');
    console.log('unset AWS_ACCESS_KEY_ID');
    console.log('unset AWS_SECRET_ACCESS_KEY');
    console.log('unset AWS_SESSION_TOKEN');
    console.log('unset AWS_DEFAULT_REGION');
    console.log('unset AWS_REGION');
    console.log('unset AWS_DEFAULT_PROFILE');
    console.log('unset AWS_PROFILE');
}
function showHelp() {
    console.log('Missing command');
    console.log('');
    console.log('aws-authenticate <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('auth  - used to configure credentials or assume roles');
    console.log('id    - prints the currently configured IAM principal to the console');
    console.log('clear - creates a bash snippet to clear all AWS related environment variables');
    console.log('accounts - list all AWS accounts for the current organization');
    console.log('set-alias - set the alias for the current AWS account');
    console.log('update-idp - update the given SAML identity provider');
    console.log('');
    console.log('Options for \'auth\':');
    console.log('--role <role>             - The IAM role to assume');
    console.log('--roleAccount <accountId> - The AWS account owning the role to assume. If not specified, your current account is used.');
    console.log('--region <region>         - The region to configure for subsequent calls');
    console.log('--profile <profile>       - The profile configured in \'~/.aws/config\' to use');
    console.log('--externalId <id>         - The external ID to use when assuming roles');
    console.log('--duration <seconds>      - The number of seconds the temporary credentials should be valid. Default is 3600.');
    console.log('--roleSessionName <name>  - The name of the session of the assumed role. Defaults to \'AWS-Auth-<xyz>\' with xyz being the current milliseconds since epoch.');
    console.log('--id                      - Print the final user information to the console for debugging purpose');
    console.log('--script                  - Run the given script with the AWS env instead of printing it to console');
    console.log('');
    console.log('Options for \'accounts\'');
    console.log('--parent                  - Limit the account list to the given orga parent (OU)');
    console.log('');
    console.log('Options for \'set-alias\'');
    console.log('--name                    - Name of the alias to configure');
    console.log('');
    console.log('Options for \'update-idp\'');
    console.log('--name                    - Name of the IdP to configure. Defaults to \'SAML\'');
    console.log('--metadata                - The file to use as SAML metadata');
    console.log('');
    console.log('Example usage:');
    console.log('');
    console.log('eval "$(aws-authenticate auth --role MyRole)"');
    console.log('');
}
async function setAlias() {
    if (!args.name) {
        throw 'Missing alias name. Use --name to specify it.';
    }
    const iamClient = new AWS.IAM(Object.assign({}, getConfigObject(), { region: 'us-east-1' }));
    console.log(`Checking for account alias ${args.name}`);
    const listResult = await iamClient.listAccountAliases().promise();
    if (listResult.AccountAliases && listResult.AccountAliases.includes(args.name)) {
        console.log(`Account alias already set ${args.name}`);
    }
    else {
        await iamClient.createAccountAlias({ AccountAlias: args.name }).promise();
        console.log(`Created account alias ${args.name}`);
    }
}
(async () => {
    try {
        switch (command) {
            case 'auth':
                await doAuth();
                break;
            case 'id':
                await showId();
                break;
            case 'accounts':
                await showAccounts();
                break;
            case 'update-idp':
                await updateIdp();
                break;
            case 'set-alias':
                await setAlias();
                break;
            case 'clear':
                doClear();
                break;
            default:
                showHelp();
                process.exit(1);
                break;
        }
    }
    catch (e) {
        console.log(e);
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map