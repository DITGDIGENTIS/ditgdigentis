import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL is not defined. Please add it to your .env.local file:\n' +
        'NEXT_PUBLIC_SUPABASE_URL=your-project-url\n' +
        'You can find this URL in your Supabase project settings.'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. Please add it to your .env.local file:\n' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n' +
        'You can find this key in your Supabase project settings under API.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 