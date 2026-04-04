import { NextResponse } from "next/server"
import { getProjectWarRoom } from "@/app/api/projects/[name]/route"
import { summarizeProject } from "@/lib/summaries"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params
  const projectName = decodeURIComponent(id)
  const warRoom = await getProjectWarRoom(projectName)

  if (!warRoom) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({
    summary: summarizeProject({
      project: warRoom.project,
      relatedTasks: warRoom.relatedTasks,
      relatedAlerts: warRoom.relatedAlerts,
      relatedConversations: warRoom.relatedConversations,
    }),
  })
}
