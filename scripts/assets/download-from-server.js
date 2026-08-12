import { runDownloadCli } from './download-from-server.mjs';

runDownloadCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
