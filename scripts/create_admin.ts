
import { createClient } from '@supabase/supabase-js';

// Hardcoding for the script to avoid dotenv issues in specialized run
const url = 'https://tloulqoxrtgepobsnoff.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsb3VscW94cnRnZXBvYnNub2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDAwMTcsImV4cCI6MjA4NTExNjAxN30.tMR1U0S-4v46BerZdzOiUr9SeL3V0bvKOIRSDVsn1iQ';

const supabase = createClient(url, key);

async function createAdmin() {
    const email = 'mtkd_admin@example.com';
    const password = 'adminpassword123'; // Temporary password

    console.log(`Creating user: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully:', data.user?.email);
        console.log('ID:', data.user?.id);
    }
}

createAdmin();
