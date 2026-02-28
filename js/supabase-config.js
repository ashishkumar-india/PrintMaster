const { createClient } = supabase;

const supabaseUrl = 'https://sagqqpkapolhopwamxid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZ3FxcGthcG9saG9wd2FteGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODAzMjEsImV4cCI6MjA4Nzg1NjMyMX0.i1nfuhOfXmBXuBi0PwTlQ5ybipA_rqq1Gm0LZv_6Ldc';

// Initialize the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Attach it to window for global access
window.supabaseClient = supabaseClient;
