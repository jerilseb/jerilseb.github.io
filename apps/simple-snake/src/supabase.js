// Supabase client initialization and leaderboard operations

// Initialize Supabase client
const SUPABASE_URL = 'https://rmethuurxctjakzkjlaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRodXVyeGN0amFremtqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MTkwMjUsImV4cCI6MjA1NzA5NTAyNX0.qYkFNpxOSRVAq3kDy08nM14xo9va3tGik02x1tthtUM';

let supabase;

// Initialize the Supabase client
function initSupabase() {
    // Access the global supabaseJs object from the CDN
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase initialized');
}

// Save score to Supabase leaderboard
async function saveScoreToSupabase(name, score) {
    // Don't save scores of 0
    if (score === 0) return;
    
    try {
        const { data, error } = await supabase
            .from('snake_leaderboard')
            .insert([
                { player_name: name, score: score }
            ]);
            
        if (error) {
            console.error('Error saving score to Supabase:', error);
            throw error; // Throw error instead of falling back to local storage
        }
        
        return data;
    } catch (err) {
        console.error('Exception when saving score to Supabase:', err);
        throw err; // Throw error instead of falling back to local storage
    }
}

// Get leaderboard data from Supabase
async function getLeaderboardFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('snake_leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(20);
            
        if (error) {
            console.error('Error fetching leaderboard from Supabase:', error);
            throw error; // Throw error instead of falling back to local storage
        }
        
        return data || []; // Return empty array if no data
    } catch (err) {
        console.error('Exception when fetching leaderboard from Supabase:', err);
        throw err; // Throw error instead of falling back to local storage
    }
}

// Export functions
export {
    initSupabase,
    saveScoreToSupabase,
    getLeaderboardFromSupabase
};