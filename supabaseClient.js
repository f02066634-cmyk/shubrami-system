import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://detinolphmmhzyuqbqiv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRldGlub2xwaG1taHp5dXFicWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTE1MjksImV4cCI6MjA5NTg4NzUyOX0.XzHGPSI6lNEz1_NCeddQRxL03-zKumd9K1nvD_nY5nI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
