#!/usr/bin/env node
import { runCli } from '../src/index.js';

const exitCode = await runCli();
process.exitCode = exitCode;
