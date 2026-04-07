-- Add register_number to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS register_number TEXT;

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    student_name TEXT NOT NULL,
    department TEXT NOT NULL,
    year_of_study TEXT NOT NULL,
    register_number TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own leave requests
CREATE POLICY "Students can view their own leave requests" ON public.leave_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Students can insert their own leave requests
CREATE POLICY "Students can insert their own leave requests" ON public.leave_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins and staff can view all leave requests
CREATE POLICY "Admins/Staff can view all leave requests" ON public.leave_requests
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'staff')
        )
    );

-- Admins and staff can update leave requests (Approve/Reject)
CREATE POLICY "Admins/Staff can update leave requests" ON public.leave_requests
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'staff')
        )
    );
