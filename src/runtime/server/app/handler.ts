import { useRuntimeConfig, defineEventHandler, setResponseHeader, createError } from "#imports";
import { resolvePath } from "mlly";
import { dirname, extname } from "pathe";
import { parseFilename } from 'ufo';
import { readFile } from "node:fs/promises";

export default defineEventHandler(async (event) => {
    const appPath = dirname(
        await resolvePath("@medplum/app/package.json", {
          url: import.meta.url,
        })
    );
    const folder = event.path.includes('assets') ? 'assets' : event.path.includes('img') ? 'img' : null
    if(folder){
        const filename = parseFilename(event.path, {
            strict: true
        })
        if(filename){
            const ext = extname(event.path)
            if(ext === '.js'){
                setResponseHeader(event, 'Content-Type', 'application/javascript')
            }
            if(ext === '.css'){
                setResponseHeader(event, 'Content-Type', 'text/css')
            }
            if(ext === '.ico'){
                setResponseHeader(event, 'Content-Type', 'image/x-icon')
            }
            if(ext === '.png'){
                setResponseHeader(event, 'Content-Type', 'image/png')
            }
            if(ext === '.svg'){
                setResponseHeader(event, 'Content-Type', 'image/svg+xml')
            }
            let asset = await readFile(`${appPath}/dist/${folder}/${filename}`)
            const res = asset.toString().replaceAll('__MEDPLUM_BASE_URL__', 'http://localhost:3000').replaceAll('"__MEDPLUM_CLIENT_ID__"', 'undefined')
            return res
        }
    }

    try{
        let index = await readFile(`${appPath}/dist/index.html`)
        setResponseHeader(event, 'Content-Type', 'text/html')
        return index.toString().replaceAll('/img','/app/img').replaceAll('/assets','/app/assets')
    }catch(e) {
        throw createError({
            statusCode: 500
        })
    }

})