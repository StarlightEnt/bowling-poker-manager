import './globals.css';
import NavBar from './components/NavBar';

export const metadata = {
  title: 'Bowling Poker Manager',
  description: 'LGBT Wednesday Community League — Poker Side Game Manager',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'light') document.documentElement.classList.add('light-mode');
          } catch(e) {}
        ` }} />
      </head>
      <body>
        <NavBar />
        <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
