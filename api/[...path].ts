export default async function handler(req: any, res: any) {
  try {
    const mod = await import('../server/dist/app.js');
    return mod.app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown initialization error';
    const stack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({
      success: false,
      code: 'API_INIT_FAILED',
      error: message,
      stack,
    });
  }
}
