import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = {
    output: path.join(__dirname, 'colab-bundle'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--output' && next) {
      args.output = path.resolve(repoRoot, next);
      index += 1;
    }
  }

  return args;
}

async function copyFile(fromPath, toPath) {
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.copyFile(fromPath, toPath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundleRoot = args.output;

  const files = [
    [path.join(__dirname, 'requirements.txt'), 'requirements.txt'],
    [path.join(__dirname, 'train_lora.py'), 'train_lora.py'],
    [path.join(__dirname, 'evaluate_model.py'), 'evaluate_model.py'],
    [path.join(__dirname, 'configs', 'lora.qwen-0.5b.colab.json'), 'lora.qwen-0.5b.colab.json'],
    [path.join(__dirname, 'data', 'combined', 'route_intro_train.combined.jsonl'), 'route_intro_train.combined.jsonl'],
    [path.join(__dirname, 'data', 'combined', 'route_intro_eval.combined.jsonl'), 'route_intro_eval.combined.jsonl'],
    [path.join(__dirname, 'colab', 'README.md'), 'README.md'],
    [path.join(__dirname, 'colab', 'RouteIntro_Qwen_Colab.ipynb'), 'RouteIntro_Qwen_Colab.ipynb'],
  ];

  await fs.rm(bundleRoot, { recursive: true, force: true });
  await fs.mkdir(bundleRoot, { recursive: true });

  for (const [source, target] of files) {
    await copyFile(source, path.join(bundleRoot, target));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    bundleRoot,
    files: files.map(([, target]) => target),
  };

  await fs.writeFile(
    path.join(bundleRoot, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  console.log(`Wrote Colab bundle to ${bundleRoot}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
