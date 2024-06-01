import path from 'path';
import { createApp } from '../common/app';

const apiSpec = path.join('test', 'resources', 'openapi.yaml');
createApp({ apiSpec }, 3000);
