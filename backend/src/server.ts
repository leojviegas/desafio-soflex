import { buildApp } from './inject.js';

const { app, config, close } = buildApp();

const server = app.listen(config.port, () => {
  console.info(
    JSON.stringify({
      event: 'server_started',
      port: config.port,
      nodeEnv: config.nodeEnv,
      llmProvider: config.llm.provider,
      databasePath: config.databasePath,
    }),
  );
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.info(`[server] Señal ${signal} recibida, cerrando servidor...`);

  server.close(() => {
    close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
