-- Create storage bucket for prompt management files
INSERT INTO storage.buckets (id, name, public) VALUES ('prompt-files', 'prompt-files', false);

-- Create policies for file access
CREATE POLICY "Users can upload prompt files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'prompt-files');

CREATE POLICY "Users can view their prompt files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'prompt-files');

CREATE POLICY "Users can update their prompt files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'prompt-files');

CREATE POLICY "Users can delete their prompt files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'prompt-files');