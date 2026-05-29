export const metadata = {
  title: 'نظام أسواق الشبرمي',
  description: 'النظام السحابي الاحترافي لإدارة أسواق الشبرمي',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
