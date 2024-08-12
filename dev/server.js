import { createServer } from "node:http";
import { createApp, defineEventHandler, serveStatic, toNodeListener, setResponseHeader } from "h3";
import { stat, readFile } from "node:fs/promises";
import { join } from "pathe";

export const app = createApp();

const publicDir = './dev/app';

const medplumServer = 'http://localhost:8081/'

app.use(
  defineEventHandler((event) => {
    return serveStatic(event, {
        getContents: async (id) => {
            let stats = await stat(join(publicDir, id)).catch(() => {});
            if (!stats || !stats.isFile()) {
              id = 'index.html'
            }
            let file = await readFile(join(publicDir, id));
            if (id.endsWith(".js")) {
                file = file.toString().replaceAll('__MEDPLUM_BASE_URL__', medplumServer);
                setResponseHeader(event, 'Content-Type', 'application/javascript');
                return file;
            }
            if (id.endsWith(".css")) {
              setResponseHeader(event, 'Content-Type', 'text/css');
              return file;
            }
            if(!file.toString()){
              console.log('No File')
            }
            setResponseHeader(event, 'Content-Type', 'text/html');
            return file;
        },
      getMeta: async (id) => {
        let stats = await stat(join(publicDir, id)).catch(() => {});

        if (!stats || !stats.isFile()) {
          stats = await stat(join(publicDir, 'index.html')).catch(() => {});
        }

        return {
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      },
      indexNames: ["index.html"],

    });
  }),
);


createServer(toNodeListener(app)).listen(process.env.PORT || 8080);