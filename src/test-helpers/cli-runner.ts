import { PassThrough } from 'stream';

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
}

export async function runCommand(
  args: string[],
  options: {
    dbPath: string;
    env?: Record<string, string>;
  }
): Promise<CommandOutput> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const outputs = { stdout: '', stderr: '' };

  // 出力をキャプチャ
  stdout.on('data', (chunk) => {
    outputs.stdout += chunk;
  });
  stderr.on('data', (chunk) => {
    outputs.stderr += chunk;
  });

  // 環境変数を設定
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    ...options.env,
    TERMFEED_DB: options.dbPath,
  };

  // process.exitをモック
  let exitCode: number | undefined;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalExit = process.exit;
  process.exit = ((code?: number) => {
    exitCode = code;
    throw new Error('process.exit called');
  }) as never;

  // console出力をリダイレクト
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => stdout.write(args.join(' ') + '\n');
  console.error = (...args) => stderr.write(args.join(' ') + '\n');

  try {
    // メインプログラムを実行
    const { createMainProgram } = await import('../index.js');
    const program = createMainProgram();
    await program.parseAsync(['node', 'termfeed', ...args]);
  } catch (error) {
    // process.exitによる例外は無視
    if (error instanceof Error && error.message !== 'process.exit called') {
      throw error;
    }
  } finally {
    // 環境を復元
    process.env = originalEnv;
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  }

  return {
    stdout: outputs.stdout,
    stderr: outputs.stderr,
    exitCode,
  };
}
