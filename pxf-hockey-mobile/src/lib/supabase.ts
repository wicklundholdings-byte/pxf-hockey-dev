import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkchgkprbgdwbeogdzek.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY2hna3ByYmdkd2Jlb2dkemVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTMzMTQsImV4cCI6MjA5NzM4OTMxNH0.tBFGpK9sDZo2XBtTA3gAc8ecvNZ6_aXM4WNhgKrr9PA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
