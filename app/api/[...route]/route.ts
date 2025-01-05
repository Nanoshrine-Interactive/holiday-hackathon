import { siweServer } from '@/utils/siweServer'
import { NextResponse } from 'next/server'
import { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'

// Helper to convert Web API `Request` to `NextApiRequest`
async function toNextApiRequest(req: Request): Promise<NextApiRequest> {
  const body = req.body ? await req.json() : undefined

  return {
    ...req,
    method: req.method!,
    headers: Object.fromEntries(req.headers.entries()),
    body,
    query: {},
    cookies: Object.fromEntries(req.headers.entries())
  } as unknown as NextApiRequest
}

// Helper to convert `NextApiResponse` to `NextResponse`
function toNextResponse(nextApiResponse: NextApiResponse) {
  const { statusCode, statusMessage, headers, body } = nextApiResponse as any

  return new NextResponse(body, {
    status: statusCode,
    headers: headers as HeadersInit
  })
}

// Handle GET requests
export async function GET(req: Request) {
  const nextReq = await toNextApiRequest(req)
  const nextRes = {} as NextApiResponse

  try {
    await siweServer.apiRouteHandler(nextReq, nextRes)
    return toNextResponse(nextRes)
  } catch (error) {
    console.error('Error in SIWE GET handler:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Handle POST requests
export async function POST(req: Request) {
  const nextReq = await toNextApiRequest(req)
  const nextRes = {} as NextApiResponse

  try {
    await siweServer.apiRouteHandler(nextReq, nextRes)
    return toNextResponse(nextRes)
  } catch (error) {
    console.error('Error in SIWE POST handler:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
