import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import twilio from "https://esm.sh/twilio@4.10.0"

// Initialize Supabase Client (Service Role for admin bypass)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Twilio
const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID') ?? '',
  Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
)
const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER') ?? ''

serve(async (req) => {
  try {
    const { studentId } = await req.json()

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'studentId is required' }), { status: 400 })
    }

    // 1. Fetch Student, Parent, and Overdue Fees Data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        users!students_id_fkey(full_name),
        classes(class_name),
        parents!parents_student_id_fkey(users!parents_id_fkey(full_name), mobile_number),
        fee_payments(
          id, 
          amount_paid, 
          status, 
          fee_structures(amount, due_date)
        )
      `)
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      throw new Error(`Student not found: ${studentError?.message}`)
    }

    // 2. Calculate Total Overdue Amount
    let totalDue = 0
    let overdueCount = 0
    const unpaidPayments = student.fee_payments.filter(fp => fp.status === 'unpaid' || fp.status === 'overdue' || fp.status === 'partial')
    
    unpaidPayments.forEach(fp => {
      const totalAmount = fp.fee_structures?.amount || 0
      const paid = fp.amount_paid || 0
      totalDue += (totalAmount - paid)
      
      if (fp.fee_structures?.due_date && new Date(fp.fee_structures.due_date) < new Date()) {
        overdueCount++
      }
    })

    if (totalDue <= 0) {
      return new Response(JSON.stringify({ message: 'No pending dues.' }), { status: 200 })
    }

    // 3. Prepare SMS Message
    const studentName = student.users?.full_name || 'Student'
    const className = student.classes?.class_name || 'Class'
    // Safely extract parent array first element since it's a one-to-many relationship usually, but here schema implies 1 parent per student via student_id fk
    const parentNode = Array.isArray(student.parents) ? student.parents[0] : student.parents
    const parentName = parentNode?.users?.full_name || 'Parent'
    const rawMobile = parentNode?.mobile_number || ''

    if (!rawMobile) {
      throw new Error('Parent mobile number not found.')
    }

    // Formatting Mobile Number (Ensure country code, default to +91 as requested)
    let formattedMobile = rawMobile
    if (!formattedMobile.startsWith('+')) {
      formattedMobile = `+91${formattedMobile.replace(/^0+/, '')}` // Prepend +91 if no code
    }

    const message = `Dear ${parentName}, This is a reminder that fee of Rs.${totalDue} for ${studentName} (${className}) is overdue. Please pay immediately to avoid late charges. — Sri Guru Nanak Public School`

    // 4. Send SMS via Twilio
    const twilioResult = await twilioClient.messages.create({
      body: message,
      from: twilioFrom,
      to: formattedMobile
    })

    // 5. Log Reminder in DB
    const { error: logError } = await supabase.from('fee_reminders').insert({
      student_id: studentId,
      parent_mobile: formattedMobile,
      message_sent: message,
      delivery_status: twilioResult.status === 'queued' || twilioResult.status === 'sent' ? 'sent' : 'failed',
      reminder_type: 'manual'
    })

    if (logError) {
      console.error('Failed to log reminder:', logError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: twilioResult.sid, 
      status: twilioResult.status 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error sending reminder:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
