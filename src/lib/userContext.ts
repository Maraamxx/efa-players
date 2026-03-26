export interface CurrentUser {
  id:   string
  name: string
}

export function getUserFromRequest(req: Request): CurrentUser {
  const id   = req.headers.get('x-user-id')   ?? 'user-1'
  const name = req.headers.get('x-user-name') ?? 'System Admin'
  return { id, name }
}
