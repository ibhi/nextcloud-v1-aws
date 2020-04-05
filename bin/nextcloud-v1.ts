#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { NextcloudV1Stack } from '../lib/nextcloud-v1-stack';

const app = new cdk.App();
new NextcloudV1Stack(app, 'NextcloudV1Stack');
