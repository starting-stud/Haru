import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://nxinbugzcvpahjjejyzv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aW5idWd6Y3ZwYWhqamVqeXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDY4MDUsImV4cCI6MjA5NDcyMjgwNX0.-ro7X9dMxxJJNartwY_npgaFn_qG6qAC55oXXWXfF2w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)