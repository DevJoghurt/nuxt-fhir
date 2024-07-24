import { createServer } from "node:http";
import { createApp, defineEventHandler, serveStatic, toNodeListener, setResponseHeader } from "h3";
import { stat, readFile } from "node:fs/promises";
import { join } from "pathe";

export const app = createApp();

const publicDir = './node_modules/@medplum/app/dist';

const medplumServer = 'http://localhost:3000/'

app.use(
  defineEventHandler((event) => {
    return serveStatic(event, {
        getContents: async (id) => {
            let file = await readFile(join(publicDir, id));
            if (id.endsWith(".js")) {
                // overwrite __MEDPLUM_BASE_URL__ with server url, __MEDPLUM_CLIENT_ID__ with empty string and __MEDPLUM_REGISTER_ENABLED__ with true
                file = file.toString().replaceAll('__MEDPLUM_BASE_URL__', medplumServer);
                file = file.replaceAll('__MEDPLUM_CLIENT_ID__', '');
                file = file.replaceAll('__MEDPLUM_REGISTER_ENABLED__', 'true');
                setResponseHeader(event, 'Content-Type', 'application/javascript');
            }
            return file;
        },
      getMeta: async (id) => {
        console.log(id);
        const stats = await stat(join(publicDir, id)).catch(() => {});

        if (!stats || !stats.isFile()) {
          return;
        }

        return {
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      },
      indexNames: ["/index.html"]
    });
  }),
);


createServer(toNodeListener(app)).listen(process.env.PORT || 8080);