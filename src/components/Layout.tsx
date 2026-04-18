import type { Child } from "hono/jsx";
import generatedCss from "../styles/generated.css" with { type: "text" };

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
        <style dangerouslySetInnerHTML={{ __html: generatedCss }} />
      </head>
      <body class="bg-slate-50 min-h-screen font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
