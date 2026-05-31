import fs from 'fs';
import path from 'path';

const aiDir = path.join(process.cwd(), 'api', 'ai');
const files = fs.readdirSync(aiDir).filter(f => f.endsWith('.ts') && f !== 'router.ts' && f !== 'proxy-fetch.ts' && f !== 'realtime-asr-proxy.ts');

for (const file of files) {
  const filePath = path.join(aiDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has default export
  if (content.includes('export default async function handler')) continue;

  // Extract the main handler name (e.g. handleAnalyzeCard)
  const match = content.match(/export async function (handle[A-Z][a-zA-Z0-9_]*)\(/);
  if (!match) continue;

  const handlerName = match[1];

  const authImport = `import { verifyAuth } from '../auth';\n\n`;
  
  const defaultExport = `\n
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const isAuthorized = await verifyAuth(req);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await ${handlerName}(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
`;

  content = authImport + content + defaultExport;
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
