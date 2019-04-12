#!/usr/bin/env node

/*
 * Copyright (c) 2019. Taimos GmbH http://www.taimos.de
 */

import * as AWS from 'aws-sdk';
import { AssumeRoleRequest } from 'aws-sdk/clients/sts';
import { APIVersions, ConfigurationOptions } from 'aws-sdk/lib/config';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';
import { Agent } from 'http';
import * as minimist from 'minimist';
import * as agent from 'proxy-agent';

const args = minimist(process.argv.slice(2), {
    default: {
        id: false,
    },
});

const command = args._[0];
const awsEnv : any = {};

const role = args.role;
const roleAccount = args.roleAccount;
const region = args.region;
const profile = args.profile;
const externalId = args.externalId;
const duration = args.duration;
const roleSessionName = args.roleSessionName;

function getConfigObject() : ConfigurationOptions & ConfigurationServicePlaceholders & APIVersions {
    return {
        retryDelayOptions: { base: 700 },
        ...(region && region !== '') && { region },
        ...(process.env.HTTPS_PROXY || process.env.https_proxy) && {
            httpOptions: {
                agent: agent(process.env.HTTPS_PROXY || process.env.https_proxy) as Agent,
            },
        },
        ...profile && { credentials: new AWS.SharedIniFileCredentials({ profile }) },
        ...awsEnv.AWS_ACCESS_KEY_ID && {
            accessKeyId: awsEnv.AWS_ACCESS_KEY_ID,
            secretAccessKey: awsEnv.AWS_SECRET_ACCESS_KEY,
            sessionToken: awsEnv.AWS_SESSION_TOKEN,
            credentials: undefined,
        },
    };
}

function withProfile() : void {
    if (profile && profile !== '') {
        console.log(`# Setting AWS profile ${profile}`);
        awsEnv.AWS_DEFAULT_PROFILE = profile;
        awsEnv.AWS_PROFILE = profile;
    }
}

function withRegion() : void {
    if (region && region !== '') {
        console.log(`# Setting AWS region ${region}`);
        awsEnv.AWS_DEFAULT_REGION = region;
        awsEnv.AWS_REGION = region;
    }
}

async function getRoleArn() : Promise<string> {
    if (role.startsWith('arn:')) {
        return role;
    }
    const sts = new AWS.STS(getConfigObject());
    const partition = 'aws'; // TODO get for region
    const accountId = (roleAccount && roleAccount !== '') ? roleAccount : (await sts.getCallerIdentity().promise()).Account;
    return `arn:${partition}:iam::${accountId}:role/${role}`;
}

async function withRole() : Promise<void> {
    if (role && role !== '') {
        const sts = new AWS.STS(getConfigObject());

        const request : AssumeRoleRequest = {
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
        } catch (error) {
            console.error(error);
        }
    }
}

async function showId() : Promise<void> {
    const sts = new AWS.STS(getConfigObject());
    const id = await sts.getCallerIdentity().promise();
    console.log(`# Account: ${id.Account} - User: ${id.Arn}`);
}

async function doAuth() : Promise<void> {
    console.log(`# Configuring AWS auth`);
    withProfile();
    withRegion();
    await withRole();
    if (args.id) {
        await showId();
    }
    for (const key in awsEnv) {
        if (awsEnv.hasOwnProperty(key)) {
            console.log(`export ${key}=${awsEnv[key]}`);
        }
    }
}

switch (command) {
    case 'auth':
        doAuth().then(() => undefined);
        break;
    case 'id':
        showId().then(() => undefined);
        break;
    case 'clear':
        console.log('# Exports to clear AWS config');
        console.log('export AWS_ACCESS_KEY_ID=');
        console.log('export AWS_SECRET_ACCESS_KEY=');
        console.log('export AWS_SESSION_TOKEN=');
        console.log('export AWS_DEFAULT_REGION=');
        console.log('export AWS_REGION=');
        console.log('export AWS_DEFAULT_PROFILE=');
        console.log('export AWS_PROFILE=');
        break;
    default:
        console.error('Missing command');
        break;
}
