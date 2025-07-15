import { PrismaClient } from '@prisma/client'
import { notFound, redirect } from 'next/navigation'

const prisma = new PrismaClient()

export default async function EditPage({ params }: { params: { id: string } }) {
  const problem = await prisma.problem.findUnique({ where: { id: params.id } })

  if (!problem) return notFound()

  return (
    <form action={`/edit/${params.id}/update`} method="POST" className="max-w-xl mx-auto mt-10 space-y-3">
      <input type="hidden" name="id" value={params.id} />
      <input name="name" defaultValue={problem.name} className="w-full p-2 border rounded" />
      <input name="link" defaultValue={problem.link} className="w-full p-2 border rounded" />
      <input name="platform" defaultValue={problem.platform} className="w-full p-2 border rounded" />
      <input name="category" defaultValue={problem.category.join(', ')} className="w-full p-2 border rounded" />
      <select name="difficulty" defaultValue={problem.difficulty} className="w-full p-2 border rounded">
        <option>Easy</option>
        <option>Medium</option>
        <option>Hard</option>
      </select>
      <select name="status" defaultValue={problem.status} className="w-full p-2 border rounded">
        <option>To Revise</option>
        <option>Solved</option>
        <option>Stuck</option>
      </select>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Changes
      </button>
    </form>
  )
}
