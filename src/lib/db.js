import { supabase } from "../lib/supabase";

export const fetchDiagnosticConfig = async () => {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('*');
    
    if (error) throw error;

    const pillars = data.find(c => c.key === 'pillars')?.data;
    const steps = data.find(c => c.key === 'steps')?.data;

    return { pillars, steps };
  } catch (err) {
    console.error("Error fetching config:", err);
    return { pillars: null, steps: null };
  }
};

export const updateDiagnosticConfig = async (key, newValue) => {
  try {
    const { data: existing } = await supabase
      .from('config')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('config')
        .update({ data: newValue })
        .eq('key', key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('config')
        .insert([{ key, data: newValue }]);
      if (error) throw error;
    }
  } catch (err) {
    console.error(`Error updating ${key}:`, err);
    throw err;
  }
};

export const fetchSubmissions = async () => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching submissions:", err);
    return [];
  }
};

export const fetchLeads = async () => {
  try {
    const { data, error } = await supabase
      .from('gtm_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching leads:", err);
    return [];
  }
};

export const updateLeadStatus = async (id, status) => {
  const { error } = await supabase
    .from('gtm_leads')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

export const updateLeadNotes = async (id, admin_notes) => {
  const { error } = await supabase
    .from('gtm_leads')
    .update({ admin_notes })
    .eq('id', id);
  if (error) throw error;
};

export const updateLeadBooking = async (id, bookingData) => {
  const { error } = await supabase
    .from('gtm_leads')
    .update({ is_booked: true, booking_info: bookingData, booking_status: 'pending' })
    .eq('id', id);
  if (error) throw error;
};

export const updateLeadBookingStatus = async (id, booking_status) => {
  const { error } = await supabase
    .from('gtm_leads')
    .update({ booking_status })
    .eq('id', id);
  if (error) throw error;
};
