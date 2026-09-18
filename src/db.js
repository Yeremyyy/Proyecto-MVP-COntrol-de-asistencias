import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
        throw new Error('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
    }
    const { data, error } = await supabase.rpc(nombre, parametros);
    if (error) throw new Error(error.message);
    return data;
}

export { supabase, rpc, configurado };
