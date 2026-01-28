import { createClient } from '@supabase/supabase-js';

// Hardcoded for guaranteed connection
const validUrl = 'https://tloulqoxrtgepobsnoff.supabase.co';
const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb3VscW94cnRnZXBvYnNub2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDAwMTcsImV4cCI6MjA4NTExNjAxN30.tMR1U0S-4v46BerZdzOiUr9SeL3V0bvKOIRSDVsn1iQ';

export const supabase = createClient(validUrl, validKey);
