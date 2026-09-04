import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getMarketplaceRepository } from '@/data/repository.server'
import { renderShirtPng } from '@/lib/shirt-image.server'

const shirtIdSchema = z.union([z.string().uuid(), z.string().trim().regex(/^[a-z0-9-]{1,100}$/)])

export const Route = createFileRoute('/shirts/$shirtId_/image.png')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsedId = shirtIdSchema.safeParse(params.shirtId)
        if (!parsedId.success) return new Response('Not found.', { status: 404 })

        let shirt
        try {
          shirt = await getMarketplaceRepository().getListingDetail(parsedId.data)
        } catch {
          return new Response('Could not render this pattern.', { status: 500 })
        }
        if (!shirt) return new Response('Not found.', { status: 404 })

        try {
          const png = renderShirtPng({ name: shirt.name, layers: shirt.layers })
          return new Response(new Uint8Array(png), {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch {
          return new Response('Could not render this pattern.', { status: 500 })
        }
      },
    },
  },
})
