import type { Child } from "hono/jsx";

export function Layout({ title, children }: { title: string; children: Child }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'] },
              }
            }
          }
        `}</script>
        <style>{`
          dialog { margin: auto; }
          ::selection { background: #c7d2fe; }
        `}</style>
      </head>
      <body class="bg-slate-50 min-h-screen font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
