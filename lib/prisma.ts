import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
return new PrismaClient()
}

declare global {
var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

// This line makes the 'prisma' instance the default export of this file.
export default prisma

if (process.env.NODE_ENV !== 'production') {
globalThis.prisma = prisma
}

// Busted cache trigger for schema reload: 2026-04-12 08:38
// High Water Mark Cursors Injected