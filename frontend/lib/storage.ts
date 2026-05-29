import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BUCKET = 'claim-documents'

export interface UploadResult {
  file_url: string
  file_name: string
}

export async function uploadDocument(
  file: File,
  claimId: string,
  documentType: string,
  // Supabase Storage JS SDK v2 does not expose upload progress — show a spinner instead
  _onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const ext = file.name.split('.').pop()
  const path = `${claimId}/${documentType}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

  return {
    file_url: urlData.publicUrl,
    file_name: file.name,
  }
}
