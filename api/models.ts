export default function handler(req: any, res: any) {
  res.json({
    models: [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        description: 'Flagship speed & intelligence with live search grounding and coding',
        badge: 'Recommended',
        speed: 'Fast',
        capabilities: ['artifacts', 'search', 'multimodal', 'streaming'],
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini Flash Lite',
        description: 'Ultra-low latency lightweight model for snappy responses',
        badge: 'Lightweight',
        speed: 'Ultra Fast',
        capabilities: ['artifacts', 'multimodal', 'streaming'],
      },
    ],
  });
}
