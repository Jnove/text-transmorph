/** Strip filesystem-illegal characters and control chars, trim, and fall
 *  back to 'transmorph' when nothing usable remains. Returns no extension. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[/\\:*?"<>|\x00-\x1f]/g, '').trim()
  return cleaned || 'transmorph'
}
