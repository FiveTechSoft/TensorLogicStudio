import type { Project } from '@/types/project'

export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project.name || 'project'}.tls.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function openProjectFile(file: File): Promise<Project> {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data || typeof data.source !== 'string' || !data.graph) {
    throw new Error('Invalid TensorLogicStudio project')
  }
  return data as Project
}

export function saveSession(project: Project) {
  localStorage.setItem('tls:lastProject', JSON.stringify(project))
}

export function loadSession(): Project | null {
  try {
    const t = localStorage.getItem('tls:lastProject')
    if (!t) return null
    return JSON.parse(t) as Project
  } catch {
    return null
  }
}
