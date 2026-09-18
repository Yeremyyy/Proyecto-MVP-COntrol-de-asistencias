const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./config');

const configurado = SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('PEGA_AQUI') &&
    SUPABASE_ANON_KEY.length > 30 &&
    !SUPABASE_ANON_KEY.includes('PEGA_AQUI');

const supabase = configurado
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

async function rpc(nombre, parametros = {}) {
    if (!supabase) {
        throw new Error('Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en src/config.js');
    }
    const { data, error } = await supabase.rpc(nombre, parametros);
    if (error) throw new Error(error.message);
    return data;
}

module.exports = { supabase, rpc, configurado };
