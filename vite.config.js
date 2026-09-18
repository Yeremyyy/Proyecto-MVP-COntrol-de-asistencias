import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                principal: resolve(import.meta.dirname, 'index.html'),
                kiosco: resolve(import.meta.dirname, 'kiosco.html')
            }
        }
    }
});
