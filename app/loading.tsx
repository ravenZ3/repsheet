import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[70vh] w-full items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  )
}
